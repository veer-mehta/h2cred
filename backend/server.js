import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ethers } from 'ethers';
import crypto from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import prismaModule from './generated/prisma/index.js';

dotenv.config();

const { PrismaClient } = prismaModule;
const PORT = Number(process.env.PORT || 5000);
const STRIPE_API_BASE = 'https://api.stripe.com/v1';
const REQUIRED_STRIPE_FIELDS = ['STRIPE_SECRET_KEY'];
const REQUIRED_STRIPE_WEBHOOK_FIELDS = ['STRIPE_WEBHOOK_SECRET'];
const REQUIRED_CHAIN_FIELDS = ['ALCHEMY_URL', 'PRIVATE_KEY', 'CONTRACT_ADDRESS'];

const app = express();
app.use(cors());

function buildLocalDatabaseUrl() {
  const user = process.env.PGUSER || 'postgres';
  const password = process.env.PGPASSWORD || 'postgres';
  const host = process.env.PGHOST || '127.0.0.1';
  const port = process.env.PGPORT || '5432';
  const database = process.env.PGDATABASE || 'h2cred';

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

const connectionString = process.env.DATABASE_URL || buildLocalDatabaseUrl();
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const missingStripeEnv = REQUIRED_STRIPE_FIELDS.filter((key) => !process.env[key]);
const missingStripeWebhookEnv = REQUIRED_STRIPE_WEBHOOK_FIELDS.filter((key) => !process.env[key]);
const missingChainEnv = REQUIRED_CHAIN_FIELDS.filter((key) => !process.env[key]);

const GHC_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function burnFrom(address account, uint256 amount)',
  'function decimals() view returns (uint8)',
];

const provider =
  missingChainEnv.length === 0 ? new ethers.JsonRpcProvider(process.env.ALCHEMY_URL) : null;
const adminWallet =
  provider && process.env.PRIVATE_KEY ? new ethers.Wallet(process.env.PRIVATE_KEY, provider) : null;
const ghcContract =
  adminWallet && process.env.CONTRACT_ADDRESS
    ? new ethers.Contract(process.env.CONTRACT_ADDRESS, GHC_ABI, adminWallet)
    : null;

function isPositiveNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function requireConfiguredEnv(res, missingVars, label) {
  if (missingVars.length === 0) {
    return true;
  }

  res.status(503).json({
    error: `${label} is not configured on the server.`,
    missing: missingVars,
  });
  return false;
}

function parseListingPayload(body, sellerStripeAccountId) {
  const seller = body?.seller?.trim();
  const txHash = body?.txHash?.trim();
  const amount = Number(body?.amount);
  const pricePerGHC = Number(body?.pricePerGHC);

  if (!isNonEmptyString(seller) || !ethers.isAddress(seller)) {
    return { error: 'A valid seller wallet address is required.' };
  }

  if (!isPositiveNumber(amount)) {
    return { error: 'Amount must be a positive number.' };
  }

  if (!isPositiveNumber(pricePerGHC)) {
    return { error: 'Price per GHC must be a positive number.' };
  }

  if (!isNonEmptyString(txHash) || !ethers.isHexString(txHash, 32)) {
    return { error: 'A valid transaction hash is required.' };
  }

  return {
    data: {
      seller,
      sellerStripeAccountId: sellerStripeAccountId || null,
      amount,
      pricePerGHC,
      txHash,
    },
  };
}

function parseCompanyPayload(body) {
  const name = body?.name?.trim();
  const address = body?.address?.trim();
  const stripeAccountId = body?.stripeAccountId?.trim() || null;

  if (!isNonEmptyString(name)) {
    return { error: 'Company name is required.' };
  }

  if (!isNonEmptyString(address) || !ethers.isAddress(address)) {
    return { error: 'A valid wallet address is required.' };
  }

  if (stripeAccountId && !/^acct_[A-Za-z0-9]+$/.test(stripeAccountId)) {
    return { error: 'Stripe account id must look like acct_...' };
  }

  return { data: { name, address, stripeAccountId } };
}

