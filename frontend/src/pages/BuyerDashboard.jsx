import { useContext, useState, useEffect } from "react"
import { ethers } from "ethers"
import { BlockchainContext } from "../context/BlockchainContext"

const BuyerDashboard = () => {
	const { account, ghcContract, paymentTokenContract } =
		useContext(BlockchainContext)
	const [balance, setBalance] = useState("0")

	// Load balance on account or contract change
	useEffect(() => {
		if (ghcContract && account) {
			updateBalance()
		}
	}, [ghcContract, account])

	const updateBalance = async () => {
		try {
			const bal = await ghcContract.balanceOf(account)
			setBalance(ethers.formatUnits(bal, 18))
		} catch (err) {
			console.error("Failed to fetch balance:", err)
		}
	}

	const buyToken = async () => {
		if (!ghcContract || !paymentTokenContract) return

		try {
			const tokenAmount = ethers.parseUnits("1", 18) // 1 token

			// Calculate cost in payment token
			const cost = await ghcContract.get_cost_for_tokens(tokenAmount)

			// Approve the GHC contract to spend stablecoins
			const approveTx = await paymentTokenContract.approve(
				ghcContract.target,
				cost
			)
			await approveTx.wait()

			// Buy tokens
			const buyTx = await ghcContract.buy_tokens(tokenAmount)
			await buyTx.wait()

			// Refresh balance
			updateBalance()
		} catch (err) {
			console.error("Buy token failed:", err)
		}
	}

	return (
		<div style={{ padding: "2rem" }}>
			<h1>Buyer Dashboard</h1>
			<p>Connected account: {account || "Not connected"}</p>
			<p>GHC Balance: {balance}</p>
			<button onClick={buyToken}>Buy 1 Token</button>
			<button onClick={updateBalance}>Refresh Balance</button>
		</div>
	)
}

export default BuyerDashboard
