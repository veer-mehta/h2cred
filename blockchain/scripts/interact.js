import fs from "fs";
import { ethers } from "ethers";
import "dotenv/config";

const artifactJson = JSON.parse(
    fs.readFileSync(new URL("../artifacts/contracts/GreenHydrogenCredit.sol/GreenHydrogenCredit.json", import.meta.url))
);

async function main() {
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
    const deployer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const ghc = new ethers.Contract(process.env.GHC_ADR, artifactJson.abi, deployer);

    console.log("Token name:", await ghc.name());

    const tx = await ghc.mint(deployer.address, 10n);
    await tx.wait();
    console.log("Minted 10 tokens to recipient");

    const balance = await ghc.balanceOf(deployer.address);
    console.log("Recipient balance:", balance.toString());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
