const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GreenHydrogenCredit", function () {
    let GreenHydrogenCredit, contract;
    let admin, user1, user2;
    const price_per_token = ethers.utils.parseUnits("0.01", "ether");

    beforeEach(async function () {
        [admin, user1, user2] = await ethers.getSigners();

        GreenHydrogenCredit = await ethers.getContractFactory("GreenHydrogenCredit");
        contract = await GreenHydrogenCredit.deploy(admin.address, admin.address, price_per_token);
        await contract.deployed();
    });

    it("should set admin correctly", async function () {
        expect(await contract.hasRole(await contract.DEFAULT_ADMIN_ROLE(), admin.address)).to.equal(true);
    });

    it("user can buy credits", async function () {
        const amount = 5;
        await contract.connect(user1).buyCredits(amount, { value: price_per_token.mul(amount) });

        expect(await contract.getMyCredits({ from: user1.address })).to.equal(amount);
    });

    it("user cannot buy credits with insufficient ETH", async function () {
        const amount = 5;
        await expect(
            contract.connect(user1).buyCredits(amount, { value: price_per_token.mul(amount - 1) })
        ).to.be.revertedWith("Insufficient payment");
    });

    it("users can transfer credits", async function () {
        const amount = 5;
        await contract.connect(user1).buyCredits(amount, { value: price_per_token.mul(amount) });

        await contract.connect(user1).transferCredits(user2.address, 3);

        expect(await contract.getMyCredits({ from: user1.address })).to.equal(2);
        expect(await contract.getMyCredits({ from: user2.address })).to.equal(3);
    });

    it("cannot transfer more than balance", async function () {
        await expect(contract.connect(user1).transferCredits(user2.address, 1))
            .to.be.revertedWith("Not enough credits");
    });
});
