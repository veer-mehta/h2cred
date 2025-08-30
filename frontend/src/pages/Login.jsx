import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { connectWallet } from "../blockchain/wallet";

const Login = () => {
  const { userType } = useParams();
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState("");

  const handleConnect = async () => {
    const address = await connectWallet();
    if (address) {
      setWalletAddress(address);
      navigate(userType === "buyer" ? "/buyer" : "/seller");
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        minHeight: "100vh",
        background: "linear-gradient(120deg,#f0fdf4 0%,#dbeafe 100%)",
      }}
    >
      <div
        style={{
          maxWidth: "400px",
          margin: "0 auto",
          background: "#fff",
          borderRadius: "18px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
          padding: "2.5rem 2rem",
          textAlign: "center",
        }}
      >
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: "700",
            color: userType === "buyer" ? "#2563eb" : "#059669",
            marginBottom: "1.5rem",
          }}
        >
          {userType === "buyer" ? "Buyer" : "Seller"} Login
        </h2>
        <button
          style={{
            background:
              userType === "buyer"
                ? "linear-gradient(90deg,#2563eb,#3b82f6)"
                : "linear-gradient(90deg,#059669,#10b981)",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "1rem 2rem",
            fontWeight: "bold",
            fontSize: "1.1rem",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            marginBottom: "1.5rem",
          }}
          onClick={handleConnect}
        >
          Connect Metamask Wallet
        </button>
        {walletAddress && (
          <p
            style={{ color: "#059669", fontWeight: "bold", marginTop: "1rem" }}
          >
            Connected: {walletAddress}
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
