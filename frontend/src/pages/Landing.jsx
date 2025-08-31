import React from "react";
import { Link } from "react-router-dom";

const Landing = () => (
  <div className="page-root">
    <div className="page-container">
      <h1 className="page-title">H2Cred</h1>
      <h2 className="page-subtitle">Blockchain Hydrogen Credits Platform</h2>
      <div className="page-buttons">
        <Link to="/login/buyer">
          <button className="page-btn">Buyer Login</button>
        </Link>
        <Link to="/login/seller">
          <button className="page-btn page-btn-alt">Seller Login</button>
        </Link>
      </div><br />
      <div className="page-section">
        <div style={{marginBottom: "0.7rem"}}>
          <strong className="page-section-title">About the Project:</strong><br /><br />
          <b>H2Cred</b> is a blockchain-based platform for hydrogen credits.
        </div><br /><br /><br />
        <strong className="page-section-title">What does it do?</strong>
        <ul className="page-list">
          <li>Generate and list hydrogen credits from IoT sensor data and QA checks.</li>
          <li>Buyers can view, purchase, and convert credits to CSR certificates.</li>
          <li>Transparency and traceability via blockchain.</li>
          <li>Secure login for buyers and sellers.</li>
        </ul>
      </div>
      <div className="page-team">
        <strong className="page-team-title">Team: BitBurners</strong><br /><br />
        <strong style={{color: "#b6e2c3"}}>Team Members:</strong>
        <ul className="page-team-members">
          <li>Veer Mehta</li>
          <li>Yash Bhansari</li>
        </ul>
      </div>
    </div>
  </div>
);

export default Landing;
