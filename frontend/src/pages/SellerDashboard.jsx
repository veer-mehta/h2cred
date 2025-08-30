import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { disconnectWallet } from '../blockchain/disconnect';
import SellerIoTSensor from '../components/SellerIoTSensor';
import SellerQAForm from '../components/SellerQAForm';

const SellerDashboard = () => {
  const [credits, setCredits] = useState(0);
  const [qaPassed, setQAPassed] = useState(false);
  const navigate = useNavigate();

  const handleProduction = (amount) => {
    setCredits(prev => prev + Math.floor(amount));
  };

  const handleQACheck = (passed) => {
    setQAPassed(passed);
  };

  const handleLogout = async () => {
    await disconnectWallet();
    alert('For full security, please disconnect your wallet from Metamask manually.');
    navigate('/');
  };

  return (
    <div className="page-root">
      <div className="page-container seller-container">
        <div className="seller-header">
          <button className="page-btn" onClick={handleLogout}>Logout</button>
        </div>
        <h2 className="page-title">Seller Dashboard</h2>
        <p className="page-section">Generate credits, pass QA checks, transfer credits to buyers.</p>
        <div className="seller-content">
          <SellerIoTSensor onProduction={handleProduction} />
          <p className="seller-credits">Total Credits: {credits}</p>
          <SellerQAForm onCheck={handleQACheck} />
          <p className={qaPassed ? "seller-qa-passed" : "seller-qa-failed"}>QA Status: {qaPassed ? 'Passed' : 'Not Passed'}</p>
        </div>
      </div>
    </div>
  );
};

export default SellerDashboard;
