import { ethers } from "ethers"

// deployed contract addresses
const GHC_ADDRESS = "0xB7E83a480870cB0283DF393264dc5b62adbFCd0D"
const PAYMENT_TOKEN_ADDRESS = "0x5ef42e1F3Cd7eeA6Fb81fdcBD96b1D73172AEe85"

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
