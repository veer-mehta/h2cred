import React from 'react';

const PRICE_PER_CREDIT = 100;
const sellers = [
  { id: 1, name: 'GreenTech Solutions', credits: 150 },
  { id: 2, name: 'EcoHydrogen Ltd', credits: 200 },
  { id: 3, name: 'Clean Energy Co.', credits: 75 },
];

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  background: '#fff',
  borderRadius: '12px',
  overflow: 'hidden',
};
const thStyle = {
  background: '#f5f7fa',
  color: '#333',
  fontWeight: '600',
  padding: '14px',
  borderBottom: '1px solid #eaeaea',
};
const tdStyle = {
  padding: '12px',
  textAlign: 'center',
  borderBottom: '1px solid #f0f0f0',
};
const buyBtnStyle = {
  background: 'linear-gradient(90deg,#3b82f6,#06b6d4)',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  padding: '8px 18px',
  fontWeight: 'bold',
  cursor: 'pointer',
  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  transition: 'background 0.2s',
};


import { useState } from 'react';

const BuyerMarketplace = ({ onBuy }) => {
  const [buyAmounts, setBuyAmounts] = useState({});

  const handleAmountChange = (sellerId, value) => {
    setBuyAmounts(prev => ({ ...prev, [sellerId]: value }));
  };

  return (
    <div style={{ margin: '2rem 0', maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}>
      <h3 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '1.5rem', color: '#2563eb', textAlign: 'center' }}>Marketplace</h3>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Credits</th>
            <th style={thStyle}>Price/credit (INR)</th>
            <th style={thStyle}>Amount</th>
            <th style={thStyle}>Buy</th>
          </tr>
        </thead>
        <tbody>
          {sellers.map(seller => (
            <tr key={seller.id}>
              <td style={tdStyle}>{seller.name}</td>
              <td style={tdStyle}>{seller.credits}</td>
              <td style={tdStyle}>{PRICE_PER_CREDIT}</td>
              <td style={tdStyle}>
                <input
                  type="number"
                  min={1}
                  max={seller.credits}
                  value={buyAmounts[seller.id] || ''}
                  onChange={e => handleAmountChange(seller.id, e.target.value)}
                  style={{ width: '60px', padding: '4px', borderRadius: '6px', border: '1px solid #ddd' }}
                  placeholder="Qty"
                />
              </td>
              <td style={tdStyle}>
                <button
                  style={buyBtnStyle}
                  onClick={() => onBuy(seller, Number(buyAmounts[seller.id] || 1))}
                  disabled={!buyAmounts[seller.id] || buyAmounts[seller.id] < 1}
                >
                  Buy
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BuyerMarketplace;
