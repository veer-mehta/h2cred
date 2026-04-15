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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const sessionId = params.get('session_id');

    const clearPaymentParams = () => {
      const next = new URLSearchParams(window.location.search);
      next.delete('payment');
      next.delete('session_id');
      const query = next.toString();
      const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`;
      window.history.replaceState({}, '', nextUrl);
    };

    if (payment === 'cancelled') {
      onToast('error', 'Stripe checkout was cancelled.');
      clearPaymentParams();
      return;
    }

    if (payment !== 'success' || !sessionId) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;

    const pollCheckout = async () => {
      attempts += 1;
      onToast('processing', 'Confirming Stripe payment and token transfer...');

      try {
        const res = await fetch(`${API_BASE}/checkout-session/${sessionId}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Failed to confirm Stripe payment.');
        }

        if (data.fulfilled) {
          if (cancelled) return;
          const settlementNote =
            data.sellerPayoutStatus === 'PENDING_OFF_PLATFORM_SETTLEMENT'
              ? ' Seller settlement has been queued for admin processing.'
              : '';
          onToast('confirmed', `Purchase complete! Credits were delivered and retired.${settlementNote}`, data.retirementTxHash || '');
          if (wallet.account) {
            wallet.fetchBalance(wallet.account);
          }
          fetchListings();
          clearPaymentParams();
          return;
        }

        if (attempts < maxAttempts && data.paymentStatus === 'paid') {
          window.setTimeout(() => {
            if (!cancelled) {
              void pollCheckout();
            }
          }, 2000);
          return;
        }

        onToast('processing', 'Payment captured. Token transfer is still finalizing.');
        fetchListings();
        clearPaymentParams();
      } catch (e) {
        if (!cancelled) {
          onToast('error', e.message || 'Failed to confirm Stripe checkout.');
          clearPaymentParams();
        }
      }
    };

    void pollCheckout();

    return () => {
      cancelled = true;
    };
  }, [fetchListings, onToast, wallet.account, wallet.fetchBalance]);

  // Handle Listing
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

      // 1. On-chain transfer to Admin/Escrow
      const tx = await contract.transfer(ESCROW_ADDRESS, toOnChain(amount));
      onToast('processing', `Escrowing ${amount} GHC...`, tx.hash);
      await tx.wait();

      // 2. Register with backend
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

  // Handle Purchase
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
    onToast('processing', 'Redirecting to Stripe Checkout...');

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
        throw new Error(session.error || 'Failed to create Stripe Checkout session.');
      }

      if (!session.url) {
        throw new Error('Stripe Checkout URL was not returned.');
      }

      window.location.assign(session.url);
    } catch (e) {
      onToast('error', e.message || 'Purchase failed');
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
