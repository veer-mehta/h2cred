import "dotenv/config";
import express from "express";
import cors from "cors";
import pg from "pg";
import { ethers } from "ethers";
import crypto from "crypto";

const PORT = 5000;
const GHC_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function burnFrom(address account, uint256 amount)",
  "function decimals() view returns (uint8)",
];

const dburi = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString: dburi });

async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "Listing" (
        id VARCHAR(255) PRIMARY KEY,
        seller VARCHAR(255) NOT NULL,
        amount DOUBLE PRECISION NOT NULL,
        "pricePerGHC" DOUBLE PRECISION NOT NULL,
        "txHash" VARCHAR(255) UNIQUE NOT NULL,
        active BOOLEAN DEFAULT TRUE,
        status VARCHAR(255) DEFAULT 'LISTED',
        "buyerAddress" VARCHAR(255),
        "checkoutSessionId" VARCHAR(255) UNIQUE,
        "paymentIntentId" VARCHAR(255) UNIQUE,
        "payoutTransferId" VARCHAR(255) UNIQUE,
        "sellerPayoutStatus" VARCHAR(255) DEFAULT 'UNPAID',
        "retirementTxHash" VARCHAR(255),
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS "Company" (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        address VARCHAR(255) UNIQUE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("Database verified successfully.");
  } catch (err) {
    console.error("Database verification failed:", err);
  }
}

let provider = null;
let adminWallet = null;
let ghcContract = null;
let blockchainConfigured = false;

if (
  process.env.ALCHEMY_URL &&
  process.env.PRIVATE_KEY &&
  process.env.CONTRACT_ADDRESS
) {
  try {
    provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
    adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    ghcContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, GHC_ABI, adminWallet);
    blockchainConfigured = true;
    console.log("Blockchain loaded successfully. GHC Contract:", process.env.CONTRACT_ADDRESS);
  } catch (err) {
    console.error("Failed to init blockchain connection:", err);
  }
} else {
  console.warn("Blockchain missing env vars (ALCHEMY_URL, PRIVATE_KEY, CONTRACT_ADDRESS).");
  exit(1);
}

function isValidAddress(addr) {
  return typeof addr === "string" && ethers.isAddress(addr);
}

function isValidTxHash(hash) {
  return typeof hash === "string" && ethers.isHexString(hash, 32);
}

function isPositiveNumber(val) {
  const num = Number(val);
  return Number.isFinite(num) && num > 0;
}



const app = express();
app.use(cors());
app.use(express.json());


app.use((req, res, next) => {
  if (
    typeof req.body?.origin === "string" &&
    req.body.origin.trim().length > 0
  ) {
    req.origin = req.body.origin;
  } else if (
    typeof req.headers.origin === "string" &&
    req.headers.origin.trim().length > 0
  ) {
    req.origin = req.headers.origin;
  } else {
    req.origin = "http://localhost:5173";
  }
  next();
});


// Health check
// app.get("/api/health", async (req, res) => {
//   try {
//     await pool.query("SELECT 1");
//     res.json({
//       ok: true,
//       database: "connected",
//       databaseUrlSource: process.env.DATABASE_URL
//         ? "DATABASE_URL"
//         : "local-postgres-defaults",
//       paymentsConfigured: true, // Mock billing is always configured
//       blockchainConfigured: blockchainConfigured,
//     });
//   } catch (err) {
//     res.status(500).json({
//       ok: false,
//       database: "disconnected",
//       error: err.message,
//     });
//   }
// });


app.get("/api/listings", async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM "Listing" WHERE active = true ORDER BY "createdAt" DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch listings:", err);
    res.status(500).json({ error: "Failed to load listings." });
  }
});


app.post("/api/listings", async (req, res) => {
  try {
    const seller = req.body?.seller?.trim();
    const txHash = req.body?.txHash?.trim();
    const amount = Number(req.body?.amount);
    const pricePerGHC = Number(req.body?.pricePerGHC);

    if (!isValidAddress(seller)) {
      return res
        .status(400)
        .json({ error: "A valid seller wallet address is required." });
    }
    if (!isPositiveNumber(amount)) {
      return res
        .status(400)
        .json({ error: "Amount must be a positive number." });
    }
    if (!isPositiveNumber(pricePerGHC)) {
      return res
        .status(400)
        .json({ error: "Price per GHC must be a positive number." });
    }
    if (!isValidTxHash(txHash)) {
      return res
        .status(400)
        .json({ error: "A valid transaction hash is required." });
    }

    const duplicateCheck = await pool.query(
      'SELECT id FROM "Listing" WHERE "txHash" = $1 LIMIT 1',
      [txHash]
    );
    if (duplicateCheck.rows.length > 0) {
      return res
        .status(409)
        .json({ error: "That transaction is already registered as a listing." });
    }

    const id = `listing_${crypto.randomUUID()}`;
    const insertRes = await pool.query(
      `INSERT INTO "Listing" (id, seller, amount, "pricePerGHC", "txHash", active, status)
       VALUES ($1, $2, $3, $4, $5, true, 'LISTED')
       RETURNING *`,
      [id, seller, amount, pricePerGHC, txHash]
    );

    res.status(201).json(insertRes.rows[0]);
  } catch (err) {
    console.error("Failed to create listing:", err);
    res.status(500).json({ error: "Failed to create listing." });
  }
});


