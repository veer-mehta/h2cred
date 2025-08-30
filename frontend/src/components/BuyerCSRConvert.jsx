import React, { useState } from 'react';

const BuyerCSRConvert = ({ credits, onConvert }) => {
  const [amount, setAmount] = useState(0);

  return (
    <div style={{ margin: '2rem auto', background: '#222', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', width:'50%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h3 style={{ color: '#059669', fontWeight: 'bold', fontSize: '1.7rem' }}>Convert Credits to CSR Certificate</h3>
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center' }}>
        <input
          type="number"
          min="1"
          max={credits}
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          placeholder="Credits to convert"
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #d1fae5', marginRight: '1rem', width: '120px', fontSize:'1.2rem' }}
        />
        <button style={{ background: 'linear-gradient(90deg,#059669,#10b981)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 'bold', cursor: 'pointer', fontSize:'1.2rem' }} onClick={() => onConvert(amount)} disabled={amount < 1 || amount > credits}>
          Convert
        </button>
      </div>
    </div>
  );
};

export default BuyerCSRConvert;
