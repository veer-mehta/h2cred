import fs from "fs";
import { ethers } from "ethers";
import "dotenv/config";

// Read the compiled contract artifact (generated previously)
const artifactJson = JSON.parse(
    fs.readFileSync(new URL("../artifacts/contracts/GreenHydrogenCredit.sol/GreenHydrogenCredit.json", import.meta.url))
);

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
    const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    console.log("Deploying contracts with account:", deployer.address);
    console.log("Account balance:", (await provider.getBalance(deployer.address)).toString());

    // Create a ContractFactory using the pure ethers library
    const GHContractFactory = new ethers.ContractFactory(
        artifactJson.abi,
        artifactJson.bytecode,
        deployer
    );

    const ghc = await GHContractFactory.deploy(
        deployer.address,
        deployer.address
    );

    await ghc.waitForDeployment();

    console.log("GreenHydrogenCredit deployed at:", await ghc.getAddress());
    console.log("Account balance:", (await provider.getBalance(deployer.address)).toString());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
