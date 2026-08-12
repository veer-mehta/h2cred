import { useState, useEffect, useRef } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import OverviewTab from './components/OverviewTab';
import TransferTab from './components/TransferTab';
import AdminTab from './components/AdminTab';
import MarketplaceTab from './components/MarketplaceTab';
import ToastWidget, { notify } from './components/ToastWidget';
import { useWallet } from './hooks/useWallet';
import { Routes, Route, Navigate } from 'react-router-dom';

export default function App() {
  const [accountName, setAccountName] = useState(null);
  const wallet = useWallet();
  const prevAccount = useRef(null);

  useEffect(() => {
    if (!wallet.account) { setAccountName(null); return; }
    fetch('http://localhost:5000/api/registry')
      .then(r => r.json())
      .then(data => {
        const match = Array.isArray(data) && data.find(c => c.address.toLowerCase() === wallet.account.toLowerCase());
        setAccountName(match ? match.name : null);
      })
      .catch(() => setAccountName(null));
  }, [wallet.account]);

  useEffect(() => {
    if (wallet.account && !prevAccount.current) { notify.success('Wallet connected successfully.'); }
    prevAccount.current = wallet.account;
  }, [wallet.account]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar account={wallet.account} accountName={accountName} connecting={wallet.connecting} onOpenModal={wallet.connect} onDisconnect={wallet.disconnect} isAdmin={wallet.hasMinterRole} />

      {wallet.account && !wallet.isCorrectNetwork && (
        <div className="bg-[#1a0a00] border-b border-[#3a1a00] px-4 py-2.5 text-center">
          <p className="text-xs text-[#fbbf24]">You're on the wrong network. Please switch to <strong>Ethereum Sepolia</strong>.</p>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <Routes>
          <Route path="/" element={<OverviewTab wallet={wallet} onConnectWallet={wallet.connect} />} />
          <Route path="/transfer" element={<TransferTab wallet={wallet} onConnectWallet={wallet.connect} />} />
          <Route path="/marketplace" element={<MarketplaceTab wallet={wallet} onConnectWallet={wallet.connect} />} />
          <Route path="/admin" element={wallet.hasMinterRole ? <AdminTab wallet={wallet} onConnectWallet={wallet.connect} /> : <Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      <ToastWidget />
    </div>
  );
}
