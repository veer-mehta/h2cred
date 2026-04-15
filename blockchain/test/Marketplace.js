import { expect } from "chai";
import hre from "hardhat";
const { ethers } = hre;

describe("GHC_Marketplace", function () {
  let ghc, usdc, marketplace;
  let owner, producer, buyer;

  beforeEach(async function () {
    [owner, producer, buyer] = await ethers.getSigners();

    // Deploy GHC
    const GHC = await ethers.getContractFactory("GreenHydrogenCredit");
    ghc = await GHC.deploy(owner.address, owner.address, owner.address);
    await ghc.waitForDeployment();

    // Deploy MockUSDC
    const USDC = await ethers.getContractFactory("MockUSDC");
    usdc = await USDC.deploy(owner.address);
    await usdc.waitForDeployment();

    // Deploy Marketplace
    const Marketplace = await ethers.getContractFactory("GHC_Marketplace");
    marketplace = await Marketplace.deploy(await ghc.getAddress(), await usdc.getAddress(), owner.address);
    await marketplace.waitForDeployment();

    // Grant roles and mint initial tokens
    await ghc.grantRole(await ghc.MINTER_ROLE(), owner.address);
    await ghc.mint(producer.address, ethers.parseEther("100")); // 100 GHC

    await usdc.grantRole(await usdc.MINTER_ROLE(), owner.address);
    // USDC has 6 decimals in my Mock contract
    await usdc.mint(buyer.address, ethers.parseUnits("1000", 6)); // 1000 USDC
  });

  it("Should allow listing GHC", async function () {
    const listAmount = ethers.parseEther("10");
    const listPrice = ethers.parseUnits("50", 6); // 50 USDC

    // Approve marketplace to spend GHC
    await ghc.connect(producer).approve(await marketplace.getAddress(), listAmount);

    await expect(marketplace.connect(producer).list(listAmount, listPrice))
      .to.emit(marketplace, "Listed")
      .withArgs(0, producer.address, listAmount, listPrice);

    const listing = await marketplace.listings(0);
    expect(listing.seller).to.equal(producer.address);
    expect(listing.amount).to.equal(listAmount);
    expect(listing.price).to.equal(listPrice);
    expect(listing.active).to.be.true;
  });

  it("Should allow buying GHC", async function () {
    const listAmount = ethers.parseEther("10");
    const listPrice = ethers.parseUnits("50", 6);

    await ghc.connect(producer).approve(await marketplace.getAddress(), listAmount);
    await marketplace.connect(producer).list(listAmount, listPrice);

    // Buyer approves marketplace to spend USDC
    await usdc.connect(buyer).approve(await marketplace.getAddress(), listPrice);

    const initialProducerUSDC = await usdc.balanceOf(producer.address);
    const initialBuyerGHC = await ghc.balanceOf(buyer.address);

    await expect(marketplace.connect(buyer).buy(0))
      .to.emit(marketplace, "Purchased")
      .withArgs(0, buyer.address, listAmount, listPrice);

    expect(await usdc.balanceOf(producer.address)).to.equal(initialProducerUSDC + listPrice);
    expect(await ghc.balanceOf(buyer.address)).to.equal(initialBuyerGHC + listAmount);

    const listing = await marketplace.listings(0);
    expect(listing.active).to.be.false;
  });

  it("Should allow cancelling a listing", async function () {
    const listAmount = ethers.parseEther("10");
    const listPrice = ethers.parseUnits("50", 6);

    await ghc.connect(producer).approve(await marketplace.getAddress(), listAmount);
    await marketplace.connect(producer).list(listAmount, listPrice);

    await expect(marketplace.connect(producer).cancel(0))
      .to.emit(marketplace, "Cancelled")
      .withArgs(0);

    const listing = await marketplace.listings(0);
    expect(listing.active).to.be.false;
    
    expect(await ghc.balanceOf(producer.address)).to.equal(ethers.parseEther("100"));
  });
});
