const hre = require("hardhat");
require("dotenv").config();

async function main() 
{
    // --- Setup provider & wallet ---
    const provider = new hre.ethers.providers.JsonRpcProvider(process.env.ALCHEMY_URL);
    const wallet = new hre.ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("Deploying contracts with wallet:", wallet.address);

    // --- Deploy MockERC20 ---
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20", wallet);

    // Example: name="Mock USDC", symbol="mUSDC", 6 decimals, initial supply = 1 million tokens
    const initialSupply = hre.ethers.utils.parseUnits("1000000", 6); 
    const mockERC = await MockERC20.deploy("Mock USDC", "mUSDC", 6, initialSupply);
    await mockERC.deployed();
    console.log("MockERC20 deployed at:", mockERC.address);

    // --- Deploy GreenHydrogenCredit ---
    const GreenHydrogenCredit = await hre.ethers.getContractFactory("GreenHydrogenCredit", wallet);

    // Parameters: admin, treasury, payment_token_address
    const admin = wallet.address;
    const treasury = wallet.address; // can be the same as admin
    const paymentTokenAddress = mockERC.address;

    const ght = await GreenHydrogenCredit.deploy(admin, treasury, paymentTokenAddress);
    await ght.deployed();
    console.log("GreenHydrogenCredit deployed at:", ght.address);

    console.log("\nDeployment complete!");
    console.log("MockERC20:", mockERC.address);
    console.log("GreenHydrogenCredit:", ght.address);
}

// Run the script
main()
    .then(() => process.exit(0))
    .catch((error) => 
    {
        console.error(error);
        process.exit(1);
    });
