import { X, AlertTriangle, ExternalLink } from 'lucide-react';

const isMetaMask = typeof window !== 'undefined' && Boolean(window.ethereum?.isMetaMask);

export default function WalletModal({ connecting, error, onConnect, onClose }) {
  const handleMetaMask = () => {
    if (!isMetaMask) {
      window.open('https://metamask.io/download/', '_blank');
      return;
    }
    onConnect();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="card w-full max-w-sm p-6 animate-slide-up pointer-events-auto">

          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <p className="text-base font-semibold text-[#e5e7eb]">Connect Wallet</p>
              <p className="text-xs text-[#4b5563] mt-0.5">Connect to the Ethereum Sepolia testnet</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors text-[#374151] hover:text-[#9ca3af]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Error banners */}
          {error === 'rejected' && (
            <div className="card-inner mb-4 p-3 flex items-center gap-2 border-[#2a1010]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#f87171] flex-shrink-0" />
              <span className="text-xs text-[#f87171]">Connection rejected. Please try again.</span>
            </div>
          )}
          {error === 'failed' && (
            <div className="card-inner mb-4 p-3 flex items-center gap-2 border-[#2a1010]">
              <AlertTriangle className="w-3.5 h-3.5 text-[#f87171] flex-shrink-0" />
              <span className="text-xs text-[#f87171]">Connection failed. Please try again.</span>
            </div>
          )}

          {/* MetaMask option */}
          <button
            onClick={handleMetaMask}
            disabled={connecting}
            className="w-full flex items-center justify-between p-4 rounded-xl border border-[#1c1c1c] bg-[#0d0d0d] hover:border-[#2a2a2a] hover:bg-[#111111] transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ff6b00]/10 border border-[#ff6b00]/20 flex items-center justify-center text-xl select-none">
                🦊
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-[#e5e7eb]">MetaMask</p>
                <p className="text-xs text-[#4b5563]">
                  {isMetaMask ? 'Detected — click to connect' : 'Not installed — click to install'}
                </p>
              </div>
            </div>

            {connecting ? (
              <svg className="w-4 h-4 animate-spin-slow text-[#6b7280]" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            ) : (
              <ExternalLink className="w-3.5 h-3.5 text-[#2a2a2a] group-hover:text-[#4b5563] transition-colors" />
            )}
          </button>

          {/* Footer */}
          <p className="text-[11px] text-[#374151] text-center mt-5 leading-relaxed">
            By connecting you agree to interact with the H2Cred protocol on the Sepolia testnet. No real funds involved.
          </p>
        </div>
      </div>
    </>
  );
}
