import { useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { BlockchainContext } from "../context/BlockchainContext";

const BuyerDashboard = () => {
    const { userAddress, ghcContract, paymentContract } = useContext(BlockchainContext);
    const [ghcBalance, setGhcBalance] = useState("0");
    const [pricePerToken, setPricePerToken] = useState("1"); // in MERC units
    const [amountToBuy, setAmountToBuy] = useState("1");

    useEffect(() => {
        if (ghcContract && userAddress) {
            updateBalance();
        }
    }, [ghcContract, userAddress]);

    const updateBalance = async () => {
        try {
            const bal = await ghcContract.balanceOf(userAddress);
            setGhcBalance(ethers.formatUnits(bal, 18));
        } catch (err) {
            console.error("Failed to fetch balance:", err);
        }
    };

    const buyGhc = async () => {
        if (!ghcContract || !paymentContract) return;
        try {
            const amount = ethers.parseUnits(amountToBuy || "0", 18);
            const price = ethers.parseUnits(pricePerToken || "0", 18);
            const cost = await ghcContract.getGhcCost(amount, price);

            // Approve GHC contract to spend MERC
            const approveTx = await paymentContract.approve(ghcContract.target, cost);
            await approveTx.wait();

            // Call buyFromSeller (assuming seller is admin for testing)
            const admin = await ghcContract.getRoleMember(ethers.id("NGO_ROLE"), 0);
            const buyTx = await ghcContract.buyFromSeller(admin, amount, price);
            await buyTx.wait();

            updateBalance();
        } catch (err) {
            console.error("Buy GHC failed:", err);
        }
    };

    return (
        <div style={{ padding: "2rem" }}>
            <h1>Buyer Dashboard</h1>
            <p>Connected account: {userAddress || "Not connected"}</p>
            <p>GHC Balance: {ghcBalance}</p>

            <input
                type="number"
                placeholder="Amount to buy"
                value={amountToBuy}
                onChange={(e) => setAmountToBuy(e.target.value)}
            />
            <input
                type="number"
                placeholder="Price per token"
                value={pricePerToken}
                onChange={(e) => setPricePerToken(e.target.value)}
                style={{ marginLeft: "0.5rem" }}
            />
            <button onClick={buyGhc} style={{ marginLeft: "0.5rem" }}>Buy GHC</button>
            <button onClick={updateBalance} style={{ marginLeft: "0.5rem" }}>Refresh Balance</button>
        </div>
    );
};

export default BuyerDashboard;
