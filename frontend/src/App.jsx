import { useState, useEffect, useRef } from 'react';
import './index.css';
import Navbar        from './components/Navbar';
import TabBar        from './components/TabBar';
import OverviewTab   from './components/OverviewTab';
import TransferTab   from './components/TransferTab';
import AdminTab      from './components/AdminTab';
import MarketplaceTab from './components/MarketplaceTab';
import ToastWidget   from './components/ToastWidget';
import WalletModal   from './components/WalletModal';
import { useWallet } from './hooks/useWallet';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [toast, setToast]         = useState({ status: null, message: '', txHash: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [accountName, setAccountName] = useState(null);

  const wallet = useWallet();
  const prevAccount = useRef(null);

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab === 'marketplace') {
      setActiveTab('marketplace');
    }
  }, []);

  // Resolve connected wallet to a registered company name
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

  const showToast = (status, message, txHash = '') =>
    setToast({ status, message, txHash });

  const clearToast = () =>
    setToast({ status: null, message: '', txHash: '' });

  // Close modal and toast on successful connection
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
      />

      {/* Wrong network banner */}
      {wallet.account && !wallet.isCorrectNetwork && (
        <div className="bg-[#1a0a00] border-b border-[#3a1a00] px-4 py-2.5 text-center">
          <p className="text-xs text-[#fbbf24]">
            ⚠️ You're on the wrong network. Please switch to <strong>Ethereum Sepolia</strong> in MetaMask.
          </p>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Page Header */}
        <div className="mb-7">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-[#e5e7eb] mb-0.5">
                Green Hydrogen Credit Dashboard
              </h1>
              <p className="text-sm text-[#4b5563]">
                Manage, transfer, and verify your GHC portfolio on Ethereum
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1a1a1a] bg-[#111111] text-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" />
                <span className="text-[#6b7280]">Ethereum Sepolia</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#1a1a1a] bg-[#111111] text-xs text-[#4b5563]">
                Contract&nbsp;
                <a
                  href={`https://sepolia.etherscan.io/address/${import.meta.env.VITE_CONTRACT_ADDRESS}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mono text-[#60a5fa] hover:underline"
                >
                  {`${import.meta.env.VITE_CONTRACT_ADDRESS?.slice(0, 6)}...${import.meta.env.VITE_CONTRACT_ADDRESS?.slice(-4)}`}
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && (
            <OverviewTab
              onToast={showToast}
              wallet={wallet}
              onConnectWallet={() => setModalOpen(true)}
            />
          )}
          {activeTab === 'transfer' && (
            <TransferTab
              onToast={showToast}
              wallet={wallet}
              onConnectWallet={() => setModalOpen(true)}
            />
          )}
          {activeTab === 'marketplace' && (
            <MarketplaceTab
              onToast={showToast}
              wallet={wallet}
              onConnectWallet={() => setModalOpen(true)}
            />
          )}
          {activeTab === 'admin' && (
            <AdminTab
              onToast={showToast}
              wallet={wallet}
              onConnectWallet={() => setModalOpen(true)}
            />
          )}
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
