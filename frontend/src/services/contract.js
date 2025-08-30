import { ethers } from "ethers";

// deployed contract addresses
const GHC_ADDRESS = "0x4B1EBa5AEaaEcccae18014c0Dc461aa1ba9701e2";
const PAYMENT_TOKEN_ADDRESS = "0x674844E65a27C8a6A4C064e6efa2050a64c6828E";

// import the ABI JSONs from Hardhat build artifacts
import GHCArtifact from "../../../blockchain/artifacts/contracts/GreenHydrogenCredit.sol/GreenHydrogenCredit.json";
import PaymentArtifact from "../../../blockchain/artifacts/contracts/MockERC20.sol/MockERC20.json";

export async function getContracts() {
    if (!window.ethereum) throw new Error("MetaMask not detected");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const ghcContract = new ethers.Contract(GHC_ADDRESS, GHCArtifact.abi, signer);
    const paymentContract = new ethers.Contract(
        PAYMENT_TOKEN_ADDRESS,
        PaymentArtifact.abi,
        signer
    );

    const userAddress = await signer.getAddress();

    return { userAddress, ghcContract, paymentContract };
}
