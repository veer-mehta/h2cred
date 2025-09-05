import { useState } from "react";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAppConfig } from "./context/configContext";

export default function App() {
  const { contractAddress, abi } = useAppConfig();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const [amount, setAmount] = useState("");
  const [hash, setHash] = useState(null);

  const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  const handleMint = async () => {
    try {
		console.log(abi)
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: "mint",
        args: [address, BigInt(amount)],
      });
      setHash(txHash);
    } catch (err) {
      console.error(err);
    }
  };

  const handleBurn = async () => {
    try {
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: "burn",
        args: [BigInt(amount)],
      });
      setHash(txHash);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <header style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2>Green Hydrogen Credit</h2>
        <ConnectButton />
      </header>

      {isConnected && (
        <>
          <input
            type="number"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button onClick={handleMint} disabled={!amount}>
            Mint
          </button>
          <button onClick={handleBurn} disabled={!amount}>
            Burn
          </button>
          {hash && <p>Tx sent: {hash}</p>}
          {isLoading && <p>Confirming...</p>}
          {isSuccess && <p>✅ Confirmed!</p>}
          {isError && <p>❌ Failed.</p>}
        </>
      )}
    </div>
  );
}