async function stripeRequest(path, options = {}) {
  const { method = 'GET', body } = options;
  const response = await fetch(`${STRIPE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
    },
    body,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Stripe request failed.');
  }

  return payload;
}

function buildStripeFormBody(fields) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) {
      params.append(key, String(value));
    }
  }
  return params.toString();
}

function parseStripeSignatureHeader(signatureHeader) {
  if (!isNonEmptyString(signatureHeader)) {
    return null;
  }

  const values = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.trim().split('=')),
  );

  if (!values.t || !values.v1) {
    return null;
  }

  return { timestamp: values.t, signature: values.v1 };
}

function verifyStripeWebhookSignature(rawBody, signatureHeader, secret) {
  const parsedHeader = parseStripeSignatureHeader(signatureHeader);
  if (!parsedHeader) {
    return false;
  }

  const signedPayload = `${parsedHeader.timestamp}.${rawBody.toString('utf8')}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const received = Buffer.from(parsedHeader.signature, 'hex');
  const expected = Buffer.from(expectedSignature, 'hex');

  if (received.length !== expected.length) {
    return false;
  }

  return crypto.timingSafeEqual(received, expected);
}

function getFrontendOrigin(req) {
  if (isNonEmptyString(req.body?.origin)) {
    return req.body.origin;
  }

  if (isNonEmptyString(req.headers.origin)) {
    return req.headers.origin;
  }

  return 'http://localhost:5173';
}

async function recordSellerSettlement({ listingId }) {
  return {
    id: `demo_settlement_${listingId}`,
    status: 'PENDING_OFF_PLATFORM_SETTLEMENT',
  };
}

async function retirePurchasedCredits({ listing, buyerAddress }) {
  if (missingChainEnv.length > 0 || !ghcContract) {
    throw new Error('Blockchain transfer is not configured on the server.');
  }

  const decimals = await ghcContract.decimals();
  const amountToTransfer = ethers.parseUnits(listing.amount.toString(), Number(decimals));

  const transferTx = await ghcContract.transfer(buyerAddress, amountToTransfer);
  await transferTx.wait();

  const burnTx = await ghcContract.burnFrom(buyerAddress, amountToTransfer);
  await burnTx.wait();

  return {
    transferTxHash: transferTx.hash,
    retirementTxHash: burnTx.hash,
  };
}

async function fulfillListingPurchase({ listingId, buyerAddress, checkoutSessionId, paymentIntentId }) {
  let listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing) {
    throw new Error('Listing not found.');
  }

  if (listing.status === 'RETIRED') {
    return { alreadyProcessed: true, listing };
  }

  if (!listing.active && !listing.payoutTransferId && listing.sellerPayoutStatus === 'PENDING_OFF_PLATFORM_SETTLEMENT') {
    return { alreadyProcessed: true, listing };
  }

  if (!listing.payoutTransferId) {
    const settlement = await recordSellerSettlement({ listingId: listing.id });

    listing = await prisma.listing.update({
      where: { id: listing.id },
      data: {
        status: 'PAID_OUT',
        buyerAddress,
        checkoutSessionId,
        paymentIntentId,
        payoutTransferId: settlement.id,
        sellerPayoutStatus: settlement.status,
      },
    });
  }

  if (listing.retirementTxHash) {
    return {
      alreadyProcessed: true,
      listing,
      payoutTransferId: listing.payoutTransferId,
      retirementTxHash: listing.retirementTxHash,
    };
  }

  const retirement = await retirePurchasedCredits({ listing, buyerAddress });

  const updatedListing = await prisma.listing.update({
    where: { id: listing.id },
    data: {
      active: false,
      status: 'RETIRED',
      buyerAddress,
      checkoutSessionId,
      paymentIntentId,
      retirementTxHash: retirement.retirementTxHash,
      sellerPayoutStatus: 'PENDING_OFF_PLATFORM_SETTLEMENT',
    },
  });

  return {
    alreadyProcessed: false,
    listing: updatedListing,
    payoutTransferId: updatedListing.payoutTransferId,
    transferTxHash: retirement.transferTxHash,
    retirementTxHash: retirement.retirementTxHash,
  };
}

