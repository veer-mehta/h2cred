import React, { createContext, useEffect, useState } from "react"
import { ethers } from "ethers"

export const BlockchainContext = createContext()

const GREEN_HYDROGEN_CONTRACT_ADDRESS =
	"0xFab90Bf54Ffc1e594174C1a4cf075498904FbFAf"
const PAYMENT_TOKEN_ADDRESS = "0xa1E0785c5b28D733CB0a0A98d7A8C1C836887bC1"

export const BlockchainProvider = ({ children }) => {
	const [provider, setProvider] = useState(null)
	const [signer, setSigner] = useState(null)
	const [account, setAccount] = useState(null)
	const [ghcContract, setGhcContract] = useState(null)
	const [paymentTokenContract, setPaymentTokenContract] = useState(null)

	// useEffect(() => {
	//     const init = async () => {
	//         if (window.ethereum) {
	//             // ethers v6: BrowserProvider
	//             const ethProvider = new ethers.BrowserProvider(window.ethereum)
	//             setProvider(ethProvider)
	//             // Do NOT request accounts automatically
	//             // Listen for account changes
	//             window.ethereum.on("accountsChanged", (accounts) => {
	//                 setAccount(accounts[0] || null)
	//             })
	//         } else {
	//             console.error("Please install MetaMask!")
	//         }
	//     }
	//     init()
	// }, [])

	return (
		<BlockchainContext.Provider
			value={{
				provider,
				signer,
				account,
				ghcContract,
				paymentTokenContract,
			}}
		>
			{children}
		</BlockchainContext.Provider>
	)
}
