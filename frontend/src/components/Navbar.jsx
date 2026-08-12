import { useState, useRef, useEffect } from 'react';
import { Atom, Wallet, ChevronDown, Copy, ExternalLink, LogOut, Check, BarChart3, ArrowLeftRight, ShieldCheck, Store } from 'lucide-react';
import { NavLink } from 'react-router-dom';

const TABS = [
  { path: '/', label: 'Overview', icon: BarChart3 },
  { path: '/transfer', label: 'Transfer', icon: ArrowLeftRight },
  { path: '/marketplace', label: 'Marketplace', icon: Store },
  { path: '/admin', label: 'Admin', icon: ShieldCheck },
];

function truncate(addr) {
  return addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
}

export default function Navbar({ account, accountName, connecting, onOpenModal, onDisconnect, isAdmin }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropRef = useRef(null);
  const tabs = TABS.filter(t => t.path !== '/admin' || isAdmin);

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
    <header className="sticky top-0 z-50 border-b border-[#222222] bg-[#0e0e0e]">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">

        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#e5e7eb] flex items-center justify-center flex-shrink-0">
            <Atom className="w-4 h-4 text-[#0a0a0a]" strokeWidth={2.5} />
          </div>
          <span className="text-base font-semibold text-[#e5e7eb] tracking-tight">H2Cred</span>
        </div>

        <nav className="flex-1 flex justify-center h-full">
          <div className="flex items-center h-14">
            {tabs.map(({ path, label, icon: Icon }) => (
              <NavLink
                key={path}
                to={path}
                className={({ isActive }) => [
                  'flex items-center gap-2 px-4 h-full text-xs font-medium transition-colors relative whitespace-nowrap',
                  isActive
                    ? 'text-[#e5e7eb]'
                    : 'text-[#6b7280] hover:text-[#b0b7c0]',
                ].join(' ')}
              >
                {({ isActive }) => (
                  <>
                    <Icon className="w-3.5 h-3.5" />
                    {label}
                    {isActive && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e5e7eb]" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#222222] bg-[#161616] text-xs text-[#6b7280] mr-2">
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
                  <div className="px-4 py-3 border-b border-[#1a1a1a]">
                    {accountName && (
                      <p className="text-sm font-semibold text-[#e5e7eb] mb-1">{accountName}</p>
                    )}
                    <p className="text-[10px] text-[#374151] mb-0.5 uppercase tracking-widest">Connected</p>
                    <p className="mono text-xs text-[#6b7280]">{truncate(account)}</p>
                  </div>

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