app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  if (!requireConfiguredEnv(res, missingStripeWebhookEnv, 'Stripe webhook')) {
    return;
  }
  if (!requireConfiguredEnv(res, missingStripeEnv, 'Stripe payments')) {
    return;
  }
  if (!requireConfiguredEnv(res, missingChainEnv, 'Blockchain transfer')) {
    return;
  }

  const signatureHeader = req.headers['stripe-signature'];
  const rawBody = req.body;

  if (!Buffer.isBuffer(rawBody) || !signatureHeader) {
    return res.status(400).json({ error: 'Missing raw webhook payload or Stripe signature header.' });
  }

  const isValid = verifyStripeWebhookSignature(
    rawBody,
    String(signatureHeader),
    process.env.STRIPE_WEBHOOK_SECRET,
  );

  if (!isValid) {
    return res.status(400).json({ error: 'Invalid Stripe webhook signature.' });
  }

  try {
    const event = JSON.parse(rawBody.toString('utf8'));

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const listingId = session?.metadata?.listingId;
        const buyerAddress = session?.metadata?.buyerAddress;

        if (!isNonEmptyString(listingId) || !isNonEmptyString(buyerAddress)) {
          return res.status(400).json({ error: 'Stripe session metadata is incomplete.' });
        }

        if (session.payment_status === 'paid') {
          await fulfillListingPurchase({
            listingId,
            buyerAddress,
            checkoutSessionId: session.id,
            paymentIntentId: session.payment_intent || null,
          });
        }
        break;
      }
      default:
        console.log(`Unhandled Stripe webhook event: ${event.type}`);
        break;
    }

    return res.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook processing failed:', error);
    return res.status(400).json({ error: error.message || 'Invalid Stripe webhook payload.' });
  }
});

app.use(express.json());

app.get('/api/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      database: 'connected',
      databaseUrlSource: process.env.DATABASE_URL ? 'DATABASE_URL' : 'local-postgres-defaults',
      paymentsConfigured: missingStripeEnv.length === 0,
      blockchainConfigured: Boolean(ghcContract),
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      database: 'disconnected',
      databaseUrlSource: process.env.DATABASE_URL ? 'DATABASE_URL' : 'local-postgres-defaults',
      error: error.message,
    });
  }
});

