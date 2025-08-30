const { expect } = require("chai");
const { ethers } = require("hardhat");
require("dotenv").config();

describe("GreenHydrogenCredit on Sepolia (minimal ETH safe)", function () {
    let contract;
    let admin;
    const CONTRACT_ADDRESS = process.env.DEPLOYED_ADDR; // deployed contract address

    before(async function () {
        // Connect to Sepolia via Alchemy
        const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL);
        admin = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

        const GreenHydrogenCredit = await ethers.getContractFactory("GreenHydrogenCredit", admin);
        contract = GreenHydrogenCredit.attach(CONTRACT_ADDRESS);
    });

    it("should have admin role set correctly", async function () {
        const hasAdmin = await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), admin.address);
        expect(hasAdmin).to.equal(true);
    });

    it("admin can buy 1 token with minimal ETH", async function () {
        // token amount in 18 decimals
        const token_amount = ethers.utils.parseUnits("1", 18);

        // calculate exact cost according to contract price_per_token
        const price_per_token = await contract.price_per_token();
        const cost = token_amount.mul(price_per_token).div(ethers.utils.parseUnits("1", 18));

        // add tiny buffer to avoid rounding issues
        const valueToSend = cost.add(ethers.utils.parseUnits("0.00001", "ether"));

        await contract.buy_tokens(token_amount, { value: valueToSend, gasLimit: 100000 });

        const balance = await contract.balanceOf(admin.address);
        expect(balance).to.equal(token_amount);
    });

    it("admin can retire (burn) 1 token", async function () {
        const token_amount = ethers.utils.parseUnits("1", 18);

        // burn tokens
        await contract.retire_tokens(token_amount, { gasLimit: 50000 });

        const balance = await contract.balanceOf(admin.address);
        expect(balance).to.equal(0);
    });
});
