import React, { useState } from 'react';

const SellerQAForm = ({ onCheck }) => {
  const [status, setStatus] = useState('pending');

  const handleQA = () => {
    setStatus('checking');
    setTimeout(() => {
      const passed = Math.random() > 0.15;
      setStatus(passed ? 'passed' : 'failed');
      if (onCheck) onCheck(passed);
    }, 2000);
  };

  return (
    <div style={{ margin: '2rem 0', background: '#38b47b', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <h3 style={{ color: '#181c19', fontWeight: 'bold', fontSize: '1.7rem' }}>QA Check</h3>
      <button style={{ background: '#181c19', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 18px', fontWeight: 'bold', cursor: 'pointer', marginBottom: '1rem', fontSize: '1.1rem' }} onClick={handleQA} disabled={status === 'checking'}>
        {status === 'checking' ? 'Checking...' : 'Run QA Check'}
      </button>
      <p style={{ color: status === 'passed' ? '#059669' : status === 'failed' ? '#ef4444' : '#eab308', fontWeight: 'bold', fontSize: '1.3rem' }}>Status: <b>{status}</b></p>
    </div>
  );
};

export default SellerQAForm;
