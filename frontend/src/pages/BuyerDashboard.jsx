import { useContext, useState, useEffect } from "react"
import { ethers } from "ethers"
import { BlockchainContext } from "../context/BlockchainContext"
import BuyerMarketplace from "../components/BuyerMarketplace"
import BuyerCSRConvert from "../components/BuyerCSRConvert"

const BuyerDashboard = () => {
	const { account, ghcContract, paymentTokenContract } =
		useContext(BlockchainContext)
	const [balance, setBalance] = useState("0")
	const [credits, setCredits] = useState(0)
	const [certificate, setCertificate] = useState(null)

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

	const handleBuy = (amount) => {
		setCredits((prev) => prev + amount)
	}

	const handleConvert = (amount) => {
		if (amount > 0 && amount <= credits) {
			setCredits((prev) => prev - amount)
			setCertificate({
				credits: amount,
				date: new Date().toLocaleDateString(),
			})
		}
	}

	return (
		<div className="page-root">
			<div className="page-container">
				<h1 className="page-title">Buyer Dashboard</h1>
				<p style={{color:'white', fontSize:'1.4rem'}}>Connected account: {account || "Not connected"}</p>
				<BuyerMarketplace onBuy={handleBuy} />
				<p className="buyer-credits">Your Credits: {credits}</p>
				<BuyerCSRConvert credits={credits} onConvert={handleConvert} />
				{certificate && (
					<div className="buyer-certificate">
						<strong className="buyer-certificate-title">CSR Certificate</strong>
						<br />
						<span>Credits: {certificate.credits}</span>
						<br />
						<span>Date: {certificate.date}</span>
					</div>
				)}
			</div>
		</div>
	)
}

export default BuyerDashboard