app.get('/api/listings', async (req, res) => {
  try {
    const activeListings = await prisma.listing.findMany({
      where: { active: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json(activeListings);
  } catch (error) {
    console.error('Failed to load listings:', error);
    res.status(500).json({ error: 'Failed to load listings.' });
  }
});

app.post('/api/listings', async (req, res) => {
  try {
    const seller = req.body?.seller?.trim();
    if (!isNonEmptyString(seller) || !ethers.isAddress(seller)) {
      return res.status(400).json({ error: 'A valid seller wallet address is required.' });
    }

    const company = await prisma.company.findUnique({
      where: { address: seller },
    });

    const parsed = parseListingPayload(req.body, company?.stripeAccountId);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const existingListing = await prisma.listing.findUnique({
      where: { txHash: parsed.data.txHash },
    });

    if (existingListing) {
      return res.status(409).json({ error: 'That transaction is already registered as a listing.' });
    }

    const listing = await prisma.listing.create({
      data: {
        ...parsed.data,
        active: true,
        status: 'LISTED',
      },
    });

    return res.status(201).json(listing);
  } catch (error) {
    console.error('Failed to create listing:', error);
    return res.status(500).json({ error: 'Failed to create listing.' });
  }
});

app.post('/api/checkout-session', async (req, res) => {
  if (!requireConfiguredEnv(res, missingStripeEnv, 'Stripe payments')) {
    return;
  }

  const listingId = req.body?.listingId;
  const buyerAddress = req.body?.buyerAddress?.trim();

  if (!isNonEmptyString(listingId)) {
    return res.status(400).json({ error: 'Listing id is required.' });
  }

  if (!isNonEmptyString(buyerAddress) || !ethers.isAddress(buyerAddress)) {
    return res.status(400).json({ error: 'A valid buyer wallet address is required.' });
  }

  try {
    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        active: true,
        status: 'LISTED',
      },
    });

    if (!listing) {
      return res.status(404).json({ error: 'Listing not found or already inactive.' });
    }

    const origin = getFrontendOrigin(req);
    const totalAmountInPaise = Math.round(listing.amount * listing.pricePerGHC * 100);
    if (totalAmountInPaise <= 0) {
      return res.status(400).json({ error: 'Listing amount is invalid.' });
    }

    const session = await stripeRequest('/checkout/sessions', {
      method: 'POST',
      body: buildStripeFormBody({
        mode: 'payment',
        success_url: `${origin}/?tab=marketplace&payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/?tab=marketplace&payment=cancelled`,
        'line_items[0][quantity]': 1,
        'line_items[0][price_data][currency]': 'inr',
        'line_items[0][price_data][unit_amount]': totalAmountInPaise,
        'line_items[0][price_data][product_data][name]': `${listing.amount} GHC Credits`,
        'line_items[0][price_data][product_data][description]': `Purchase and retire ${listing.amount} Green Hydrogen Credits from ${listing.seller}`,
        'metadata[listingId]': listing.id,
        'metadata[buyerAddress]': buyerAddress,
        'metadata[sellerAddress]': listing.seller,
        'metadata[amount]': listing.amount,
        ...(listing.sellerStripeAccountId
          ? { 'metadata[sellerStripeAccountId]': listing.sellerStripeAccountId }
          : {}),
        'payment_intent_data[metadata][listingId]': listing.id,
        'payment_intent_data[metadata][buyerAddress]': buyerAddress,
        'payment_intent_data[metadata][sellerAddress]': listing.seller,
        ...(listing.sellerStripeAccountId
          ? { 'payment_intent_data[metadata][sellerStripeAccountId]': listing.sellerStripeAccountId }
          : {}),
      }),
    });

    await prisma.listing.update({
      where: { id: listing.id },
      data: {
        checkoutSessionId: session.id,
        buyerAddress,
        status: 'CHECKOUT_PENDING',
      },
    });

    return res.json({
      id: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error('Failed to create Stripe Checkout session:', error);
    return res.status(500).json({ error: error.message || 'Failed to create Stripe Checkout session.' });
  }
});

app.get('/api/checkout-session/:sessionId', async (req, res) => {
  if (!requireConfiguredEnv(res, missingStripeEnv, 'Stripe payments')) {
    return;
  }

  try {
    const session = await stripeRequest(`/checkout/sessions/${req.params.sessionId}`);
    const listingId = session?.metadata?.listingId;
    const listing = listingId
      ? await prisma.listing.findUnique({
          where: { id: listingId },
        })
      : null;

    res.json({
      sessionId: session.id,
      status: session.status,
      paymentStatus: session.payment_status,
      listingId,
      fulfilled: Boolean(listing && listing.status === 'RETIRED'),
      retirementTxHash: listing?.retirementTxHash ?? null,
      payoutTransferId: listing?.payoutTransferId ?? null,
      sellerPayoutStatus: listing?.sellerPayoutStatus ?? null,
    });
  } catch (error) {
    console.error('Failed to fetch Stripe Checkout session:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch Stripe Checkout session.' });
  }
});

app.get('/api/registry', async (req, res) => {
  try {
    const companies = await prisma.company.findMany({
      orderBy: { name: 'asc' },
    });

    res.json(companies);
  } catch (error) {
    console.error('Failed to load registry:', error);
    res.status(500).json({ error: 'Failed to load registry.' });
  }
});

app.post('/api/registry', async (req, res) => {
  const parsed = parseCompanyPayload(req.body);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const existingByAddress = await prisma.company.findUnique({
      where: { address: parsed.data.address },
    });

    if (existingByAddress && existingByAddress.name !== parsed.data.name) {
      return res.status(409).json({
        error: 'That wallet address is already registered to another company.',
      });
    }

    if (parsed.data.stripeAccountId) {
      const existingByStripeAccount = await prisma.company.findUnique({
        where: { stripeAccountId: parsed.data.stripeAccountId },
      });

      if (existingByStripeAccount && existingByStripeAccount.name !== parsed.data.name) {
        return res.status(409).json({
          error: 'That Stripe account is already linked to another company.',
        });
      }
    }

    const entry = await prisma.company.upsert({
      where: { name: parsed.data.name },
      update: {
        address: parsed.data.address,
        stripeAccountId: parsed.data.stripeAccountId,
      },
      create: parsed.data,
    });

    return res.json(entry);
  } catch (error) {
    console.error('Failed to save company to registry:', error);
    return res.status(500).json({ error: 'Failed to save company to registry.' });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.listen(PORT, () => {
  console.log(`H2Cred Backend running on http://localhost:${PORT}`);
});

async function shutdown(signal) {
  console.log(`Received ${signal}, shutting down backend...`);
  await prisma.$disconnect().catch(() => {});
  await pool.end().catch(() => {});
  process.exit(0);
}

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
