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
    <div style={{ padding: '2rem', maxWidth: '700px', margin: '0 auto', background: 'linear-gradient(120deg,#e0fdf4 0%,#bbf7d0 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
        <button style={{ background: 'linear-gradient(90deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }} onClick={handleLogout}>Logout</button>
      </div>
      <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#059669', textAlign: 'center', marginBottom: '1rem' }}>Seller Dashboard</h2>
      <p style={{ textAlign: 'center', color: '#444', marginBottom: '2rem' }}>Generate credits, pass QA checks, transfer credits to buyers.</p>
      <div style={{ background: '#f0fdf4', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '2rem' }}>
        <SellerIoTSensor onProduction={handleProduction} />
        <p style={{ fontSize: '1.2rem', color: '#059669', fontWeight: 'bold', margin: '1rem 0' }}>Total Credits: {credits}</p>
        <SellerQAForm onCheck={handleQACheck} />
        <p style={{ fontWeight: 'bold', color: qaPassed ? '#059669' : '#ef4444', marginTop: '1rem' }}>QA Status: {qaPassed ? 'Passed' : 'Not Passed'}</p>
      </div>
    </div>
  );
};

export default SellerDashboard;
