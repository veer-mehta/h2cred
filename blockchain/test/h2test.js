const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GreenHydrogenCredit", function () {
    let ghcContract;
    let mockUSDC;
    let owner, treasury, user1, user2, minter;
    
    const INITIAL_USDC_SUPPLY = ethers.utils.parseUnits("1000000", 6); // 1M USDC
    const TOKENS_TO_BUY = ethers.utils.parseUnits("100", 18); // 100 GHC tokens
    const EXPECTED_COST = ethers.utils.parseUnits("100", 6); // 100 USDC

    beforeEach(async function () {
        [owner, treasury, user1, user2, minter] = await ethers.getSigners();

        // Deploy mock USDC contract (ERC20 with 6 decimals)
        const MockUSDC = await ethers.getContractFactory("MockERC20");
        mockUSDC = await MockUSDC.deploy(
            "USD Coin",
            "USDC",
            6,
            INITIAL_USDC_SUPPLY
        );
        await mockUSDC.deployed();

        // Deploy GreenHydrogenCredit contract
        const GHC = await ethers.getContractFactory("GreenHydrogenCredit");
        ghcContract = await GHC.deploy(
            owner.address,
            treasury.address,
            mockUSDC.address
        );
        await ghcContract.deployed();

        // Give user1 some USDC for testing
        await mockUSDC.transfer(user1.address, ethers.utils.parseUnits("10000", 6));
    });

    describe("Deployment", function () {
        it("Should set the correct initial parameters", async function () {
            expect(await ghcContract.name()).to.equal("GreenHydrogenCredit");
            expect(await ghcContract.symbol()).to.equal("GHC");
            expect(await ghcContract.decimals()).to.equal(18);
            expect(await ghcContract.treasury()).to.equal(treasury.address);
            expect(await ghcContract.payment_token()).to.equal(mockUSDC.address);
            expect(await ghcContract.PRICE_PER_TOKEN()).to.equal(ethers.utils.parseUnits("1", 6));
        });

        it("Should grant admin and minter roles to owner", async function () {
            const DEFAULT_ADMIN_ROLE = await ghcContract.DEFAULT_ADMIN_ROLE();
            const MINTER_ROLE = await ghcContract.MINTER_ROLE();
            
            expect(await ghcContract.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
            expect(await ghcContract.hasRole(MINTER_ROLE, owner.address)).to.be.true;
        });
    });

    describe("Stable Pricing", function () {
        it("Should have fixed price of 1 USDC per token", async function () {
            const price = await ghcContract.PRICE_PER_TOKEN();
            expect(price).to.equal(ethers.utils.parseUnits("1", 6)); // 1 USDC
        });

        it("Should calculate correct cost for token purchases", async function () {
            const cost = await ghcContract.get_cost_for_tokens(TOKENS_TO_BUY);
            expect(cost).to.equal(EXPECTED_COST);
        });

        it("Should not allow price updates (immutable)", async function () {
            // The update_price function should not exist
            expect(ghcContract.update_price).to.be.undefined;
        });
    });

    describe("Token Purchasing", function () {
        beforeEach(async function () {
            // User1 approves USDC spending
            await mockUSDC.connect(user1).approve(ghcContract.address, EXPECTED_COST);
        });

        it("Should allow users to buy tokens with USDC", async function () {
            const initialUSDCBalance = await mockUSDC.balanceOf(user1.address);
            const initialGHCBalance = await ghcContract.balanceOf(user1.address);

            await ghcContract.connect(user1).buy_tokens(TOKENS_TO_BUY);

            const finalUSDCBalance = await mockUSDC.balanceOf(user1.address);
            const finalGHCBalance = await ghcContract.balanceOf(user1.address);

            expect(finalUSDCBalance).to.equal(initialUSDCBalance.sub(EXPECTED_COST));
            expect(finalGHCBalance).to.equal(initialGHCBalance.add(TOKENS_TO_BUY));
        });

        it("Should emit tokens_purchased event", async function () {
            await expect(ghcContract.connect(user1).buy_tokens(TOKENS_TO_BUY))
                .to.emit(ghcContract, "tokens_purchased")
                .withArgs(user1.address, TOKENS_TO_BUY, EXPECTED_COST);
        });

        it("Should fail if insufficient USDC approved", async function () {
            const insufficientAmount = ethers.utils.parseUnits("50", 6); // Only 50 USDC
            await mockUSDC.connect(user1).approve(ghcContract.address, insufficientAmount);

            await expect(
                ghcContract.connect(user1).buy_tokens(TOKENS_TO_BUY)
            ).to.be.revertedWith("payment transfer failed");
        });

        it("Should fail if trying to buy zero tokens", async function () {
            await expect(
                ghcContract.connect(user1).buy_tokens(0)
            ).to.be.revertedWith("token_amount > 0");
        });
    });

    describe("Token Retirement", function () {
        beforeEach(async function () {
            // User1 buys some tokens first
            await mockUSDC.connect(user1).approve(ghcContract.address, EXPECTED_COST);
            await ghcContract.connect(user1).buy_tokens(TOKENS_TO_BUY);
        });

        it("Should allow users to retire tokens", async function () {
            const tokensToRetire = ethers.utils.parseUnits("50", 18);
            const initialBalance = await ghcContract.balanceOf(user1.address);

            await ghcContract.connect(user1).retire_tokens(tokensToRetire);

            const finalBalance = await ghcContract.balanceOf(user1.address);
            expect(finalBalance).to.equal(initialBalance.sub(tokensToRetire));
        });

        it("Should emit tokens_retired event", async function () {
            const tokensToRetire = ethers.utils.parseUnits("50", 18);
            
            await expect(ghcContract.connect(user1).retire_tokens(tokensToRetire))
                .to.emit(ghcContract, "tokens_retired")
                .withArgs(user1.address, tokensToRetire);
        });

        it("Should fail if trying to retire more tokens than owned", async function () {
            const excessiveAmount = ethers.utils.parseUnits("200", 18);
            
            await expect(
                ghcContract.connect(user1).retire_tokens(excessiveAmount)
            ).to.be.revertedWith("ERC20: burn amount exceeds balance");
        });
    });

    describe("Minting", function () {
        it("Should allow minter to mint tokens", async function () {
            const mintAmount = ethers.utils.parseUnits("500", 18);
            
            await ghcContract.connect(owner).mint(user2.address, mintAmount);
            
            const balance = await ghcContract.balanceOf(user2.address);
            expect(balance).to.equal(mintAmount);
        });

        it("Should fail if non-minter tries to mint", async function () {
            const mintAmount = ethers.utils.parseUnits("500", 18);
            
            await expect(
                ghcContract.connect(user1).mint(user2.address, mintAmount)
            ).to.be.revertedWith("missing role");
        });

        it("Should allow admin to grant minter role", async function () {
            const MINTER_ROLE = await ghcContract.MINTER_ROLE();
            
            await ghcContract.connect(owner).grantRole(MINTER_ROLE, minter.address);
            
            expect(await ghcContract.hasRole(MINTER_ROLE, minter.address)).to.be.true;
            
            // New minter should be able to mint
            const mintAmount = ethers.utils.parseUnits("100", 18);
            await ghcContract.connect(minter).mint(user2.address, mintAmount);
            expect(await ghcContract.balanceOf(user2.address)).to.equal(mintAmount);
        });
    });

    describe("Treasury Management", function () {
        beforeEach(async function () {
            // User1 buys tokens to generate revenue
            await mockUSDC.connect(user1).approve(ghcContract.address, EXPECTED_COST);
            await ghcContract.connect(user1).buy_tokens(TOKENS_TO_BUY);
        });

        it("Should allow admin to withdraw payment tokens to treasury", async function () {
            const withdrawAmount = ethers.utils.parseUnits("50", 6);
            const initialTreasuryBalance = await mockUSDC.balanceOf(treasury.address);

            await ghcContract.connect(owner).withdraw_payment_tokens(withdrawAmount);

            const finalTreasuryBalance = await mockUSDC.balanceOf(treasury.address);
            expect(finalTreasuryBalance).to.equal(initialTreasuryBalance.add(withdrawAmount));
        });

        it("Should allow admin to withdraw all payment tokens", async function () {
            const contractBalance = await ghcContract.contract_payment_balance();
            const initialTreasuryBalance = await mockUSDC.balanceOf(treasury.address);

            await ghcContract.connect(owner).withdraw_all_payment_tokens();

            const finalTreasuryBalance = await mockUSDC.balanceOf(treasury.address);
            expect(finalTreasuryBalance).to.equal(initialTreasuryBalance.add(contractBalance));
            expect(await ghcContract.contract_payment_balance()).to.equal(0);
        });

        it("Should allow admin to update treasury address", async function () {
            await ghcContract.connect(owner).update_treasury(user2.address);
            expect(await ghcContract.treasury()).to.equal(user2.address);
        });

        it("Should fail if non-admin tries to withdraw", async function () {
            const withdrawAmount = ethers.utils.parseUnits("50", 6);
            
            await expect(
                ghcContract.connect(user1).withdraw_payment_tokens(withdrawAmount)
            ).to.be.revertedWith("only admin");
        });
    });

    describe("Pause Functionality", function () {
        it("Should allow admin to pause and unpause", async function () {
            await ghcContract.connect(owner).pause();
            expect(await ghcContract.paused()).to.be.true;

            await ghcContract.connect(owner).unpause();
            expect(await ghcContract.paused()).to.be.false;
        });

        it("Should prevent token purchases when paused", async function () {
            await ghcContract.connect(owner).pause();
            
            await mockUSDC.connect(user1).approve(ghcContract.address, EXPECTED_COST);
            
            await expect(
                ghcContract.connect(user1).buy_tokens(TOKENS_TO_BUY)
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should prevent token transfers when paused", async function () {
            // First buy some tokens
            await mockUSDC.connect(user1).approve(ghcContract.address, EXPECTED_COST);
            await ghcContract.connect(user1).buy_tokens(TOKENS_TO_BUY);

            // Then pause
            await ghcContract.connect(owner).pause();

            // Transfer should fail
            await expect(
                ghcContract.connect(user1).transfer(user2.address, ethers.utils.parseUnits("10", 18))
            ).to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Edge Cases", function () {
        it("Should handle fractional token purchases correctly", async function () {
            const fractionalTokens = ethers.utils.parseUnits("0.5", 18); // 0.5 tokens
            const expectedCost = ethers.utils.parseUnits("0.5", 6); // 0.5 USDC

            await mockUSDC.connect(user1).approve(ghcContract.address, expectedCost);
            await ghcContract.connect(user1).buy_tokens(fractionalTokens);

            const balance = await ghcContract.balanceOf(user1.address);
            expect(balance).to.equal(fractionalTokens);
        });

        it("Should handle large token purchases", async function () {
            const largeAmount = ethers.utils.parseUnits("10000", 18); // 10,000 tokens
            const largeCost = ethers.utils.parseUnits("10000", 6); // 10,000 USDC

            // Give user1 enough USDC
            await mockUSDC.transfer(user1.address, largeCost);
            await mockUSDC.connect(user1).approve(ghcContract.address, largeCost);
            
            await ghcContract.connect(user1).buy_tokens(largeAmount);

            const balance = await ghcContract.balanceOf(user1.address);
            expect(balance).to.equal(largeAmount);
        });

        it("Should prevent zero address operations", async function () {
            await expect(
                ghcContract.connect(owner).mint(ethers.constants.AddressZero, 100)
            ).to.be.revertedWith("mint to zero");

            await expect(
                ghcContract.connect(owner).update_treasury(ethers.constants.AddressZero)
            ).to.be.revertedWith("treasury zero");
        });
    });

    describe("Integration Test", function () {
        it("Should complete full user journey: buy -> transfer -> retire", async function () {
            // 1. User1 buys tokens
            await mockUSDC.connect(user1).approve(ghcContract.address, EXPECTED_COST);
            await ghcContract.connect(user1).buy_tokens(TOKENS_TO_BUY);
            
            expect(await ghcContract.balanceOf(user1.address)).to.equal(TOKENS_TO_BUY);

            // 2. User1 transfers some to user2
            const transferAmount = ethers.utils.parseUnits("30", 18);
            await ghcContract.connect(user1).transfer(user2.address, transferAmount);
            
            expect(await ghcContract.balanceOf(user2.address)).to.equal(transferAmount);
            expect(await ghcContract.balanceOf(user1.address)).to.equal(TOKENS_TO_BUY.sub(transferAmount));

            // 3. User2 retires tokens
            const retireAmount = ethers.utils.parseUnits("20", 18);
            const initialSupply = await ghcContract.totalSupply();
            
            await ghcContract.connect(user2).retire_tokens(retireAmount);
            
            expect(await ghcContract.balanceOf(user2.address)).to.equal(transferAmount.sub(retireAmount));
            expect(await ghcContract.totalSupply()).to.equal(initialSupply.sub(retireAmount));

            // 4. Admin withdraws collected USDC
            const contractUSDCBalance = await ghcContract.contract_payment_balance();
            const initialTreasuryBalance = await mockUSDC.balanceOf(treasury.address);
            
            await ghcContract.connect(owner).withdraw_all_payment_tokens();
            
            const finalTreasuryBalance = await mockUSDC.balanceOf(treasury.address);
            expect(finalTreasuryBalance).to.equal(initialTreasuryBalance.add(contractUSDCBalance));
            expect(await ghcContract.contract_payment_balance()).to.equal(0);
        });
    });
});
