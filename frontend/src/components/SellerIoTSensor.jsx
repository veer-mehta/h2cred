import React, { useState, useEffect } from 'react';

const SellerIoTSensor = ({ onProduction }) => {
  const [production, setProduction] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      const value = (Math.random() * 5 + 2).toFixed(2); // 2-7 kg/hr
      setProduction(value);
      if (onProduction) onProduction(Number(value));
    }, 3000);
    return () => clearInterval(interval);
  }, [onProduction]);

  return (
    <div style={{ margin: '2rem 0', background: '#e0f2fe', borderRadius: '12px', padding: '1rem', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
      <h3 style={{ color: '#0ea5e9', fontWeight: 'bold', fontSize: '1.2rem' }}>IoT H₂ Generation Sensor</h3>
      <p style={{ color: '#0369a1', fontWeight: 'bold', fontSize: '1.1rem' }}>Current Production: <b>{production} kg/hr</b></p>
    </div>
  );
};

export default SellerIoTSensor;
