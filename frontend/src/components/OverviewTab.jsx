import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Zap, TrendingUp, ArrowDownLeft, ArrowUpRight, CheckCircle2, ExternalLink, Leaf, Wallet } from 'lucide-react';
import { GHC_ABI, CONTRACT_ADDRESS, toOnChain } from '../lib/contract';

export default function OverviewTab({ onToast, wallet, onConnectWallet }) {
  const [mintAmount, setMintAmount] = useState('');
  const [loading, setLoading]       = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActs, setLoadingActs] = useState(false);

  const { account, ghcBalance, hasMinterRole, fetchBalance } = wallet;

  useEffect(() => {
    if (!account) {
      setActivities([]);
      return;
    }
    let active = true;
    (async () => {
      try {
        setLoadingActs(true);
        const provider = new ethers.BrowserProvider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, provider);
        
        const currentBlock = await provider.getBlockNumber();
        const fromBlock = Math.max(0, currentBlock - 50000);
        
        const filterTo = contract.filters.Transfer(null, account);
        const filterFrom = contract.filters.Transfer(account, null);
        
        const [eventsTo, eventsFrom] = await Promise.all([
          contract.queryFilter(filterTo, fromBlock, 'latest'),
          contract.queryFilter(filterFrom, fromBlock, 'latest')
        ]);
        
        if (!active) return;
        
        const map = new Map();
        [...eventsFrom, ...eventsTo].forEach(e => map.set(e.transactionHash + '-' + e.index, e));
        let allEvents = Array.from(map.values());
        allEvents.sort((a, b) => b.blockNumber - a.blockNumber || b.index - a.index);
        
        allEvents = allEvents.slice(0, 5); // display 5 most recent
        
        const parsed = (await Promise.all(allEvents.map(async (e, i) => {
          const block = await e.getBlock();
          const from = e.args[0];
          const to = e.args[1];
          const val = Number(ethers.formatUnits(e.args[2], 18));
          
          const date = new Date(block.timestamp * 1000).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
          });

          if (from.toLowerCase() === account.toLowerCase() && to.toLowerCase() === account.toLowerCase()) {
            return [
              { id: e.transactionHash + i + '_send', type: 'send', amount: `-${val}`, counterparty: to, date, hash: e.transactionHash, _eventIdx: i, _order: 0 },
              { id: e.transactionHash + i + '_receive', type: 'receive', amount: `+${val}`, counterparty: from, date, hash: e.transactionHash, _eventIdx: i, _order: 1 }
            ];
          }
          
          let type, counterparty, sign;
          if (from === ethers.ZeroAddress) {
            type = 'mint'; counterparty = 'Protocol Mint'; sign = '+';
          } else if (to === ethers.ZeroAddress) {
            type = 'burn'; counterparty = 'Protocol Burn'; sign = '-';
          } else if (to.toLowerCase() === account.toLowerCase()) {
            type = 'receive'; counterparty = from; sign = '+';
          } else {
            type = 'send'; counterparty = to; sign = '-';
          }
          
          return [{
            id: e.transactionHash + i,
            type,
            amount: `${sign}${val}`,
            counterparty,
            date,
            hash: e.transactionHash,
            _eventIdx: i,
            _order: 0
          }];
        }))).flat().sort((a, b) => a._eventIdx - b._eventIdx || a._order - b._order).slice(0, 5);
        
        console.log('[DEBUG] Activity entries:', parsed.map(p => `${p.type} ${p.amount} _eventIdx=${p._eventIdx} _order=${p._order}`));
        if (active) setActivities(parsed);
      } catch (e) {
        console.error('Failed fetching events:', e);
      } finally {
        if (active) setLoadingActs(false);
      }
    })();
    return () => { active = false; };
  }, [account, ghcBalance]);

  const handleMint = async () => {
    if (!account || !mintAmount || parseInt(mintAmount) < 1) return;
    setLoading(true);
    onToast('processing', `Minting ${mintAmount} GHC on-chain…`);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer   = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer);
      const tx       = await contract.mint(account, toOnChain(mintAmount));
      onToast('processing', `Minting ${mintAmount} GHC on-chain…`, tx.hash);
      await tx.wait();
      onToast('confirmed', `${mintAmount} GHC minted to your wallet`, tx.hash);
      setMintAmount('');
      fetchBalance(account);
    } catch (e) {
      if (e.code === 4001) {
        onToast('error', 'Transaction rejected.');
      } else {
        onToast('error', e.reason ?? 'Mint failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Format balance for display
  const balanceDisplay = account
    ? (ghcBalance !== null ? ghcBalance.toLocaleString() : '—')
    : '—';

  return (
    <div className="space-y-5">

      {/* Balance + Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

        {/* GHC Balance card */}
        <div className="card p-6 sm:col-span-1">
          <div className="flex items-center justify-between mb-5">
            <div className="w-8 h-8 rounded-lg bg-[#0a180a] border border-[#0e2a0e] flex items-center justify-center">
              <Leaf className="w-4 h-4 text-[#4ade80]" />
            </div>
          </div>
          <p className="field-label">GHC Balance</p>
          <p className="mono text-3xl font-semibold text-[#e5e7eb] mt-1">
            {balanceDisplay}
            {account && ghcBalance !== null && (
              <span className="text-lg text-[#374151]"> GHC</span>
            )}
          </p>
          {!account && (
            <button
              onClick={onConnectWallet}
              className="mt-3 flex items-center gap-1.5 text-xs text-[#60a5fa] hover:text-[#93c5fd] transition-colors"
            >
              <Wallet className="w-3 h-3" /> Connect wallet to view balance
            </button>
          )}
        </div>

        {/* Stats grid */}
        <div className="sm:col-span-2 grid grid-cols-2 gap-4">
          {[
            { label: 'Total Acquired',    value: account && ghcBalance !== null ? ghcBalance.toLocaleString() : '—', sub: 'lifetime GHC',   icon: ArrowDownLeft, c: '#60a5fa' },
            { label: 'Total Transferred', value: '—',     sub: 'lifetime GHC',   icon: ArrowUpRight,  c: '#f87171' },
            { label: 'Credentials Held',  value: '—',     sub: 'active certs',   icon: CheckCircle2,  c: '#4ade80' },
            { label: 'CO₂ Offset',        value: '—',     sub: 'CO₂ equivalent', icon: Zap,           c: '#fbbf24' },
          ].map(({ label, value, sub, icon: Icon, c }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="field-label">{label}</span>
                <Icon className="w-3.5 h-3.5" style={{ color: c }} />
              </div>
              <p className="mono text-xl font-semibold text-[#e5e7eb]">{value}</p>
              <p className="text-xs text-[#374151] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Mint (only shown to minter-role holders) */}
      <div className="card p-6">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-7 h-7 rounded-lg bg-[#0a0f1a] border border-[#0e162a] flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-[#60a5fa]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#e5e7eb]">Quick Mint</p>
            <p className="text-xs text-[#4b5563]">
              {account
                ? hasMinterRole ? 'Mint GHC credits to your wallet' : 'Your wallet does not have the Minter role'
                : 'Connect a wallet with the Minter role'}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <input
              type="number"
              min="1"
              step="1"
              placeholder="Amount"
              value={mintAmount}
              onChange={e => setMintAmount(e.target.value)}
              disabled={!account || !hasMinterRole}
              className="input-field pr-14 disabled:opacity-40"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#374151] font-semibold font-mono">GHC</span>
          </div>
          <button
            onClick={account ? handleMint : onConnectWallet}
            disabled={loading || (account && (!hasMinterRole || !(parseInt(mintAmount) > 0)))}
            className="btn-primary flex items-center gap-2 px-5 py-2.5 text-sm"
          >
            {loading
              ? <svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
              : <Zap className="w-4 h-4" />}
            {loading ? 'Minting…' : account ? 'Mint Credits' : 'Connect Wallet'}
          </button>
        </div>

        <div className="flex items-center gap-4 mt-3 text-xs text-[#374151]">
          <span>Rate: <span className="text-[#6b7280]">1 GHC = $3.10</span></span>
          <span className="w-px h-3 bg-[#1a1a1a]" />
          <span>Gas: <span className="text-[#6b7280]">~$0.42</span></span>
          <span className="w-px h-3 bg-[#1a1a1a]" />
          <span>Network: <span className="text-[#4ade80]">Sepolia</span></span>
        </div>
      </div>

      {/* Activity Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#1a1a1a]">
          <p className="text-sm font-semibold text-[#e5e7eb]">Recent Activity</p>
          <a 
            href={account ? `https://sepolia.etherscan.io/address/${account}` : '#'}
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-[#4b5563] hover:text-[#60a5fa] flex items-center gap-1 transition-colors"
          >
            View all <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {['Type', 'Amount', 'Counterparty', 'Date', 'Tx Hash'].map(h => (
                <th key={h} className="text-left px-6 py-3 text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(account && !loadingActs && activities.length === 0) && (
              <tr>
                <td colSpan="5" className="px-6 py-6 text-center text-sm text-[#4b5563]">
                  No recent activity found on-chain.
                </td>
              </tr>
            )}
            {(!account) && (
              <tr>
                <td colSpan="5" className="px-6 py-6 text-center text-sm text-[#4b5563]">
                  Connect your wallet to view activity.
                </td>
              </tr>
            )}
            {loadingActs && (
              <tr>
                <td colSpan="5" className="px-6 py-6 text-center text-sm text-[#4b5563]">
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin-slow text-[#60a5fa]" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" /><path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" /></svg>
                    Fetching on-chain history…
                  </span>
                </td>
              </tr>
            )}
            {(!loadingActs && activities.length > 0) && activities.map((row, i) => (
              <tr
                key={row.id}
                className={`hover:bg-[#111111] transition-colors ${i < activities.length - 1 ? 'border-b border-[#141414]' : ''}`}
              >
                <td className="px-6 py-3.5">
                  <span className={`flex items-center gap-1.5 text-xs font-medium ${row.type === 'send' || row.type === 'burn' ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                    {row.type === 'send' || row.type === 'burn' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                    {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
                  </span>
                </td>
                <td className="px-6 py-3.5">
                  <span className={`mono text-sm font-semibold ${row.amount.startsWith('+') ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>
                    {row.amount}
                  </span>
                  <span className="text-xs text-[#374151] ml-1">GHC</span>
                </td>
                <td className="px-6 py-3.5 text-sm text-[#9ca3af]">
                  {row.counterparty.startsWith('0x') 
                    ? `${row.counterparty.slice(0, 8)}...${row.counterparty.slice(-6)}` 
                    : row.counterparty}
                </td>
                <td className="px-6 py-3.5 text-xs text-[#4b5563] font-mono">{row.date}</td>
                <td className="px-6 py-3.5">
                  <div className="flex items-center gap-1.5">
                    <span className="mono text-xs text-[#60a5fa]">
                      {row.hash.slice(0, 10)}...{row.hash.slice(-8)}
                    </span>
                    <a href={`https://sepolia.etherscan.io/tx/${row.hash}`} target="_blank" rel="noopener noreferrer" className="text-[#4b5563] hover:text-[#9ca3af] transition-colors">
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
