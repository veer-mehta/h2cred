import { useParams, useNavigate } from "react-router-dom";
import React, { useState } from "react";

const Login = () => {
  const { userType } = useParams();
  const navigate = useNavigate();
  const [walletAddress, setWalletAddress] = useState("");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      const address = await connectWallet();
      if (address) {
        setWalletAddress(address);
        navigate(userType === "buyer" ? "/buyer" : "/seller");
      }
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="page-root">
      <div className="page-container2">
        <h2 className="page-title2" style={{marginBottom: "1.5rem"}}>
          {userType === "buyer" ? "Buyer" : "Seller"} Login
        </h2>
        <button
          className={userType === "buyer" ? "page-btn2" : "page-btn2 page-btn-alt2"}
          style={{marginBottom: "1.5rem"}}
          onClick={handleConnect}
          disabled={connecting}
        >
          {connecting ? "Connecting..." : "Connect Metamask Wallet"}
        </button>
        {walletAddress && (
          <p className="page-section-title" style={{fontWeight: "bold", marginTop: "1rem"}}>
            Connected: {walletAddress}
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
