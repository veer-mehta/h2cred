import { ethers } from "ethers"

// deployed contract addresses
const GHC_ADDRESS = "0xAC8a7765b289dF709711A724a55F33cc29a017B8"
const PAYMENT_TOKEN_ADDRESS = "0xb710e583cA24Ef923d950ef031e6a698D3097FBb"

// import the ABI JSONs from Hardhat build artifacts
import GHCArtifact from "../../../blockchain/artifacts/contracts/GreenHydrogenCredit.sol/GreenHydrogenCredit.json"
import PaymentArtifact from "../../../blockchain/artifacts/contracts/MockERC20.sol/MockERC20.json"

export async function getContracts() {
	if (!window.ethereum) throw new Error("MetaMask not detected")

	const provider = new ethers.BrowserProvider(window.ethereum)
	await provider.send("eth_requestAccounts", [])
	const signer = await provider.getSigner()

	const ghcContract = new ethers.Contract(
		GHC_ADDRESS,
		GHCArtifact.abi,
		signer
	)

	const paymentContract = new ethers.Contract(
		PAYMENT_TOKEN_ADDRESS,
		PaymentArtifact.abi,
		signer
	)

	const userAddress = await signer.getAddress()

	return { userAddress, ghcContract, paymentContract }
}
