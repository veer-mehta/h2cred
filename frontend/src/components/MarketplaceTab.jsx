import { useState } from 'react';
import { Store, ShoppingCart, Tag, Zap, Wallet, Info, ArrowRight } from 'lucide-react';
import { useMarketplace } from '../hooks/useMarketplace';

function ConnectGate({ onConnect }) {
  return (
    <div className="max-w-xl mx-auto">
      <div className="card p-10 flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-xl bg-[#0a0f1a] border border-[#0e162a] flex items-center justify-center mb-4">
          <Store className="w-5 h-5 text-[#60a5fa]" />
        </div>
        <p className="text-base font-semibold text-[#e5e7eb] mb-1">Marketplace Access</p>
        <p className="text-sm text-[#4b5563] mb-6">Connect your wallet to trade GHC credits for fiat.</p>
        <button onClick={onConnect} className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm">
          <Wallet className="w-4 h-4" /> Connect Wallet
        </button>
      </div>
    </div>
  );
}

export default function MarketplaceTab({ onToast, wallet, onConnectWallet }) {
  const [amount, setAmount] = useState('');
  const [pricePerGHC, setPricePerGHC] = useState('500'); // Default 500 INR
  const { listings, loading, listCredits, buyCredits, refresh } = useMarketplace(onToast, wallet);

  const { account, ghcBalance } = wallet;

  if (!account) return <ConnectGate onConnect={onConnectWallet} />;

  const handleList = async () => {
    if (!amount || !pricePerGHC || parseFloat(amount) < 1) return;
    await listCredits(amount, pricePerGHC);
    setAmount('');
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-6xl mx-auto">
      
      {/* SELL SIDE */}
      <div className="lg:col-span-5 space-y-6">
        <div className="card p-7">
          <div className="flex items-center gap-2.5 mb-7">
            <div className="w-8 h-8 rounded-lg bg-[#0a0f1a] border border-[#0e162a] flex items-center justify-center">
              <Tag className="w-4 h-4 text-[#60a5fa]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#e5e7eb]">List GHC for Sale</p>
              <p className="text-xs text-[#4b5563]">List NGO credits for retirement via Stripe Checkout</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="field-label">Amount of Credits</label>
              <div className="relative">
                <input
                  type="number"
                  className="input-field pr-14"
                  placeholder="0"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#374151] font-mono">GHC</span>
              </div>
              <p className="text-[10px] text-[#374151] mt-1.5 ml-1">
                Available: {ghcBalance !== null ? ghcBalance.toLocaleString() : '—'} GHC
              </p>
            </div>

            <div>
              <label className="field-label">Price per GHC (INR)</label>
              <div className="relative">
                <input
                  type="number"
                  className="input-field pr-14"
                  placeholder="500"
                  value={pricePerGHC}
                  onChange={e => setPricePerGHC(e.target.value)}
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[#374151] font-mono">₹</span>
              </div>
            </div>

            <div className="card-inner p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-[#4b5563]">Total Value</span>
                <span className="mono text-[#e5e7eb]">₹{(parseFloat(amount || 0) * parseFloat(pricePerGHC || 0)).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#4b5563]">Platform Fee</span>
                <span className="mono text-[#4ade80]">0%</span>
              </div>
            </div>

            <button
              onClick={handleList}
              disabled={loading || !amount}
              className="btn-primary w-full py-3 text-sm flex items-center justify-center gap-2 mt-4"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin-slow" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.2" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  List Credits <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>

        <div className="card-inner p-5 flex gap-3 items-start border-[#0e162a] bg-[#0a0f1a]/30">
          <Info className="w-4 h-4 text-[#60a5fa] mt-0.5" />
          <p className="text-[11px] text-[#9ca3af] leading-relaxed">
            By listing, your GHC will be transferred to a secure Escrow wallet. 
            Once a buyer pays, funds are received by the platform, the seller settlement is recorded for admin processing, and the credits are delivered to the buyer wallet and immediately retired.
          </p>
        </div>
      </div>

      {/* BUY SIDE */}
      <div className="lg:col-span-7 space-y-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-[#e5e7eb]" />
            <h2 className="text-sm font-semibold text-[#e5e7eb]">Active Credits Marketplace</h2>
          </div>
          <button 
            onClick={refresh}
            className="text-[10px] text-[#4b5563] hover:text-[#60a5fa] transition-colors"
          >
            Refresh Listings
          </button>
        </div>

        {listings.length === 0 ? (
          <div className="card p-12 flex flex-col items-center text-center">
            <Store className="w-8 h-8 text-[#1c1c1c] mb-3" />
            <p className="text-sm text-[#4b5563]">No active listings found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {listings.map(listing => (
              <div key={listing.id} className="card p-5 hover:border-[#2a2a2a] transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-[#0d1424] border border-[#1e293b] flex items-center justify-center">
                      <Zap className="w-3 h-3 text-[#60a5fa]" />
                    </div>
                    <span className="mono text-sm font-bold text-[#e5e7eb]">{listing.amount.toLocaleString()} GHC</span>
                  </div>
                  <span className="badge badge-green text-[9px] uppercase tracking-wider">Verified</span>
                </div>
                
                <div className="space-y-1 mb-5">
                  <p className="text-[10px] text-[#4b5563] uppercase tracking-tighter">Listed by</p>
                  <p className="mono text-[11px] text-[#9ca3af] truncate">{listing.seller}</p>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-[#1a1a1a]">
                  <div>
                    <p className="text-[10px] text-[#4b5563] mb-0.5">Total Price</p>
                    <p className="mono text-base font-bold text-[#e5e7eb]">₹{(listing.amount * listing.pricePerGHC).toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => buyCredits(listing)}
                    disabled={loading || listing.seller.toLowerCase() === account.toLowerCase()}
                    className="px-4 py-2 bg-[#60a5fa] text-[#0a0a0a] text-xs font-bold rounded-lg hover:bg-[#93c5fd] transition-colors disabled:opacity-40"
                  >
                    Buy & Retire
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
