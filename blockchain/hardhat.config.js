require("@nomiclabs/hardhat-ethers")
require("dotenv").config()

module.exports = {
	defaultNetwork: "sepolia",
	solidity: "0.8.20",
	networks: {
		sepolia: {
			url: process.env.ALCHEMY_URL,
			accounts: [process.env.PRIVATE_KEY],
			timeout: 600000 
		},
	},
}
