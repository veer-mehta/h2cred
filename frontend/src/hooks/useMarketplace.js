import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { notify } from '../components/ToastWidget';
import { GHC_ABI, CONTRACT_ADDRESS, ESCROW_ADDRESS, toOnChain } from '../contract';

const API = 'http://localhost:5000/api';

export function useMarketplace(wallet) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/listings`);
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch listings:", e);
      setListings([]);
    }
  }, []);

  useEffect(() => { fetchListings(); }, [fetchListings]);

  const listCredits = async (amount, pricePerGHC) => {
    if (!wallet.account || !ESCROW_ADDRESS) return notify.error('Wallet not connected or Escrow address missing.');
    setLoading(true);
    const tId = notify.loading(`Transferring ${amount} GHC to Escrow...`);
    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const tx = await new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer).transfer(ESCROW_ADDRESS, toOnChain(amount));
      notify.loading(`Escrowing ${amount} GHC...`, { id: tId });
      await tx.wait();

      notify.loading('Registering listing...', { id: tId });
      const res = await fetch(`${API}/listings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seller: wallet.account, amount, pricePerGHC, txHash: tx.hash })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) { notify.success('Listing created successfully!', { id: tId }); fetchListings(); }
      else notify.error(data.error || 'Failed to register listing.', { id: tId });
    } catch (e) { notify.error(e.reason || e.message || 'Listing failed', { id: tId }); }
    finally { setLoading(false); }
  };

  const buyCredits = async (listing) => {
    if (!wallet.account || !ESCROW_ADDRESS) return notify.error(!wallet.account ? 'Connect wallet to buy.' : 'Escrow/admin address is missing.');
    setLoading(true);
    const tId = notify.loading('Approving retirement after delivery...');
    try {
      const signer = await new ethers.BrowserProvider(window.ethereum).getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer);
      const amountOnChain = toOnChain(listing.amount);

      const approveTx = await contract.approve(ESCROW_ADDRESS, amountOnChain);
      notify.loading('Waiting for retirement approval...', { id: tId });
      await approveTx.wait();

      notify.loading('Processing checkout & retirement...', { id: tId });
      const sessionRes = await fetch(`${API}/checkout-session`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId: listing.id, buyerAddress: wallet.account, origin: window.location.origin })
      });
      const session = await sessionRes.json();
      if (!sessionRes.ok) throw new Error(session.error || 'Failed to create checkout session.');

      if (session.success) {
        notify.success('Purchase complete! Credits delivered and retired.', { id: tId });
        wallet.fetchBalance(wallet.account);
        fetchListings();
      } else throw new Error('Checkout failed to complete.');
    } catch (e) { notify.error(e.message || 'Purchase failed', { id: tId }); }
    finally { setLoading(false); }
  };

  return { listings, loading, listCredits, buyCredits, refresh: fetchListings };
}
