const { ethers } = require("hardhat")

async function main() {
	console.log("Deploying HydrogenCredit contract...")

	const [deployer] = await ethers.getSigners()

	const HydrogenCredit = await ethers.getContractFactory(
		"GreenHydrogenCredit"
	)
	const admin = deployer.address;
	const treasury = deployer.address;
	const price_per_token = ethers.utils.parseUnits("0.01", "ether")
	const contract = await HydrogenCredit.deploy(admin, treasury, price_per_token)

	await contract.deployed()

	console.log("GreenHydrogenCredit deployed to:", contract.address)
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
// deploys the smart contract to sepolia testnet with my credentials and some eth to mine the contract
