import { useContext, useState, useEffect } from "react"
import { ethers } from "ethers"
import { BlockchainContext } from "../context/BlockchainContext"

const BuyerDashboard = () => {
	const { userAddress, ghcContract, paymentContract } =
		useContext(BlockchainContext)
	const [balance, setBalance] = useState("0")

	useEffect(() => {
		if (ghcContract && userAddress) {
			updateBalance()
		}
	}, [ghcContract, userAddress])

	const updateBalance = async () => {
		try {
			console.log("Context values:", {
				userAddress,
				ghcContract,
				paymentContract,
			})
			const code = await ghcContract.runner.provider.getCode(paymentContract.target)
			console.log("Payment contract bytecode length:", code.length)
			const bal = await paymentContract.balanceOf(userAddress)
			setBalance(ethers.formatUnits(bal, 18))
		} catch (err) {
			console.error("Failed to fetch balance:", err)
		}
	}

	const buyToken = async () => {
		if (!ghcContract || !paymentContract) return

		try {
			const tokenAmount = ethers.parseUnits("1", 18)
			const cost = await ghcContract.get_cost_for_tokens(tokenAmount)

			const approveTx = await paymentContract.approve(
				ghcContract.target,
				cost
			)
			await approveTx.wait()

			const buyTx = await ghcContract.buy_tokens(tokenAmount)
			await buyTx.wait()

			updateBalance()
		} catch (err) {
			console.error("Buy token failed:", err)
		}
	}

	return (
		<div style={{ padding: "2rem" }}>
			<h1>Buyer Dashboard</h1>
			<p>Connected account: {userAddress || "Not connected"}</p>
			<p>GHC Balance: {balance}</p>
			<button onClick={buyToken}>Buy 1 Token</button>
			<button onClick={updateBalance}>Refresh Balance</button>
		</div>
	)
}

export default BuyerDashboard
