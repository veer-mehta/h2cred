import React, { createContext, useState, useEffect } from "react";
import { getContracts } from "../services/contract";

export const BlockchainContext = createContext();

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
