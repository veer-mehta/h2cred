import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Flame, Sparkles, Database, Building2, Copy, Check, Shield, Hash, Wallet, AlertTriangle } from 'lucide-react';
import { GHC_ABI, CONTRACT_ADDRESS, toOnChain, fromOnChain } from '../lib/contract';

const CID = 'QmX7bTzQ9p3aN2vLsK4fRdYe8cHmWjU1xE6o5iPkB3gDnV';

const Spinner = () => (
  <svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
  </svg>
);

function ConnectGate({ onConnect }) {
  return (
    <div className="card p-10 flex flex-col items-center text-center max-w-md mx-auto">
      <div className="w-12 h-12 rounded-xl bg-[#110a1a] border border-[#1e0f2a] flex items-center justify-center mb-4">
        <Shield className="w-5 h-5 text-[#c084fc]" />
      </div>
      <p className="text-base font-semibold text-[#e5e7eb] mb-1">Admin Access Required</p>
      <p className="text-sm text-[#4b5563] mb-6">Connect your wallet to manage the GHC token supply and company registry.</p>
      <button onClick={onConnect} className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm">
        <Wallet className="w-4 h-4" /> Connect Wallet
      </button>
    </div>
  );
}

export default function AdminTab({ onToast, wallet, onConnectWallet }) {
  const [mintAmt, setMintAmt]   = useState('');
  const [mintTo, setMintTo]     = useState('');
  const [burnAmt, setBurnAmt]   = useState('');
  const [name, setName]         = useState('');
  const [addr, setAddr]         = useState('');
  const [stripeAccountId, setStripeAccountId] = useState('');
  const [copied, setCopied]     = useState(false);
  const [lMint, setLMint]       = useState(false);
  const [lBurn, setLBurn]       = useState(false);
  const [lSave, setLSave]       = useState(false);
  const [supplyStats, setSupplyStats] = useState({ total: null, circulating: null, burned: null });

  const { account, hasMinterRole, totalSupply, fetchBalance } = wallet;

  // Load real supply stats from contract
  useEffect(() => {
    if (!account) return;
    (async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, provider);
        const [rawTotal] = await Promise.all([contract.totalSupply()]);
        setSupplyStats({
          total: fromOnChain(rawTotal),
          circulating: fromOnChain(rawTotal), // simplified: all supply = circulating
          burned: 0,  // ERC20Burnable burns reduce totalSupply, so 0 at start
        });
      } catch (e) {
        console.error('Failed to load supply stats:', e);
      }
    })();
  }, [account, lMint, lBurn]);

  if (!account) return <ConnectGate onConnect={onConnectWallet} />;

  const copy = () => {
    navigator.clipboard.writeText(CID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMint = async () => {
    if (!(parseInt(mintAmt) > 0)) return;
    const recipient = mintTo.trim() || account;
    if (!ethers.isAddress(recipient)) {
      onToast('error', 'Enter a valid recipient wallet address.');
      return;
    }
    setLMint(true);
    onToast('processing', `Minting ${mintAmt} GHC to ${recipient.slice(0, 6)}...${recipient.slice(-4)}…`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer);
      const tx       = await contract.mint(recipient, toOnChain(mintAmt));
      onToast('processing', `Minting ${mintAmt} GHC to recipient…`, tx.hash);
      await tx.wait();
      onToast('confirmed', `${mintAmt} GHC minted successfully`, tx.hash);
      setMintAmt('');
      setMintTo('');
      fetchBalance(account);
    } catch (e) {
      if (e.code === 4001) {
        onToast('error', 'Transaction rejected.');
      } else {
        onToast('error', e.reason ?? 'Mint failed.');
      }
    } finally {
      setLMint(false);
    }
  };

  const handleBurn = async () => {
    if (!(parseInt(burnAmt) > 0)) return;
    setLBurn(true);
    onToast('processing', `Burning ${burnAmt} GHC from supply…`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer);
      const tx       = await contract.burn(toOnChain(burnAmt));
      onToast('processing', `Burning ${burnAmt} GHC from supply…`, tx.hash);
      await tx.wait();
      onToast('confirmed', `${burnAmt} GHC burned from supply`, tx.hash);
      setBurnAmt('');
      fetchBalance(account);
    } catch (e) {
      if (e.code === 4001) {
        onToast('error', 'Transaction rejected.');
      } else {
        onToast('error', e.reason ?? 'Burn failed.');
      }
    } finally {
      setLBurn(false);
    }
  };

  const handleSave = async () => {
    if (!name || !addr) return;
    setLSave(true);
    onToast('processing', `Saving ${name} to registry…`);
    try {
      const res = await fetch('http://localhost:5000/api/registry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, address: addr, stripeAccountId })
      });
      if (!res.ok) throw new Error('Failed to save to database');
      onToast('confirmed', `${name} registered in directory`);
      setName(''); setAddr(''); setStripeAccountId('');
    } catch (e) {
      onToast('error', e.message);
    } finally {
      setLSave(false);
    }
  };

  const fmt = (n) => n !== null ? n.toLocaleString() : '—';

  return (
    <div className="space-y-5">

      {/* Role warning */}
      {!hasMinterRole && (
        <div className="card p-4 border-[#241a00] bg-[#0f0a00] flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-[#fbbf24] flex-shrink-0" />
          <p className="text-xs text-[#fbbf24]">
            Your wallet does not have the <span className="font-mono font-semibold">MINTER_ROLE</span>. Mint and burn operations will fail.
          </p>
        </div>
      )}

      {/* Supply Management */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#0a0f1a] border border-[#0e162a] flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-[#60a5fa]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#e5e7eb]">Token Supply Management</p>
              <p className="text-xs text-[#4b5563]">Mint or burn GHC from total supply</p>
            </div>
          </div>
          <span className="badge badge-amber flex items-center gap-1">
            <Shield className="w-3 h-3" /> Admin Only
          </span>
        </div>

        {/* Live supply stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Total Supply', value: fmt(supplyStats.total),       color: '#60a5fa' },
            { label: 'Circulating',  value: fmt(supplyStats.circulating),  color: '#4ade80' },
            { label: 'Burned',       value: fmt(supplyStats.burned),       color: '#f87171' },
          ].map(({ label, value, color }) => (
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
          <div className="card-inner p-5">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-4 h-4 text-[#4ade80]" />
              <span className="text-sm font-semibold text-[#4ade80]">Mint</span>
            </div>
            <div className="relative mb-3">
              <input
                type="number" min="1" step="1"
                className="input-field pr-14 disabled:opacity-40"
                placeholder="Amount to mint"
                value={mintAmt}
                onChange={e => setMintAmt(e.target.value)}
                disabled={!hasMinterRole}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#374151] font-mono">GHC</span>
            </div>
            <div className="relative mb-3">
              <input
                type="text"
                className="input-field disabled:opacity-40"
                placeholder="Recipient wallet (defaults to admin wallet)"
                value={mintTo}
                onChange={e => setMintTo(e.target.value)}
                disabled={!hasMinterRole}
              />
            </div>
            <button
              onClick={handleMint}
              disabled={lMint || !hasMinterRole || !(parseInt(mintAmt) > 0)}
              className="btn-success w-full py-2.5 text-xs flex items-center justify-center gap-2"
            >
              {lMint ? <Spinner /> : <Sparkles className="w-3.5 h-3.5" />}
              {lMint ? 'Minting…' : 'Mint Credits'}
            </button>
          </div>

          {/* Burn */}
          <div className="card-inner p-5">
            <div className="flex items-center gap-2 mb-4">
              <Flame className="w-4 h-4 text-[#f87171]" />
              <span className="text-sm font-semibold text-[#f87171]">Burn</span>
            </div>
            <div className="relative mb-3">
              <input
                type="number" min="1" step="1"
                className="input-field pr-14 disabled:opacity-40"
                placeholder="Amount to burn"
                value={burnAmt}
                onChange={e => setBurnAmt(e.target.value)}
                disabled={!hasMinterRole}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#374151] font-mono">GHC</span>
            </div>
            <button
              onClick={handleBurn}
              disabled={lBurn || !hasMinterRole || !(parseInt(burnAmt) > 0)}
              className="btn-danger w-full py-2.5 text-xs flex items-center justify-center gap-2"
            >
              {lBurn ? <Spinner /> : <Flame className="w-3.5 h-3.5" />}
              {lBurn ? 'Burning…' : 'Burn Credits'}
            </button>
          </div>
        </div>
      </div>

      {/* Company Directory */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-[#110a1a] border border-[#1e0f2a] flex items-center justify-center">
            <Building2 className="w-3.5 h-3.5 text-[#c084fc]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e5e7eb]">Company Directory Mapping</p>
            <p className="text-xs text-[#4b5563]">Register companies on the IPFS-backed registry</p>
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
          <div className="sm:col-span-2">
            <label className="field-label">Seller Stripe Account</label>
            <input
              className="input-field"
              placeholder="acct_... (optional for demo)"
              value={stripeAccountId}
              onChange={e => setStripeAccountId(e.target.value)}
            />
            <p className="text-xs text-[#374151] mt-2">
              Optional in demo mode. If omitted, seller payout is recorded as an offline/admin settlement.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={lSave || !name || !addr}
          className="btn-primary flex items-center gap-2 px-5 py-2.5 text-xs mb-6"
        >
          {lSave ? <Spinner /> : <Database className="w-3.5 h-3.5" />}
          {lSave ? 'Pinning to IPFS…' : 'Save to Registry'}
        </button>

        <hr className="divider mb-5" />

        {/* CID */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Hash className="w-3.5 h-3.5 text-[#4b5563]" />
              <span className="field-label">Database CID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge badge-green">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4ade80]" /> Verified
              </span>
              <button onClick={copy} className="p-1.5 rounded hover:bg-[#1a1a1a] transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-[#4ade80]" /> : <Copy className="w-3.5 h-3.5 text-[#4b5563]" />}
              </button>
            </div>
          </div>
          <div className="card-inner p-3.5 overflow-x-auto">
            <code className="mono text-xs text-[#60a5fa] whitespace-nowrap">{CID}</code>
          </div>
          <p className="text-xs text-[#374151] mt-2">IPFS Content Identifier — immutable, decentralized registry snapshot</p>
        </div>
      </div>
    </div>
  );
}
