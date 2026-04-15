import { useEffect, useState } from 'react';
import { CheckCircle2, Loader2, ExternalLink, X, AlertTriangle } from 'lucide-react';

export default function ToastWidget({ status, message, txHash, onClose }) {
  const [visible, setVisible] = useState(false);
  const [out, setOut] = useState(false);

  const dismiss = () => {
    setOut(true);
    setTimeout(() => { setVisible(false); onClose(); }, 300);
  };

  useEffect(() => {
    if (status) {
      setOut(false);
      setVisible(true);
      if (status === 'confirmed') {
        const t = setTimeout(dismiss, 5000);
        return () => clearTimeout(t);
      }
    }
  }, [status, message, txHash]);

  if (!visible || !status) return null;

  const isOk  = status === 'confirmed';
  const isBad = status === 'error';
  const isPrc = status === 'processing';

  return (
    <div
      className="fixed bottom-5 right-5 z-50 w-[340px]"
      style={{ animation: `${out ? 'slide-down' : 'slide-up'} 0.25s ease-out both` }}
    >
      <style>{`
        @keyframes slide-down { from{transform:translateY(0);opacity:1} to{transform:translateY(10px);opacity:0} }
      `}</style>

      <div
        className="card overflow-hidden"
        style={{
          borderColor: isOk ? '#0e2a0e' : isBad ? '#2a0e0e' : '#0e162a',
        }}
      >
        {/* Top line indicator */}
        <div className="h-px w-full" style={{ background: isOk ? '#4ade80' : isBad ? '#f87171' : '#60a5fa' }} />

        {/* Body */}
        <div className="p-4 flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {isPrc && <Loader2 className="w-4 h-4 text-[#60a5fa] animate-spin" />}
            {isOk  && <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />}
            {isBad && <AlertTriangle className="w-4 h-4 text-[#f87171]" />}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <span
                className="text-xs font-semibold uppercase tracking-widest"
                style={{ color: isOk ? '#4ade80' : isBad ? '#f87171' : '#60a5fa' }}
              >
                {isPrc ? 'Processing' : isOk ? 'Confirmed' : 'Failed'}
              </span>
              <button onClick={dismiss} className="flex-shrink-0 p-0.5 rounded hover:bg-[#1a1a1a] transition-colors">
                <X className="w-3.5 h-3.5 text-[#374151]" />
              </button>
            </div>
            <p className="text-sm text-[#9ca3af] leading-snug mb-2">{message}</p>
            {txHash && (
              <div className="flex items-center gap-2">
                <div className="flex-1 card-inner px-3 py-1.5 overflow-hidden">
                  <code className="mono text-xs text-[#60a5fa] whitespace-nowrap">{txHash.length > 20 ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : txHash}</code>
                </div>
                <a
                  href={`https://sepolia.etherscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 flex items-center gap-1 text-xs text-[#4b5563] hover:text-[#60a5fa] transition-colors"
                  title="View on Etherscan"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Progress bar for processing */}
        {isPrc && (
          <div className="h-0.5 w-full overflow-hidden bg-[#111111]">
            <div
              className="h-full w-1/2 bg-[#60a5fa]"
              style={{ animation: 'progress 1.8s ease-in-out infinite' }}
            />
          </div>
        )}
        <style>{`@keyframes progress{0%{transform:translateX(-100%)}100%{transform:translateX(300%)}}`}</style>
      </div>
    </div>
  );
}
