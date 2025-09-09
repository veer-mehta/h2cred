import { useState } from "react"
import {
  useAccount,
  useWriteContract,
  useWaitForTransactionReceipt,
  useReadContract,
} from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { useAppConfig } from "./context/configContext"

export default function App() {
  const { contractAddress, abi } = useAppConfig()
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()

  const [amount, setAmount] = useState("")
  const [hash, setHash] = useState(null)

  const { isLoading, isSuccess, isError } = useWaitForTransactionReceipt({
    hash,
  })

  // ✅ Call the hook directly (not inside useEffect)
  const { data: balance, refetch } = useReadContract({
    address: contractAddress,
    abi,
    functionName: "balanceOf",
    args: [address],
    query: { enabled: !!address }, // only run if address exists
  })

  const handleMint = async () => {
    try {
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: "mint",
        args: [address, BigInt(amount)],
      })
      setHash(txHash)
      refetch() // refresh balance
    } catch (err) {
      console.error(err)
    }
  }

  const handleBurn = async () => {
    try {
      const txHash = await writeContractAsync({
        address: contractAddress,
        abi,
        functionName: "burn",
        args: [BigInt(amount)],
      })
      setHash(txHash)
      refetch() // refresh balance
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-white to-green-200 flex flex-col items-center py-10">
      {/* Header */}
      <header className="w-full max-w-3xl flex justify-between items-center px-6 py-4 bg-white shadow-md rounded-2xl mb-8">
        <h2 className="text-xl font-bold text-green-700">
          🌱 Green Hydrogen Credit
        </h2>
        <ConnectButton />
      </header>

      {isConnected ? (
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6 flex flex-col gap-6">
          {/* Balance */}
          <div className="text-center">
            <h3 className="text-lg font-semibold text-gray-700">Your Balance</h3>
            <p className="text-3xl font-bold text-green-600 mt-2">
              {balance ? Number(balance) : 0}
            </p>
          </div>

          {/* Input */}
          <input
            type="number"
            placeholder="Enter amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none text-center"
          />

          {/* Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleMint}
              disabled={!amount}
              className="px-6 py-2 rounded-lg bg-green-600 text-white font-semibold shadow hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Mint
            </button>
            <button
              onClick={handleBurn}
              disabled={!amount}
              className="px-6 py-2 rounded-lg bg-red-500 text-white font-semibold shadow hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Burn
            </button>
          </div>

          {/* Transaction status */}
          <div className="text-center text-sm">
            {hash && (
              <p className="text-gray-500 truncate">
                Tx sent:{" "}
                <span className="text-blue-600 font-mono">{hash}</span>
              </p>
            )}
            {isLoading && <p className="text-yellow-600">⏳ Confirming...</p>}
            {isSuccess && <p className="text-green-600">✅ Confirmed!</p>}
            {isError && <p className="text-red-600">❌ Failed.</p>}
          </div>
        </div>
      ) : (
        <p className="text-gray-600 text-lg">Please connect your wallet.</p>
      )}
    </div>
  )
}
