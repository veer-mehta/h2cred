import { useState, useRef, useEffect } from 'react';
import { Atom, Wallet, ChevronDown, Copy, ExternalLink, LogOut, Check } from 'lucide-react';

function truncate(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
}

export default function Navbar({ account, accountName, connecting, onOpenModal, onDisconnect }) {
  const [open, setOpen]     = useState(false);
  const [copied, setCopied] = useState(false);
  const dropRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-[#1a1a1a] bg-[#0a0a0a]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#e5e7eb] flex items-center justify-center flex-shrink-0">
            <Atom className="w-4 h-4 text-[#0a0a0a]" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-[#e5e7eb] tracking-tight">H2Cred</span>
          <span className="text-[10px] font-medium text-[#374151] border border-[#1c1c1c] rounded px-1.5 py-0.5 ml-1">
            TESTNET
          </span>
        </div>

        {/* Nav links */}
        <nav className="hidden md:flex items-center gap-5">
          {['Markets', 'Docs', 'Protocol'].map(l => (
            <button key={l} className="text-xs font-medium text-[#4b5563] hover:text-[#9ca3af] transition-colors">
              {l}
            </button>
          ))}
        </nav>

        {/* Wallet actions */}
        <div className="flex items-center gap-2">
          {account ? (
            <div className="relative" ref={dropRef}>
              <button
                onClick={() => setOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-[#1c1c1c] bg-[#111111] text-xs text-[#9ca3af] hover:border-[#2a2a2a] transition-all"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80] flex-shrink-0" />
                <span className={accountName ? 'text-[#e5e7eb] font-medium' : 'mono'}>{accountName || truncate(account)}</span>
                <ChevronDown className={`w-3 h-3 text-[#374151] transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
              </button>

              {open && (
                <div className="absolute right-0 mt-2 w-52 card border border-[#1c1c1c] shadow-2xl animate-slide-up">
                  {/* Address strip */}
                  <div className="px-4 py-3 border-b border-[#1a1a1a]">
                    {accountName && (
                      <p className="text-sm font-semibold text-[#e5e7eb] mb-1">{accountName}</p>
                    )}
                    <p className="text-[10px] text-[#374151] mb-0.5 uppercase tracking-widest">Connected</p>
                    <p className="mono text-xs text-[#6b7280]">{truncate(account)}</p>
                  </div>

                  {/* Actions */}
                  <div className="p-1">
                    <button
                      onClick={copy}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#111111] transition-colors"
                    >
                      {copied
                        ? <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                        : <Copy className="w-3.5 h-3.5" />}
                      {copied ? 'Copied!' : 'Copy address'}
                    </button>

                    <a
                      href={`https://sepolia.etherscan.io/address/${account}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md text-[#6b7280] hover:text-[#9ca3af] hover:bg-[#111111] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View on Etherscan
                    </a>

                    <hr className="border-[#1a1a1a] my-1" />

                    <button
                      onClick={() => { onDisconnect(); setOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs rounded-md text-[#f87171] hover:bg-[#1a0a0a] transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Disconnect
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenModal}
              disabled={connecting}
              className="btn-primary flex items-center gap-1.5 px-4 py-2 text-xs"
            >
              <Wallet className="w-3.5 h-3.5" />
              {connecting ? 'Connecting...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
