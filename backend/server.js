import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { ethers } from "ethers";
import crypto from "crypto";

const PORT = 5000;
const GHC_ABI = ["function transfer(address to, uint256 amount) returns (bool)", "function burnFrom(address account, uint256 amount)", "function decimals() view returns (uint8)"];
const dburi = process.env.MONGODB_URI || "mongodb://localhost:27017/h2cred";

const Listing = mongoose.model('Listing', new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  seller: { type: String, required: true },
  amount: { type: Number, required: true },
  pricePerGHC: { type: Number, required: true },
  txHash: { type: String, required: true, unique: true },
  active: { type: Boolean, default: true },
  status: { type: String, default: 'LISTED' },
  buyerAddress: String, checkoutSessionId: String, paymentIntentId: String, payoutTransferId: String,
  sellerPayoutStatus: { type: String, default: 'UNPAID' },
  retirementTxHash: String, createdAt: { type: Date, default: Date.now }
}));

const Company = mongoose.model('Company', new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  address: { type: String, required: true, unique: true },
  createdAt: { type: Date, default: Date.now }
}));

let provider, adminWallet, ghcContract;
if (process.env.ALCHEMY_URL && process.env.PRIVATE_KEY && process.env.CONTRACT_ADDRESS) {
  provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
  adminWallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  ghcContract = new ethers.Contract(process.env.CONTRACT_ADDRESS, GHC_ABI, adminWallet);
  console.log("Blockchain loaded. GHC Contract:", process.env.CONTRACT_ADDRESS);
} else {
  console.warn("Blockchain env vars missing."); process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  req.origin = req.body?.origin?.trim() || req.headers.origin?.trim() || "http://localhost:5173";
  next();
});

const handleErr = (res, err, msg = "Server error") => { console.error(err); res.status(500).json({ error: err.message || msg }); };

app.get("/api/listings", async (req, res) => {
  try { res.json(await Listing.find({ active: true }).sort({ createdAt: -1 })); } 
  catch (err) { handleErr(res, err, "Failed to load listings"); }
});

app.post("/api/listings", async (req, res) => {
  try {
    const { seller, txHash, amount, pricePerGHC } = req.body;
    if (!ethers.isAddress(seller?.trim()) || !(amount > 0) || !(pricePerGHC > 0) || !ethers.isHexString(txHash?.trim(), 32))
      return res.status(400).json({ error: "Invalid input parameters." });

    if (await Listing.exists({ txHash: txHash.trim() })) return res.status(409).json({ error: "Transaction already registered." });

    const newListing = await Listing.create({ id: `listing_${crypto.randomUUID()}`, seller: seller.trim(), amount, pricePerGHC, txHash: txHash.trim() });
    res.status(201).json(newListing);
  } catch (err) { handleErr(res, err, "Failed to create listing"); }
});

app.post("/api/checkout-session", async (req, res) => {
  try {
    const { listingId, buyerAddress } = req.body;
    if (!listingId || !ethers.isAddress(buyerAddress?.trim())) return res.status(400).json({ error: "Invalid listing or buyer address." });

    const listing = await Listing.findOne({ id: listingId, active: true, status: 'LISTED' });
    if (!listing) return res.status(404).json({ error: "Listing not found or inactive." });

    const sessionId = `mock_session_${crypto.randomUUID()}`;
    listing.set({ checkoutSessionId: sessionId, buyerAddress: buyerAddress.trim(), status: 'CHECKOUT_PENDING' });
    await listing.save();

    console.log(`Starting mock on-chain tx for listing ${listing.id}`);
    const amountToTransfer = ethers.parseUnits(String(listing.amount), await ghcContract.decimals());
    
    const transferTx = await ghcContract.transfer(buyerAddress.trim(), amountToTransfer);
    const transferReceipt = await transferTx.wait();
    
    const burnTx = await ghcContract.burnFrom(buyerAddress.trim(), amountToTransfer);
    const burnReceipt = await burnTx.wait();

    listing.set({
      active: false, status: 'RETIRED', paymentIntentId: `mock_pi_${crypto.randomUUID()}`,
      payoutTransferId: `demo_settlement_${listing.id}`, sellerPayoutStatus: 'PENDING_OFF_PLATFORM_SETTLEMENT', retirementTxHash: burnReceipt.hash
    });
    await listing.save();

    res.json({ id: sessionId, success: true, retirementTxHash: burnReceipt.hash });
  } catch (err) { handleErr(res, err, "Checkout failed"); }
});

app.get("/api/checkout-session/:sessionId", async (req, res) => {
  try {
    const listing = await Listing.findOne({ checkoutSessionId: req.params.sessionId });
    if (!listing) return res.status(404).json({ error: "Session not found." });
    res.json({ sessionId: req.params.sessionId, status: "complete", paymentStatus: "paid", listingId: listing.id, fulfilled: listing.status === "RETIRED", retirementTxHash: listing.retirementTxHash, payoutTransferId: listing.payoutTransferId, sellerPayoutStatus: listing.sellerPayoutStatus });
  } catch (err) { handleErr(res, err, "Failed to fetch session"); }
});

app.get("/api/registry", async (req, res) => {
  try { res.json(await Company.find().sort({ name: 1 })); } 
  catch (err) { handleErr(res, err, "Failed to load registry"); }
});

app.post("/api/registry", async (req, res) => {
  try {
    const { name, address } = req.body;
    if (!name?.trim() || !ethers.isAddress(address?.trim())) return res.status(400).json({ error: "Invalid name or address." });

    if (await Company.exists({ address: address.trim(), name: { $ne: name.trim() } }))
      return res.status(409).json({ error: "Address already registered to another company." });

    const company = await Company.findOneAndUpdate({ name: name.trim() }, { id: `company_${crypto.randomUUID()}`, name: name.trim(), address: address.trim() }, { new: true, upsert: true });
    res.json(company);
  } catch (err) { handleErr(res, err, "Registration failed"); }
});

mongoose.connect(dburi).then(() => {
  console.log("Database connected successfully.");
  app.listen(PORT, () => console.log(`H2Cred Backend running on http://localhost:${PORT}`));
}).catch(console.error);