app.post("/api/checkout-session", async (req, res) => {
  try {
    const listingId = req.body?.listingId;
    const buyerAddress = req.body?.buyerAddress?.trim();

    if (!listingId) {
      return res.status(400).json({ error: "Listing id is required." });
    }
    if (!isValidAddress(buyerAddress)) {
      return res
        .status(400)
        .json({ error: "A valid buyer wallet address is required." });
    }

    const listingRes = await pool.query(
      'SELECT * FROM "Listing" WHERE id = $1 AND active = true AND status = \'LISTED\' LIMIT 1',
      [listingId]
    );
    const listing = listingRes.rows[0];
    if (!listing) {
      return res
        .status(404)
        .json({ error: "Listing not found or is inactive." });
    }

    const sessionId = `mock_session_${crypto.randomUUID()}`;

    await pool.query(
      'UPDATE "Listing" SET "checkoutSessionId" = $1, "buyerAddress" = $2, status = \'CHECKOUT_PENDING\' WHERE id = $3',
      [sessionId, buyerAddress, listing.id]
    );

    console.log(`Starting mock on-chain transaction for listing: ${listing.id}`);

    const decimals = await ghcContract.decimals();
    const amountToTransfer = ethers.parseUnits(String(listing.amount), decimals);

    console.log(`Transferring ${listing.amount} GHC to buyer: ${buyerAddress}`);

    const transferTx = await ghcContract.transfer(buyerAddress, amountToTransfer);
    const transferReceipt = await transferTx.wait();

    console.log(`Transfer completed in tx: ${transferReceipt.hash}`);
    console.log(`Burning/Retiring ${listing.amount} GHC from buyer: ${buyerAddress}`);

    const burnTx = await ghcContract.burnFrom(buyerAddress, amountToTransfer);
    const burnReceipt = await burnTx.wait();

    console.log(`Retirement/Burn completed in tx: ${burnReceipt.hash}`);

    const mockPaymentIntent = `mock_pi_${crypto.randomUUID()}`;
    const mockPayoutTransfer = `demo_settlement_${listing.id}`;


    await pool.query(
      `UPDATE "Listing"
       SET active = false,
           status = 'RETIRED',
           "paymentIntentId" = $1,
           "payoutTransferId" = $2,
           "sellerPayoutStatus" = 'PENDING_OFF_PLATFORM_SETTLEMENT',
           "retirementTxHash" = $3
       WHERE id = $4`,
      [mockPaymentIntent, mockPayoutTransfer, burnReceipt.hash, listing.id]
    );

    res.json({ id: sessionId, success: true, retirementTxHash: burnReceipt.hash });
  } catch (err) {
    console.error("Failed to process mock checkout session:", err);
    res.status(500).json({
      error: err.message || "Failed to process mock checkout session.",
    });
  }
});


app.get("/api/checkout-session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const listingRes = await pool.query(
      'SELECT * FROM "Listing" WHERE "checkoutSessionId" = $1 LIMIT 1',
      [sessionId]
    );
    const listing = listingRes.rows[0];

    if (!listing) {
      return res.status(404).json({ error: "Checkout session not found." });
    }

    res.json({
      sessionId: sessionId,
      status: "complete",
      paymentStatus: "paid",
      listingId: listing.id,
      fulfilled: listing.status === "RETIRED",
      retirementTxHash: listing.retirementTxHash,
      payoutTransferId: listing.payoutTransferId,
      sellerPayoutStatus: listing.sellerPayoutStatus,
    });
  } catch (err) {
    console.error("Failed to query checkout session:", err);
    res
      .status(500)
      .json({ error: "Failed to fetch checkout session details." });
  }
});


app.get("/api/registry", async (req, res) => {
  try {
    const { rows } = await pool.query(
      'SELECT * FROM "Company" ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    console.error("Failed to fetch registry:", err);
    res.status(500).json({ error: "Failed to load registry." });
  }
});


app.post("/api/registry", async (req, res) => {
  try {
    const name = req.body?.name?.trim();
    const address = req.body?.address?.trim();
    const stripeAccountId = req.body?.stripeAccountId?.trim() || null;

    if (typeof name !== "string" || name.length === 0) {
      return res.status(400).json({ error: "Company name is required." });
    }
    if (!isValidAddress(address)) {
      return res
        .status(400)
        .json({ error: "A valid wallet address is required." });
    }

    const addrConflict = await pool.query(
      'SELECT name FROM "Company" WHERE address = $1 AND name != $2 LIMIT 1',
      [address, name]
    );
    if (addrConflict.rows.length > 0) {
      return res.status(409).json({
        error: "That wallet address is already registered to another company.",
      });
    }

    const id = `company_${crypto.randomUUID()}`;
    const upsertRes = await pool.query(
      `INSERT INTO "Company" (id, name, address)
       VALUES ($1, $2, $3)
       ON CONFLICT (name) DO UPDATE
       SET address = EXCLUDED.address
       RETURNING *`,
      [id, name, address]
    );

    res.json(upsertRes.rows[0]);
  } catch (err) {
    console.error("Failed to register company:", err);
    res.status(500).json({ error: "Failed to save company to registry." });
  }
});


app.listen(PORT, async () => {
  await initDB();
  console.log(`H2Cred Backend running on http://localhost:${PORT}`);
});
