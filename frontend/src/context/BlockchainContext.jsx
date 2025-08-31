import React, { createContext, useEffect, useState } from "react"
import { ethers } from "ethers"

export const BlockchainContext = createContext()

const GREEN_HYDROGEN_CONTRACT_ADDRESS =
	"0xFab90Bf54Ffc1e594174C1a4cf075498904FbFAf"
const PAYMENT_TOKEN_ADDRESS = "0xa1E0785c5b28D733CB0a0A98d7A8C1C836887bC1"

export const BlockchainProvider = ({ children }) => {
    const [userAddress, setUserAddress] = useState(null);
    const [ghcContract, setGhcContract] = useState(null);
    const [paymentContract, setPaymentContract] = useState(null);

    const initContracts = async () => {
        try {
            const { userAddress, ghcContract, paymentContract } = await getContracts();
            setUserAddress(userAddress);
            setGhcContract(ghcContract);
            setPaymentContract(paymentContract);
        } catch (err) {
            console.error("Failed to connect contracts:", err);
        }
    };

    useEffect(() => {
        initContracts();

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on("accountsChanged", () => initContracts());
        }
    }, []);

    return (
        <BlockchainContext.Provider
            value={{
                userAddress,
                ghcContract,
                paymentContract,
            }}
        >
            {children}
        </BlockchainContext.Provider>
    );
};
