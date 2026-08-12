import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { notify } from './ToastWidget';
import { Flame, Sparkles, Database, Building2, Shield, AlertTriangle } from 'lucide-react';
import { GHC_ABI, CONTRACT_ADDRESS, toOnChain, fromOnChain } from '../contract';
import ConnectGate from './ConnectGate';

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

export default function AdminTab({ wallet, onConnectWallet }) {
  const [mintAmt, setMintAmt] = useState('');
  const [mintTo, setMintTo] = useState('');
  const [burnAmt, setBurnAmt] = useState('');
  const [name, setName] = useState('');
  const [addr, setAddr] = useState('');
  const [lMint, setLMint] = useState(false);
  const [lBurn, setLBurn] = useState(false);
  const [lSave, setLSave] = useState(false);
  const [totalSupply, setTotalSupply] = useState(null);

  const { account, hasMinterRole, fetchBalance } = wallet;

  useEffect(() => {
    if (!account) return;
    const provider = new ethers.BrowserProvider(window.ethereum);
    new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, provider).totalSupply()
      .then(raw => setTotalSupply(fromOnChain(raw)))
      .catch(e => console.error('Failed to load supply:', e));
  }, [account, lMint, lBurn]);

  if (!account) return <ConnectGate icon={Shield} title="Admin Access Required" desc="Connect your wallet to manage the GHC token supply and company registry." onConnect={onConnectWallet} wallet={wallet} />;

  const withTx = async (label, txFn, setL, onDone) => {
    setL(true);
    const tId = notify.loading(`${label}…`);
    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const tx = await txFn(signer);
      notify.loading(`Confirming ${label}…`, { id: tId });
      await tx.wait();
      notify.success(`${label} complete!`, { id: tId });
      fetchBalance(account);
      onDone?.();
    } catch (e) {
      notify.error(e.code === 4001 ? 'Transaction rejected.' : e.reason ?? `${label} failed.`, { id: tId });
    } finally { setL(false); }
  };

  const handleMint = () => {
    const recipient = mintTo.trim() || account;
    if (!ethers.isAddress(recipient)) return notify.error('Enter a valid recipient wallet address.');
    withTx(`Mint ${mintAmt} GHC`,
      signer => new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer).mint(recipient, toOnChain(mintAmt)),
      setLMint, () => { setMintAmt(''); setMintTo(''); }
    );
  };

  const handleBurn = () => withTx(`Burn ${burnAmt} GHC`,
    signer => new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer).burn(toOnChain(burnAmt)),
    setLBurn, () => setBurnAmt('')
  );

  const handleSave = async () => {
    setLSave(true);
    const tId = notify.loading(`Saving ${name} to registry…`);
    try {
      const res = await fetch('http://localhost:5000/api/registry', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address: addr })
      });
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save');
      notify.success(`${name} registered in directory`, { id: tId });
      setName(''); setAddr('');
    } catch (e) { notify.error(e.message, { id: tId }); }
    finally { setLSave(false); }
  };

  const fmt = n => n !== null ? n.toLocaleString() : '—';

  return (
    <div className="space-y-5">
      {!hasMinterRole && (
        <div className="card p-4 border-[#241a00] bg-[#0f0a00] flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-[#fbbf24] flex-shrink-0" />
          <p className="text-xs text-[#fbbf24]">Your wallet does not have the <span className="font-mono font-semibold">MINTER_ROLE</span>. Mint and burn operations will fail.</p>
        </div>
      )}

      {/* Supply management */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-[#0a0f1a] border border-[#0e162a] flex items-center justify-center">
            <Database className="w-3.5 h-3.5 text-[#60a5fa]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e5e7eb]">Token Supply Management</p>
            <p className="text-xs text-[#4b5563]">Mint or burn GHC from total supply</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {[['Total Supply', fmt(totalSupply), '#60a5fa'], ['Circulating', fmt(totalSupply), '#4ade80'], ['Burned', '0', '#f87171']].map(([label, value, color]) => (
            <div key={label} className="card-inner p-4 text-center">
              <p className="field-label mb-1">{label}</p>
              <p className="mono text-lg font-semibold" style={{ color }}>{value}</p>
              <p className="text-xs text-[#374151]">GHC</p>
            </div>
          ))}
        </div>

        <hr className="divider mb-5" />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mint */}
          <div className="card-inner p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4"><Sparkles className="w-4 h-4 text-[#4ade80]" /><span className="text-sm font-semibold text-[#4ade80]">Mint</span></div>
              <div className="mb-3">
                <label className="field-label">Amount</label>
                <div className="relative">
                  <input type="number" min="1" step="1" className="input-field pr-14 disabled:opacity-40" placeholder="Amount to mint" value={mintAmt} onChange={e => setMintAmt(e.target.value)} disabled={!hasMinterRole} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#374151] font-mono">GHC</span>
                </div>
              </div>
              <div className="mb-4">
                <label className="field-label">Recipient Wallet</label>
                <input type="text" className="input-field disabled:opacity-40" placeholder="0x1a2b3c4d... (defaults to admin)" value={mintTo} onChange={e => setMintTo(e.target.value)} disabled={!hasMinterRole} />
              </div>
            </div>
            <button onClick={handleMint} disabled={lMint || !hasMinterRole || !(parseInt(mintAmt) > 0)} className="btn-success w-full py-2.5 text-xs flex items-center justify-center gap-2 mt-2">
              {lMint ? <Spinner /> : <Sparkles className="w-3.5 h-3.5" />}
              {lMint ? 'Minting…' : 'Mint Credits'}
            </button>
          </div>

          {/* Burn */}
          <div className="card-inner p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4"><Flame className="w-4 h-4 text-[#f87171]" /><span className="text-sm font-semibold text-[#f87171]">Burn</span></div>
              <div className="mb-4">
                <label className="field-label">Amount</label>
                <div className="relative">
                  <input type="number" min="1" step="1" className="input-field pr-14 disabled:opacity-40" placeholder="Amount to burn" value={burnAmt} onChange={e => setBurnAmt(e.target.value)} disabled={!hasMinterRole} />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#374151] font-mono">GHC</span>
                </div>
              </div>
            </div>
            <button onClick={handleBurn} disabled={lBurn || !hasMinterRole || !(parseInt(burnAmt) > 0)} className="btn-danger w-full py-2.5 text-xs flex items-center justify-center gap-2 mt-2">
              {lBurn ? <Spinner /> : <Flame className="w-3.5 h-3.5" />}
              {lBurn ? 'Burning…' : 'Burn Credits'}
            </button>
          </div>
        </div>
      </div>

      {/* Company registry */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-[#110a1a] border border-[#1e0f2a] flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-[#c084fc]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e5e7eb]">Company Directory Mapping</p>
            <p className="text-xs text-[#4b5563]">Register companies to the database</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="field-label">Company Name</label>
            <input className="input-field" placeholder="e.g. GreenCorp Ltd." value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Wallet Address</label>
            <input className="input-field" placeholder="0x1a2b3c4d5e6f…" value={addr} onChange={e => setAddr(e.target.value)} />
          </div>
        </div>
        <button onClick={handleSave} disabled={lSave || !name || !addr} className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs mb-6">
          {lSave ? <Spinner /> : <Database className="w-3.5 h-3.5" />}
          {lSave ? 'Saving…' : 'Save to Registry'}
        </button>
      </div>
    </div>
  );
}
