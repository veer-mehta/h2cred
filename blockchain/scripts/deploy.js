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

    // --- Deploy MockERC20 (SAFE) ---
    const mockERC20Artifact = await hre.artifacts.readArtifact("MockERC20");
    const MockERC20Factory = new ethers.ContractFactory(
        mockERC20Artifact.abi,
        mockERC20Artifact.bytecode,
        deployer
    );

    const mockERC20 = await MockERC20Factory.deploy(deployer.address);
    await mockERC20.waitForDeployment();
    console.log("MockERC20 deployed at:", mockERC20.target);

    // --- Deploy GreenHydrogenCredit (GHC) ---
    const ghcArtifact = await hre.artifacts.readArtifact("GreenHydrogenCredit");
    const GHContractFactory = new ethers.ContractFactory(
        ghcArtifact.abi,
        ghcArtifact.bytecode,
        deployer
    );

    // Only payment token address is needed now
    const ghc = await GHContractFactory.deploy(mockERC20.target);
    await ghc.waitForDeployment();
    console.log("GreenHydrogenCredit deployed at:", ghc.target);

    console.log("\nDeployment complete!");
    console.log("MockERC20 (SAFE) address:", mockERC20.target);
    console.log("GreenHydrogenCredit (GHC) address:", ghc.target);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
