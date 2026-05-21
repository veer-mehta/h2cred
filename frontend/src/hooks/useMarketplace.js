import { useState, useCallback, useEffect } from 'react';
import { ethers } from 'ethers';
import { GHC_ABI, CONTRACT_ADDRESS, ESCROW_ADDRESS, toOnChain } from '../lib/contract';

const API_BASE = 'http://localhost:5000/api';

export function useMarketplace(onToast, wallet) {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchListings = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/listings`);
      if (!res.ok) {
        throw new Error(`Listings request failed with ${res.status}`);
      }
      const data = await res.json();
      setListings(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch listings:", e);
      setListings([]);
    }
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);


  const listCredits = async (amount, pricePerGHC) => {
    if (!wallet.account || !ESCROW_ADDRESS) {
      onToast('error', 'Wallet not connected or Escrow address missing.');
      return;
    }

    setLoading(true);
    onToast('processing', `Transferring ${amount} GHC to Escrow...`);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer);

      const tx = await contract.transfer(ESCROW_ADDRESS, toOnChain(amount));
      onToast('processing', `Escrowing ${amount} GHC...`, tx.hash);
      await tx.wait();

      onToast('processing', 'Registering listing...');
      const res = await fetch(`${API_BASE}/listings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seller: wallet.account,
          amount,
          pricePerGHC,
          txHash: tx.hash
        })
      });

      if (res.ok) {
        onToast('confirmed', `Listing created successfully!`);
        fetchListings();
      } else {
        const data = await res.json().catch(() => ({}));
        onToast('error', data.error || 'Failed to register listing with backend.');
      }
    } catch (e) {
      onToast('error', e.reason || e.message || 'Listing failed');
    } finally {
      setLoading(false);
    }
  };

  const buyCredits = async (listing) => {
    if (!wallet.account) {
      onToast('error', 'Connect wallet to buy.');
      return;
    }

    if (!ESCROW_ADDRESS) {
      onToast('error', 'Escrow/admin address is missing.');
      return;
    }

    setLoading(true);
    onToast('processing', 'Processing Mock Checkout...');

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, signer);
      const amountOnChain = toOnChain(listing.amount);

      onToast('processing', 'Approving retirement after delivery...');
      const approveTx = await contract.approve(ESCROW_ADDRESS, amountOnChain);
      onToast('processing', 'Waiting for retirement approval confirmation...', approveTx.hash);
      await approveTx.wait();

      const sessionRes = await fetch(`${API_BASE}/checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          listingId: listing.id,
          buyerAddress: wallet.account,
          origin: window.location.origin
        })
      });
      const session = await sessionRes.json();

      if (!sessionRes.ok) {
        throw new Error(session.error || 'Failed to create checkout session.');
      }

      if (session.success) {
        onToast('confirmed', 'Purchase complete! Credits were delivered and retired.', session.retirementTxHash || '');
        if (wallet.account) {
          wallet.fetchBalance(wallet.account);
        }
        fetchListings();
      } else {
        throw new Error('Checkout failed to complete instantly.');
      }
    } catch (e) {
      onToast('error', e.message || 'Purchase failed');
    } finally {
      setLoading(false);
    }
  };

  return {
    listings,
    loading,
    listCredits,
    buyCredits,
    refresh: fetchListings
  };
}
