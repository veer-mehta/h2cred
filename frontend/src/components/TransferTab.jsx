import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Send, Wallet, Building2, Info, ArrowRight, Search } from 'lucide-react';
import { GHC_ABI, CONTRACT_ADDRESS, toOnChain } from '../lib/contract';

import { useMarketplace } from '../hooks/useMarketplace';

function ConnectGate({ onConnect }) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-[#0a0f1a] border border-[#0e162a] flex items-center justify-center mb-4">
          <Wallet className="w-5 h-5 text-[#60a5fa]" />
        </div>
        <p className="text-base font-semibold text-[#e5e7eb] mb-1">Wallet Required</p>
        <p className="text-sm text-[#4b5563] mb-6">Connect your wallet to transfer GHC credits on-chain.</p>
        <button onClick={onConnect} className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm">
          <Wallet className="w-4 h-4" /> Connect Wallet
        </button>
      </div>
    </div>
  );
}

export default function TransferTab({ onToast, wallet, onConnectWallet }) {
  const [mode, setMode]         = useState('wallet');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [resolved, setResolved] = useState(null);
  const [registry, setRegistry] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Compute top 5 matching companies for autocomplete
  const suggestions = mode === 'company' && recipient.length > 0
    ? registry.filter(c => c.name.toLowerCase().includes(recipient.toLowerCase())).slice(0, 5)
    : [];

  // Fetch registry from database
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('http://localhost:5000/api/registry');
        const data = await res.json();
        setRegistry(data);
      } catch (e) {
        console.error("Failed to load registry:", e);
      }
    })();
  }, [mode]);

  const { account, ghcBalance, fetchBalance } = wallet;

  if (!account) return <ConnectGate onConnect={onConnectWallet} />;

  const handleRecipientChange = (v) => {
    setRecipient(v);
    if (mode === 'company') {
      setShowSuggestions(v.length > 0);
      const match = registry.find(c => c.name.toLowerCase() === v.toLowerCase());
      setResolved(match ? { address: match.address, balance: null } : null);
    } else {
      setShowSuggestions(false);
      setResolved(v.startsWith('0x') && v.length >= 10 ? { address: v, balance: null } : null);
    }
  };

  const selectCompany = (company) => {
    setRecipient(company.name);
    setResolved({ address: company.address, balance: null });
    setShowSuggestions(false);
  };

  const getToAddress = () =>
    mode === 'company' && resolved ? resolved.address : recipient;

  const handleTransfer = async () => {
    if (!recipient || !amount || parseInt(amount) < 1) return;
    const toAddr = getToAddress();
    if (!ethers.isAddress(toAddr)) {
      onToast('error', 'Invalid recipient address.');
      return;
    }
    setLoading(true);
    onToast('processing', `Transferring ${amount} GHC…`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer);
      const tx       = await contract.transfer(toAddr, toOnChain(amount));
      onToast('processing', `Transferring ${amount} GHC…`, tx.hash);
      await tx.wait();
      onToast('confirmed', `${amount} GHC sent`, tx.hash);
      setRecipient(''); setAmount(''); setResolved(null);
      fetchBalance(account);
    } catch (e) {
      if (e.code === 4001) {
        onToast('error', 'Transaction rejected.');
      } else {
        onToast('error', e.reason ?? 'Transfer failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-7">
        <div className="flex items-center gap-2.5 mb-7">
          <div className="w-8 h-8 rounded-lg bg-[#0a0f1a] border border-[#0e162a] flex items-center justify-center">
            <Send className="w-4 h-4 text-[#60a5fa]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e5e7eb]">Transfer GHC Credits</p>
            <p className="text-xs text-[#4b5563]">Send credits to another entity on-chain</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="mb-5">
          <label className="field-label">Recipient type</label>
          <div className="flex gap-1 p-1 rounded-lg bg-[#0d0d0d] border border-[#1a1a1a]">
            {[
              { id: 'wallet',  label: 'Wallet Address', icon: Wallet },
              { id: 'company', label: 'Company Name',   icon: Building2 },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setMode(id); setRecipient(''); setResolved(null); }}
                className={[
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-md transition-all',
                  mode === id
                    ? 'bg-[#1c1c1c] text-[#e5e7eb] border border-[#2a2a2a]'
                    : 'text-[#4b5563] hover:text-[#9ca3af]',
                ].join(' ')}
              >
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient input */}
        <div className="mb-4 relative">
          <label className="field-label">Recipient</label>
          <div className="relative">
            <input
              className="input-field"
              placeholder={mode === 'wallet' ? '0x1a2b3c4d5e6f…' : 'Search company name…'}
              value={recipient}
              onChange={e => handleRecipientChange(e.target.value)}
              onFocus={() => mode === 'company' && recipient.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            />
            {mode === 'company' && recipient.length > 0 && !resolved && (
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4b5563]" />
            )}
          </div>
          {/* Autocomplete dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] shadow-lg overflow-hidden animate-slide-up">
              {suggestions.map((company) => (
                <button
                  key={company.id}
                  onMouseDown={() => selectCompany(company)}
                  className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-[#1c1c1c] transition-colors border-b border-[#141414] last:border-b-0"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-[#0a0f1a] border border-[#0e162a] flex items-center justify-center">
                      <Building2 className="w-3 h-3 text-[#60a5fa]" />
                    </div>
                    <span className="text-sm text-[#e5e7eb] font-medium">{company.name}</span>
                  </div>
                  <span className="mono text-[10px] text-[#374151]">{company.address.slice(0, 6)}…{company.address.slice(-4)}</span>
                </button>
              ))}
            </div>
          )}
          {showSuggestions && suggestions.length === 0 && recipient.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] shadow-lg p-4 text-center animate-slide-up">
              <p className="text-xs text-[#4b5563]">No companies found matching "{recipient}"</p>
            </div>
          )}
          {mode === 'company' && (
            <p className="flex items-center gap-1.5 text-xs text-[#374151] mt-1.5">
              <Info className="w-3 h-3" /> Resolved via company directory
            </p>
          )}
        </div>

        {/* Resolved badge */}
        {resolved && (
          <div className="mb-4 card-inner p-4 flex items-center justify-between animate-slide-up">
            <div>
              <span className="badge badge-green mb-1.5 inline-flex">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" /> Resolved
              </span>
              <p className="mono text-xs text-[#4b5563]">
                {resolved.address.length > 20 ? `${resolved.address.slice(0, 10)}...${resolved.address.slice(-8)}` : resolved.address}
              </p>
            </div>
            {resolved.balance !== null && (
              <div className="text-right">
                <p className="field-label">Balance</p>
                <p className="mono text-sm font-semibold text-[#e5e7eb]">{resolved.balance.toLocaleString()} <span className="text-[#374151]">GHC</span></p>
              </div>
            )}
          </div>
        )}

        {/* Amount */}
        <div className="mb-6">
          <label className="field-label">Amount</label>
          <div className="relative">
            <input
              type="number"
              min="1"
              step="1"
              className="input-field pr-20"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
            <button
              onClick={() => ghcBalance !== null && setAmount(String(Math.floor(ghcBalance)))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#60a5fa] bg-[#0a0f1a] border border-[#0e162a] px-2 py-1 rounded transition-colors hover:bg-[#0e162a]"
            >
              MAX
            </button>
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#374151]">
            <span>Available: <span className="text-[#6b7280]">{ghcBalance !== null ? ghcBalance.toLocaleString() : '…'} GHC</span></span>
            {amount && <span>≈ <span className="text-[#6b7280]">${(parseInt(amount) * 3.10).toFixed(2)}</span></span>}
          </div>
        </div>

        {/* Summary */}
        {recipient && amount && (
          <div className="mb-5 card-inner p-4 space-y-2 animate-slide-up">
            {[
              ['You send',   `${amount} GHC`],
              ['Gas (est.)', '~$0.38'],
              ['Network',    'Sepolia'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-[#4b5563]">{k}</span>
                <span className="mono text-[#9ca3af] font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <button
          onClick={handleTransfer}
          disabled={loading || !recipient || !(parseInt(amount) > 0)}
          className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2"
        >
          {loading
            ? <><svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>Processing…</>
            : <><Send className="w-4 h-4" />Submit Transfer<ArrowRight className="w-3.5 h-3.5" /></>}
        </button>
      </div>
    </div>
  );
}
