import { useContext, useState, useEffect } from "react";
import { ethers } from "ethers";
import { BlockchainContext } from "../context/BlockchainContext";

const SellerDashboard = () => {
    const { userAddress, ghcContract, paymentContract } = useContext(BlockchainContext);
    const [mercBalance, setMercBalance] = useState("0");
    const [ghcBalance, setGhcBalance] = useState("0");
    const [mintAmount, setMintAmount] = useState("0");
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (paymentContract && ghcContract && userAddress) {
            refreshBalances();
        }
    }, [paymentContract, ghcContract, userAddress]);

    const refreshBalances = async () => {
        try {
            setLoading(true);
            console.log("Refreshing balances...");
            
            // Check if contracts are properly connected
            console.log("Payment contract:", paymentContract);
            console.log("GHC contract:", ghcContract);
            
            const mercBal = await paymentContract.balanceOf(userAddress);
            console.log("Raw MERC balance:", mercBal.toString());
            setMercBalance(ethers.formatUnits(mercBal, 18));

            const ghcBal = await ghcContract.balanceOf(userAddress);
            console.log("Raw GHC balance:", ghcBal.toString());
            setGhcBalance(ethers.formatUnits(ghcBal, 18));
            
        } catch (err) {
            console.error("Failed to fetch balances:", err);
            setError("Balance fetch failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const mintMerc = async () => {
        if (!paymentContract) {
            setError("Payment contract not connected");
            return;
        }
        try {
            setLoading(true);
            const amount = ethers.parseUnits(mintAmount || "0", 18);
            console.log("Minting MERC:", amount.toString());
            
            const tx = await paymentContract.mint(userAddress, amount);
            console.log("MERC mint transaction:", tx.hash);
            
            await tx.wait();
            console.log("MERC mint successful");
            
            refreshBalances();
            setError(null);
        } catch (err) {
            console.error("Mint MERC failed:", err);
            setError("Mint MERC failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const mintGHC = async () => {
        if (!ghcContract) {
            setError("GHC contract not connected");
            return;
        }
        try {
            setLoading(true);
            const amount = ethers.parseUnits(mintAmount || "0", 18);
            console.log("Minting GHC:", amount.toString());
            
            // FIX: Use the correct function name mintGHC instead of mint
            const tx = await ghcContract.mintGHC(amount);
            console.log("GHC mint transaction:", tx.hash);
            
            await tx.wait();
            console.log("GHC mint successful");
            
            refreshBalances();
            setError(null);
        } catch (err) {
            console.error("Mint GHC failed:", err);
            setError("Mint GHC failed: " + err.message);
            
            // Check if the function exists
            if (err.message.includes("mintGHC")) {
                setError("mintGHC function not found. Check contract ABI.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: "2rem" }}>
            <h1>Seller Dashboard (Minter)</h1>
            <p>Connected account: {userAddress || "Not connected"}</p>
            <p>MERC Balance: {mercBalance}</p>
            <p>GHC Balance: {ghcBalance}</p>

            {error && <p style={{ color: "red" }}>{error}</p>}
            {loading && <p>Loading...</p>}

            <div style={{ marginTop: "1rem" }}>
                <input
                    type="number"
                    placeholder="Amount to mint"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                />
                <button onClick={mintMerc} disabled={loading} style={{ marginLeft: "0.5rem" }}>
                    Mint MERC
                </button>
                <button onClick={mintGHC} disabled={loading} style={{ marginLeft: "0.5rem" }}>
                    Mint GHC
                </button>
            </div>

            <div style={{ marginTop: "1rem" }}>
                <button onClick={refreshBalances} disabled={loading}>
                    Refresh Balances
                </button>
            </div>

            {/* Debug info */}
            <div style={{ marginTop: "2rem", padding: "1rem", background: "#f0f0f0" }}>
                <h3>Debug Info:</h3>
                <p>GHC Contract: {ghcContract?.address}</p>
                <p>Payment Contract: {paymentContract?.address}</p>
                <button onClick={() => console.log("GHC Contract:", ghcContract)}>
                    Log GHC Contract
                </button>
                <button onClick={() => console.log("Payment Contract:", paymentContract)}>
                    Log Payment Contract
                </button>
            </div>
        </div>
    );
};

export default SellerDashboard;