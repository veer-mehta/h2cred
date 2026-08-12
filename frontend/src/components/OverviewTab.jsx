import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Zap, ArrowDownLeft, ArrowUpRight, Activity, ExternalLink, Leaf, Wallet } from "lucide-react";
import { GHC_ABI, CONTRACT_ADDRESS } from "../contract";

const ALCHEMY_URL = import.meta.env.VITE_ALCHEMY_URL;
const ETHERSCAN = "https://sepolia.etherscan.io";

const STATS = (bal = 0, transferred = 0, burned = 0, weeklyTxns = 0) => [
  { label: "GHC Balance",        value: bal,                           sub: null,            icon: Leaf,         c: "#4ade80" },
  { label: "Total Acquired",     value: bal + transferred,             sub: "lifetime GHC",  icon: ArrowDownLeft,c: "#60a5fa" },
  { label: "Total Transferred",  value: transferred,                   sub: "lifetime GHC",  icon: ArrowUpRight, c: "#f87171" },
  { label: "Weekly Transactions",value: weeklyTxns,                    sub: "past 7 days",   icon: Activity,     c: "#c084fc" },
  { label: "Green H₂ Claimed",   value: burned,                        sub: "tonnes",        icon: Zap,          c: "#fbbf24" },
];

export default function OverviewTab({ wallet, onConnectWallet }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ transferred: 0, burned: 0, weeklyTxns: 0 });
  const { account, ghcBalance } = wallet;

  useEffect(() => {
    if (!account) { setActivities([]); setStats({ transferred: 0, burned: 0, weeklyTxns: 0 }); return; }
    let active = true;

    const cacheKey = `ghc_act_cache_${account.toLowerCase()}`;
    const cachedRaw = sessionStorage.getItem(cacheKey);

    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw);
        if (cached.activities) setActivities(cached.activities);
        if (cached.stats) {
          setStats({
            transferred: cached.stats.transferred || 0,
            burned: cached.stats.burned || 0,
            weeklyTxns: cached.stats.weeklyTxns || 0
          });
        }
        setLoading(false);
      } catch (e) {
        console.warn('Failed to parse activity cache:', e);
        setLoading(true);
      }
    } else {
      setLoading(true);
    }

    (async () => {
      try {
        let eventsTo = [], eventsFrom = [];
        let provider = null;
        const RPC_ENDPOINTS = [
          "https://ethereum-sepolia-rpc.publicnode.com",
          "https://rpc.sepolia.org",
          "https://sepolia.drpc.org",
          ALCHEMY_URL,
        ].filter(Boolean);

        for (const url of RPC_ENDPOINTS) {
          try {
            const p = new ethers.JsonRpcProvider(url);
            const blockNum = await p.getBlockNumber();
            const fromBlock = Math.max(0, blockNum - 50000);
            const c = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, p);
            [eventsTo, eventsFrom] = await Promise.all([
              c.queryFilter(c.filters.Transfer(null, account), fromBlock, "latest"),
              c.queryFilter(c.filters.Transfer(account, null), fromBlock, "latest"),
            ]);
            provider = p;
            break;
          } catch (err) {
            console.warn(`Event query failed on RPC ${url}:`, err);
          }
        }

        if (!provider && window.ethereum) {
          const p = new ethers.BrowserProvider(window.ethereum);
          const blockNum = await p.getBlockNumber();
          const fromBlock = Math.max(0, blockNum - 1000);
          const c = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, p);
          [eventsTo, eventsFrom] = await Promise.all([
            c.queryFilter(c.filters.Transfer(null, account), fromBlock, "latest"),
            c.queryFilter(c.filters.Transfer(account, null), fromBlock, "latest"),
          ]);
          provider = p;
        }

        if (!active || !provider) return;

        let transferred = 0, burned = 0;
        eventsFrom.forEach(e => {
          const val = Number(ethers.formatUnits(e.args[2], 18));
          transferred += val;
          if (e.args[1] === ethers.ZeroAddress) burned += val;
        });

        // Dedupe, sort, take top 5
        const map = new Map();
        [...eventsFrom, ...eventsTo].forEach(e => map.set(e.transactionHash + "-" + e.index, e));
        const weeklyTxns = map.size;
        const freshStats = { transferred, burned, weeklyTxns };

        const top5 = Array.from(map.values()).sort((a, b) => b.blockNumber - a.blockNumber || b.index - a.index).slice(0, 5);

        const parsed = (await Promise.all(top5.map(async (e) => {
          const block = await provider.getBlock(e.blockNumber);
          const [from, to, rawVal] = e.args;
          const val = Number(ethers.formatUnits(rawVal, 18));
          const date = block ? new Date(block.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : '—';
          const base = { hash: e.transactionHash, date, val };

          if (from.toLowerCase() === account.toLowerCase() && to.toLowerCase() === account.toLowerCase())
            return [{ ...base, type: "send", amount: -val, counterparty: to }, { ...base, type: "receive", amount: val, counterparty: from }];

          const type = from === ethers.ZeroAddress ? "mint" : to === ethers.ZeroAddress ? "burn" : to.toLowerCase() === account.toLowerCase() ? "receive" : "send";
          const counterparty = from === ethers.ZeroAddress ? "Protocol Mint" : to === ethers.ZeroAddress ? "Protocol Burn" : type === "receive" ? from : to;
          const amount = (type === "send" || type === "burn") ? -val : val;
          return [{ ...base, type, amount, counterparty }];
        }))).flat().slice(0, 5);

        if (active) {
          setActivities(parsed);
          setStats(freshStats);
          sessionStorage.setItem(cacheKey, JSON.stringify({ activities: parsed, stats: freshStats }));
        }
      } catch (e) { console.error("Failed fetching events:", e); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [account, ghcBalance]);

  const bal = account && ghcBalance !== null ? ghcBalance : null;
  const fmt = v => (v !== null && v !== undefined && !Number.isNaN(v)) ? v.toLocaleString() : "—";

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Balance card */}
        <div className="card p-6 sm:col-span-1">
          <div className="w-8 h-8 rounded-lg bg-[#0a180a] border border-[#0e2a0e] flex items-center justify-center mb-5">
            <Leaf className="w-4 h-4 text-[#4ade80]" />
          </div>
          <p className="field-label">GHC Balance</p>
          <p className="mono text-3xl font-semibold text-[#e5e7eb] mt-1">
            {fmt(bal)}{bal !== null && <span className="text-lg text-[#374151]"> GHC</span>}
          </p>
          {!account && (
            <button onClick={onConnectWallet} className="mt-3 flex items-center gap-1.5 text-xs text-[#60a5fa] hover:text-[#93c5fd] transition-colors">
              <Wallet className="w-3 h-3" /> Connect wallet to view balance
            </button>
          )}
        </div>

        {/* Stat cards */}
        <div className="sm:col-span-2 grid grid-cols-2 gap-4">
          {STATS(bal ?? 0, stats.transferred, stats.burned, stats.weeklyTxns).slice(1).map(({ label, value, sub, icon: Icon, c }) => (
            <div key={label} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="field-label">{label}</span>
                <Icon className="w-3.5 h-3.5" style={{ color: c }} />
              </div>
              <p className="mono text-xl font-semibold text-[#e5e7eb]">{bal !== null ? fmt(value) : "—"}</p>
              <p className="text-xs text-[#374151] mt-0.5">{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Activity table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 flex items-center justify-between border-b border-[#1a1a1a]">
          <p className="text-sm font-semibold text-[#e5e7eb]">Recent Activity</p>
          <a href={account ? `${ETHERSCAN}/address/${account}` : "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-[#4b5563] hover:text-[#60a5fa] flex items-center gap-1 transition-colors">
            View all <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1a1a1a]">
              {["Type", "Amount", "Counterparty", "Date", "Tx Hash"].map(h => (
                <th key={h} className="text-left px-6 py-3 text-[11px] font-medium text-[#9ca3af] uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan="5" className="px-6 py-6 text-center text-sm text-[#4b5563]">Fetching on-chain history…</td></tr>}
            {!loading && !account && <tr><td colSpan="5" className="px-6 py-6 text-center text-sm text-[#4b5563]">Connect your wallet to view activity.</td></tr>}
            {!loading && account && activities.length === 0 && <tr><td colSpan="5" className="px-6 py-6 text-center text-sm text-[#4b5563]">No recent activity found on-chain.</td></tr>}
            {!loading && activities.map((row, i) => {
              const isOut = row.type === "send" || row.type === "burn";
              return (
                <tr key={row.hash + i} className={`hover:bg-[#111111] transition-colors ${i < activities.length - 1 ? "border-b border-[#141414]" : ""}`}>
                  <td className="px-6 py-3.5">
                    <span className={`flex items-center gap-1.5 text-xs font-medium ${isOut ? "text-[#f87171]" : "text-[#4ade80]"}`}>
                      {isOut ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                      {row.type.charAt(0).toUpperCase() + row.type.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className={`mono text-sm font-semibold ${row.amount > 0 ? "text-[#4ade80]" : "text-[#f87171]"}`}>
                      {row.amount > 0 ? "+" : ""}{row.amount}
                    </span>
                    <span className="text-xs text-[#374151] ml-1">GHC</span>
                  </td>
                  <td className="px-6 py-3.5 text-sm text-[#9ca3af]">
                    {row.counterparty.startsWith("0x") ? `${row.counterparty.slice(0, 8)}...${row.counterparty.slice(-6)}` : row.counterparty}
                  </td>
                  <td className="px-6 py-3.5 text-xs text-[#4b5563] font-mono">{row.date}</td>
                  <td className="px-6 py-3.5">
                    <div className="flex items-center gap-1.5">
                      <span className="mono text-xs text-[#60a5fa]">{row.hash.slice(0, 10)}...{row.hash.slice(-8)}</span>
                      <a href={`${ETHERSCAN}/tx/${row.hash}`} target="_blank" rel="noopener noreferrer" className="text-[#4b5563] hover:text-[#9ca3af] transition-colors">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
