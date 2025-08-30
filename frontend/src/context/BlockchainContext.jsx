import React, { createContext, useState, useEffect } from "react";
import { getContracts } from "../services/contract";

export const BlockchainContext = createContext();

export const BlockchainProvider = ({ children }) => {
    const [userAddress, setUserAddress] = useState(null);
    const [ghcContract, setGhcContract] = useState(null);
    const [paymentContract, setPaymentContract] = useState(null);
    const [error, setError] = useState(null);

    const initContracts = async () => {
        try {
            const { ghcContract, paymentContract, userAddress } = await getContracts();
            setGhcContract(ghcContract);
            setPaymentContract(paymentContract);
            setUserAddress(userAddress);
            setError(null);
        } catch (err) {
            console.error("Failed to connect contracts:", err);
            setError(err.message);
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
            value={{ userAddress, ghcContract, paymentContract, error }}
        >
            {children}
        </BlockchainContext.Provider>
    );
};
