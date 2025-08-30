import "@nomicfoundation/hardhat-ethers"
import dotenv from "dotenv"

dotenv.config()

export default {
	defaultNetwork: "sepolia",
	solidity: "0.8.20",
	networks: {
		sepolia: {
			type: "http",
			url: process.env.ALCHEMY_URL,
			accounts: [process.env.PRIVATE_KEY],
			timeout: 600000,
		},
	},
}
