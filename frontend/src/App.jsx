import { useState, useEffect, useRef, useCallback } from 'react';
import './index.css';
import Navbar from './components/Navbar';
import OverviewTab from './components/OverviewTab';
import TransferTab from './components/TransferTab';
import AdminTab from './components/AdminTab';
import MarketplaceTab from './components/MarketplaceTab';
import ToastWidget from './components/ToastWidget';
import WalletModal from './components/WalletModal';
import { useWallet } from './hooks/useWallet';
import { Routes, Route, Navigate } from 'react-router-dom';

export default function App() {
  const [toast, setToast] = useState({ status: null, message: '', txHash: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [accountName, setAccountName] = useState(null);
  const wallet = useWallet();
  const prevAccount = useRef(null);


  // get map of connected wallet to a registered company name
  useEffect(() => {
    if (!wallet.account) { setAccountName(null); return; }
    (async () => {
      try {
        const res = await fetch('http://localhost:5000/api/registry');
        if (!res.ok) {
          throw new Error(`Registry request failed with ${res.status}`);
        }
        const data = await res.json();
        if (!Array.isArray(data)) {
          throw new Error('Registry response was not a list.');
        }
        const match = data.find(c => c.address.toLowerCase() === wallet.account.toLowerCase());
        setAccountName(match ? match.name : null);
      } catch (e) {
        console.error('Failed to resolve account name:', e);
        setAccountName(null);
      }
    })();
  }, [wallet.account]);


  const showToast = useCallback((status, message, txHash = '') => {
    setToast({ status, message, txHash });
  }, []);

  const clearToast = useCallback(() => {
    setToast({ status: null, message: '', txHash: '' });
  }, []);


  useEffect(() => {
    if (wallet.account && !prevAccount.current) {
      setModalOpen(false);
      showToast('confirmed', 'Wallet connected successfully.');
    }
    prevAccount.current = wallet.account;
  }, [wallet.account]);


  return (
    <div className="min-h-screen bg-[#0a0a0a]">

      <Navbar
        account={wallet.account}
        accountName={accountName}
        connecting={wallet.connecting}
        onOpenModal={() => setModalOpen(true)}
        onDisconnect={wallet.disconnect}
        isAdmin={wallet.hasMinterRole}
      />

      {wallet.account && !wallet.isCorrectNetwork && (
        <div className="bg-[#1a0a00] border-b border-[#3a1a00] px-4 py-2.5 text-center">
          <p className="text-xs text-[#fbbf24]">
            You're on the wrong network. Please switch to <strong>Ethereum Sepolia</strong>.
          </p>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div>
          <Routes>
            <Route path="/" element={<OverviewTab onToast={showToast} wallet={wallet} onConnectWallet={() => setModalOpen(true)} />} />
            <Route path="/transfer" element={<TransferTab onToast={showToast} wallet={wallet} onConnectWallet={() => setModalOpen(true)} />} />
            <Route path="/marketplace" element={<MarketplaceTab onToast={showToast} wallet={wallet} onConnectWallet={() => setModalOpen(true)} />} />
            <Route path="/admin" element={
              wallet.hasMinterRole ? (
                <AdminTab onToast={showToast} wallet={wallet} onConnectWallet={() => setModalOpen(true)} />
              ) : (
                <Navigate to="/" replace />
              )
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>

      <ToastWidget
        status={toast.status}
        message={toast.message}
        txHash={toast.txHash}
        onClose={clearToast}
      />

      {modalOpen && (
        <WalletModal
          connecting={wallet.connecting}
          error={wallet.error}
          onConnect={wallet.connect}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  );
}


