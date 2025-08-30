import hre from "hardhat";
import dotenv from "dotenv";
import { ethers } from "ethers";

dotenv.config();

async function main() 
{
    // --- Setup provider & signer ---
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
    const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("Deploying contracts with wallet:", deployer.address);

    // --- Deploy MockERC20 ---
    const mockERCArtifact = await hre.artifacts.readArtifact("MockERC20");
    const MockERCFactory = new ethers.ContractFactory(
        mockERCArtifact.abi,
        mockERCArtifact.bytecode,
        deployer
    );

    const initialSupply = ethers.parseUnits("1000000", 6n);
    const mockERC = await MockERCFactory.deploy("Mock USDC", "mUSDC", 6, initialSupply);
    await mockERC.waitForDeployment();
    console.log("MockERC20 deployed at:", await mockERC.getAddress());

    // --- Deploy GreenHydrogenCredit ---
    const ghcArtifact = await hre.artifacts.readArtifact("GreenHydrogenCredit");
    const GHCFatory = new ethers.ContractFactory(
        ghcArtifact.abi,
        ghcArtifact.bytecode,
        deployer
    );

    const admin = deployer.address;
    const treasury = deployer.address;
    const paymentTokenAddress = await mockERC.getAddress();

    const ght = await GHCFatory.deploy(admin, treasury, paymentTokenAddress);
    await ght.waitForDeployment();
    console.log("GreenHydrogenCredit deployed at:", await ght.getAddress());
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
