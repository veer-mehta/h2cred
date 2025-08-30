const {expect} = require("chai")
const {ethers} = require("hardhat")

describe("HydrogenCredit", function ()
{
    it("Should allow buying and transferring credits", async function ()
    {
        const [owner, addr1, addr2] = await ethers.getSigners();
        const HydrogenCredit = await ethers.getContractFactory("HydrogenCredit");
        const contract = await HydrogenCredit.deploy();

        // Buy credits
        await contract.connect(addr1).buyCredits(5, { value: ethers.utils.parseEther("0.01") });
        expect(await contract.credits(addr1.address)).to.equal(5);

        // Transfer credits
        await contract.connect(addr1).transferCredits(addr2.address, 2);
        expect(await contract.credits(addr1.address)).to.equal(3);
        expect(await contract.credits(addr2.address)).to.equal(2);
    });
});
