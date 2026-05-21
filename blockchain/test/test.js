import { expect } from "chai"
import hre from "hardhat"
const { ethers } = hre

describe("GreenHydrogenCredit", function () {
	let ghc, deployer, minter, otherUser

	beforeEach(async function () {
		[deployer, minter, otherUser] = await ethers.getSigners()
		const GHContractFactory = await ethers.getContractFactory(
			"GreenHydrogenCredit"
		)
		ghc = await GHContractFactory.deploy(
			deployer.address, // defaultAdmin
			minter.address    // minter
		)

		await ghc.waitForDeployment()
	})

	it("Should deploy and have correct name and symbol", async function () {
		expect(await ghc.name()).to.equal("GreenHydrogenCredit")
		expect(await ghc.symbol()).to.equal("GHC")
	})

	it("Should allow only minter to mint tokens", async function () {
		await ghc.connect(minter).mint(otherUser.address, 1000n)
		expect(await ghc.balanceOf(otherUser.address)).to.equal(1000n)

		await expect(ghc.connect(otherUser).mint(otherUser.address, 500n))
			.to.be.revertedWithCustomError(
				ghc,
				"AccessControlUnauthorizedAccount"
			)
			.withArgs(otherUser.address, await ghc.MINTER_ROLE())
	})

	it("Should allow burning of tokens", async function () {
		await ghc.connect(minter).mint(otherUser.address, 1000n)
		
		// Burn some tokens
		await ghc.connect(otherUser).burn(400n)
		expect(await ghc.balanceOf(otherUser.address)).to.equal(600n)
	})

	it("Should allow burning tokens on behalf of another user with approval", async function () {
		await ghc.connect(minter).mint(otherUser.address, 1000n)

		// Approve deployer (admin) to spend otherUser's GHC
		await ghc.connect(otherUser).approve(deployer.address, 400n)

		// Admin burns otherUser's GHC
		await ghc.connect(deployer).burnFrom(otherUser.address, 400n)
		expect(await ghc.balanceOf(otherUser.address)).to.equal(600n)
	})
})
