import React from "react";
import { Link } from "react-router-dom";

const Landing = () => (
  <div
    style={{
      padding: "2rem",
      minHeight: "100vh",
      background: "linear-gradient(120deg,#f0fdf4 0%,#dbeafe 100%)",
    }}
  >
    <div
      style={{
        maxWidth: "700px",
        margin: "0 auto",
        background: "#fff",
        borderRadius: "18px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        padding: "3rem 2rem",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontSize: "2.5rem",
          fontWeight: "800",
          color: "#059669",
          marginBottom: "1rem",
        }}
      >
        H2Cred
      </h1>
      <h2
        style={{
          fontSize: "1.3rem",
          color: "#2563eb",
          fontWeight: "600",
          marginBottom: "2rem",
        }}
      >
        Blockchain Hydrogen Credits Platform
      </h2>
      <div
        style={{
          marginTop: "1rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "center",
          gap: "1.5rem",
        }}
      >
        <Link to="/login/buyer">
          <button
            style={{
              background: "linear-gradient(90deg,#2563eb,#3b82f6)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "1rem 2.5rem",
              fontWeight: "bold",
              fontSize: "1.1rem",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            }}
          >
            Buyer Login
          </button>
        </Link>
        <Link to="/login/seller">
          <button
            style={{
              background: "linear-gradient(90deg,#059669,#10b981)",
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              padding: "1rem 2.5rem",
              fontWeight: "bold",
              fontSize: "1.1rem",
              cursor: "pointer",
              boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
            }}
          >
            Seller Login
          </button>
        </Link>
      </div>
      <div style={{ color: "#444", marginBottom: "2rem" }}>
        <p>
          <strong>About the Project:</strong>
          <br />
          <b>H2Cred</b> is a blockchain-based platform...
        </p>
        <strong>What does it do?</strong>
        <ul
          style={{
            textAlign: "left",
            margin: "1rem auto",
            maxWidth: "500px",
            color: "#444",
            fontSize: "1rem",
          }}
        >
          <li>
            Enables sellers to generate and list hydrogen credits based on IoT
            sensor data and QA checks.
          </li>
          <li>
            Allows buyers to view available credits, purchase them, and convert
            credits to CSR certificates.
          </li>
          <li>
            Ensures transparency and traceability using blockchain technology.
          </li>
          <li>
            Supports secure login for buyers and sellers via blockchain wallets.
          </li>
        </ul>
      </div>

      <div
        style={{
          margin: "2rem 0",
          textAlign: "left",
          background: "#f0fdf4",
          borderRadius: "12px",
          padding: "1.5rem",
        }}
      >
        <strong>BitBurners</strong>
        <br />
        <strong>Team Members:</strong>
        <ul
          style={{
            marginTop: "1rem",
            color: "#059669",
            fontWeight: "bold",
            fontSize: "1.05rem",
          }}
        >
          <li>Veer Mehta</li>
          <li>Yash Bhansari</li>
        </ul>
      </div>
    </div>
  </div>
);

export default Landing;
