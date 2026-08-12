import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { notify } from './ToastWidget';
import { Send, Wallet, Building2, Info, ArrowRight, Search } from 'lucide-react';
import { GHC_ABI, CONTRACT_ADDRESS, toOnChain } from '../contract';
import ConnectGate from './ConnectGate';

export default function TransferTab({ wallet, onConnectWallet }) {
  const [mode, setMode] = useState('wallet');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [resolved, setResolved] = useState(null);
  const [registry, setRegistry] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { account, ghcBalance, fetchBalance } = wallet;

  useEffect(() => {
    fetch('http://localhost:5000/api/registry')
      .then(r => r.json()).then(setRegistry)
      .catch(e => console.error("Failed to load registry:", e));
  }, []);

  if (!account) return <ConnectGate icon={Wallet} title="Wallet Required" desc="Connect your wallet to transfer GHC credits on-chain." onConnect={onConnectWallet} wallet={wallet} />;

  const suggestions = mode === 'company' && recipient.length > 0
    ? registry.filter(c => c.name.toLowerCase().includes(recipient.toLowerCase())).slice(0, 5)
    : [];

  const handleRecipientChange = (v) => {
    setRecipient(v);
    if (mode === 'company') {
      setShowSuggestions(v.length > 0);
      const match = registry.find(c => c.name.toLowerCase() === v.toLowerCase());
      setResolved(match ? { address: match.address } : null);
    } else {
      setShowSuggestions(false);
      setResolved(v.startsWith('0x') && v.length >= 10 ? { address: v } : null);
    }
  };

  const handleTransfer = async () => {
    const toAddr = mode === 'company' && resolved ? resolved.address : recipient;
    if (!ethers.isAddress(toAddr)) return notify.error('Invalid recipient address.');
    setLoading(true);
    const tId = notify.loading(`Transferring ${amount} GHC…`);
    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const tx = await new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer).transfer(toAddr, toOnChain(amount));
      notify.loading(`Confirming ${amount} GHC transfer…`, { id: tId });
      await tx.wait();
      notify.success(`${amount} GHC sent successfully!`, { id: tId });
      setRecipient(''); setAmount(''); setResolved(null);
      fetchBalance(account);
    } catch (e) {
      notify.error(e.code === 4001 ? 'Transaction rejected.' : e.reason ?? 'Transfer failed.', { id: tId });
    } finally { setLoading(false); }
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
            {[{ id: 'wallet', label: 'Wallet Address', icon: Wallet }, { id: 'company', label: 'Company Name', icon: Building2 }].map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setMode(id); setRecipient(''); setResolved(null); }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-medium rounded-md transition-all ${mode === id ? 'bg-[#1c1c1c] text-[#e5e7eb] border border-[#2a2a2a]' : 'text-[#4b5563] hover:text-[#9ca3af]'}`}>
                <Icon className="w-3.5 h-3.5" /> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Recipient input with autocomplete */}
        <div className="mb-4 relative">
          <label className="field-label">Recipient</label>
          <div className="relative">
            <input className="input-field" placeholder={mode === 'wallet' ? '0x1a2b3c4d5e6f…' : 'Search company name…'}
              value={recipient} onChange={e => handleRecipientChange(e.target.value)}
              onFocus={() => mode === 'company' && recipient.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)} />
            {mode === 'company' && recipient.length > 0 && !resolved && <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#4b5563]" />}
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] shadow-lg overflow-hidden animate-slide-up">
              {suggestions.map(company => (
                <button key={company.id} onMouseDown={() => { setRecipient(company.name); setResolved({ address: company.address }); setShowSuggestions(false); }}
                  className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-[#1c1c1c] transition-colors border-b border-[#141414] last:border-b-0">
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
          {showSuggestions && suggestions.length === 0 && (
            <div className="absolute z-20 left-0 right-0 mt-1 rounded-lg border border-[#1a1a1a] bg-[#0d0d0d] shadow-lg p-4 text-center animate-slide-up">
              <p className="text-xs text-[#4b5563]">No companies found matching "{recipient}"</p>
            </div>
          )}
          {mode === 'company' && <p className="flex items-center gap-1.5 text-xs text-[#374151] mt-1.5"><Info className="w-3 h-3" /> Resolved via company directory</p>}
        </div>

        {resolved && (
          <div className="mb-4 card-inner p-4 animate-slide-up">
            <span className="badge badge-green mb-1.5 inline-flex"><span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" /> Resolved</span>
            <p className="mono text-xs text-[#4b5563]">{resolved.address.slice(0, 10)}...{resolved.address.slice(-8)}</p>
          </div>
        )}

        {/* Amount */}
        <div className="mb-6">
          <label className="field-label">Amount</label>
          <div className="relative">
            <input type="number" min="1" step="1" className="input-field pr-20" placeholder="0" value={amount} onChange={e => setAmount(e.target.value)} />
            <button onClick={() => ghcBalance !== null && setAmount(String(Math.floor(ghcBalance)))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#60a5fa] bg-[#0a0f1a] border border-[#0e162a] px-2 py-1 rounded transition-colors hover:bg-[#0e162a]">
              MAX
            </button>
          </div>
          <div className="flex justify-between mt-2 text-xs text-[#374151]">
            <span>Available: <span className="text-[#6b7280]">{ghcBalance !== null ? ghcBalance.toLocaleString() : '…'} GHC</span></span>
            {amount && <span>≈ <span className="text-[#6b7280]">${(parseInt(amount) * 3.10).toFixed(2)}</span></span>}
          </div>
        </div>

        {recipient && amount && (
          <div className="mb-5 card-inner p-4 space-y-2 animate-slide-up">
            {[['You send', `${amount} GHC`], ['Network', 'Sepolia']].map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-[#4b5563]">{k}</span>
                <span className="mono text-[#9ca3af] font-medium">{v}</span>
              </div>
            ))}
          </div>
        )}

        <button onClick={handleTransfer} disabled={loading || !recipient || !(parseInt(amount) > 0)}
          className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2">
          {loading
            ? <><svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>Processing…</>
            : <><Send className="w-4 h-4" />Submit Transfer<ArrowRight className="w-3.5 h-3.5" /></>}
        </button>
      </div>
    </div>
  );
}
