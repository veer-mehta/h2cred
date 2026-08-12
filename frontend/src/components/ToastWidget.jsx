import React from 'react';
import toast, { Toaster } from 'react-hot-toast';
import { CheckCircle2, AlertTriangle, Loader2, ExternalLink, X } from 'lucide-react';

export function ToastWidget() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{ duration: 4000 }}
    />
  );
}

export const notify = {
  success: (msg, txHash) => showToast('confirmed', msg, txHash),
  error: (msg) => showToast('error', msg),
  loading: (msg) => showToast('processing', msg),
};

function showToast(type, message, txHash) {
  const isOk = type === 'confirmed';
  const isBad = type === 'error';
  const isPrc = type === 'processing';

  return toast.custom(
    (t) => (
      <div
        className={`w-[340px] card overflow-hidden transition-all duration-200 ${
          t.visible ? 'animate-slide-up' : 'opacity-0 translate-y-2'
        }`}
        style={{
          borderColor: isOk ? '#0e2a0e' : isBad ? '#2a0e0e' : '#0e162a',
        }}
      >
        <div
          className="h-px w-full"
          style={{ background: isOk ? '#4ade80' : isBad ? '#f87171' : '#60a5fa' }}
        />

        <div className="p-4 flex gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {isPrc && <Loader2 className="w-4 h-4 text-[#60a5fa] animate-spin" />}
            {isOk && <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />}
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
              <button
                onClick={() => toast.dismiss(t.id)}
                className="flex-shrink-0 p-0.5 rounded hover:bg-[#1a1a1a] transition-colors"
              >
                <X className="w-3.5 h-3.5 text-[#374151]" />
              </button>
            </div>

            <p className="text-sm text-[#9ca3af] leading-snug mb-2">{message}</p>

            {txHash && (
              <div className="flex items-center gap-2">
                <div className="flex-1 card-inner px-3 py-1.5 overflow-hidden">
                  <code className="mono text-xs text-[#60a5fa] whitespace-nowrap">
                    {txHash.length > 20 ? `${txHash.slice(0, 10)}...${txHash.slice(-8)}` : txHash}
                  </code>
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
      </div>
    ),
    { id: isPrc ? 'processing-toast' : undefined, duration: isPrc ? Infinity : 4000 }
  );
}

export default ToastWidget;
