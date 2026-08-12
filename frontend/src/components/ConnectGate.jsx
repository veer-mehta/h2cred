import { Wallet, AlertTriangle } from 'lucide-react';

const isMetaMask = typeof window !== 'undefined' && Boolean(window.ethereum?.isMetaMask);

export default function ConnectGate({ icon: Icon = Wallet, title, desc, onConnect, wallet }) {
  const handleConnect = () => {
    if (!isMetaMask) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    if (onConnect) onConnect();
    else if (wallet?.connect) wallet.connect();
  };

  const connecting = wallet?.connecting;
  const error = wallet?.error;

  return (
    <div className="card p-10 flex flex-col items-center text-center max-w-md mx-auto animate-slide-up">
      <div className="w-12 h-12 rounded-xl bg-[#0a0f1a] border border-[#0e162a] flex items-center justify-center mb-4">
        <Icon className="w-5 h-5 text-[#60a5fa]" />
      </div>
      <p className="text-base font-semibold text-[#e5e7eb] mb-1">{title}</p>
      <p className="text-sm text-[#4b5563] mb-6">{desc}</p>

      {(error || !isMetaMask) && (
        <div className="card-inner mb-4 p-3 flex items-center gap-2 border-[#2a1010] w-full text-left">
          <AlertTriangle className="w-3.5 h-3.5 text-[#f87171] flex-shrink-0" />
          <span className="text-xs text-[#f87171]">
            {!isMetaMask || error === 'no_wallet'
              ? 'No Web3 wallet extension detected. Click below to install MetaMask.'
              : error === 'rejected'
              ? 'Connection rejected in MetaMask. Please try again.'
              : 'Connection failed. Please try again.'}
          </span>
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={connecting}
        className="btn-primary flex items-center justify-center gap-2 px-6 py-3 text-sm w-full font-medium"
      >
        {connecting ? (
          <svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        ) : (
          <Wallet className="w-4 h-4" />
        )}
        {!isMetaMask || error === 'no_wallet'
          ? 'Install MetaMask Extension'
          : connecting
          ? 'Connecting to MetaMask...'
          : 'Connect MetaMask Wallet'}
      </button>
    </div>
  );
}
