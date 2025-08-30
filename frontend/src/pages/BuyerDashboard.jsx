import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { disconnectWallet } from '../blockchain/disconnect';
import { getMyCredits, buyCredits } from '../blockchain/hydrogenCredit';
import BuyerMarketplace from '../components/BuyerMarketplace';
import BuyerCSRConvert from '../components/BuyerCSRConvert';

const BuyerDashboard = () => {
  const [credits, setCredits] = useState(0);
  const [certificates, setCertificates] = useState([]);
  const navigate = useNavigate();

  const handleBuy = async (seller, amount = 10) => {
    try {
      // For demo, assume 0.01 ETH per credit. Adjust as needed.
      const valueEth = (0.01 * amount).toString();
      const tx = await buyCredits(amount, valueEth);
      await tx.wait();
      alert('Credits purchased successfully!');
      fetchCredits();
    } catch (err) {
      alert('Purchase failed: ' + err.message);
    }
  };

  const handleConvert = (amount) => {
    if (amount > 0 && amount <= credits) {
      setCredits(prev => prev - amount);
      setCertificates(prev => [...prev, { credits: amount, date: new Date().toLocaleDateString() }]);
      // TODO: Add blockchain logic for CSR conversion if needed
    }
  };
  useEffect(() => {
    fetchCredits();
    // eslint-disable-next-line
  }, []);

  async function fetchCredits() {
    try {
      const result = await getMyCredits();
      setCredits(Number(result));
    } catch (err) {
      setCredits(0);
    }
  }

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
      <h2 style={{ fontSize: '2rem', fontWeight: '700', color: '#059669', textAlign: 'center', marginBottom: '1rem' }}>Buyer Dashboard</h2>
      <p style={{ textAlign: 'center', color: '#444', marginBottom: '2rem' }}>Browse and buy hydrogen credits. Convert credits to CSR certificates.</p>
      <div style={{ background: '#f0fdf4', borderRadius: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: '2rem' }}>
        <BuyerMarketplace onBuy={handleBuy} />
        <p style={{ fontSize: '1.2rem', color: '#059669', fontWeight: 'bold', margin: '1rem 0' }}>Your Credits: {credits}</p>
        <BuyerCSRConvert credits={credits} onConvert={handleConvert} />
        <div style={{ marginTop: '2rem' }}>
          <h4 style={{ fontWeight: 'bold', color: '#059669', marginBottom: '0.5rem' }}>CSR Certificates:</h4>
          <ul style={{ paddingLeft: '1rem', color: '#444' }}>
            {certificates.map((cert, idx) => (
              <li key={idx} style={{ marginBottom: '0.5rem', background: '#bbf7d0', borderRadius: '8px', padding: '0.5rem 1rem' }}>Converted {cert.credits} credits on {cert.date}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BuyerDashboard;
