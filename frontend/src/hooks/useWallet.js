import { useState, useEffect, useCallback, useRef } from 'react';
import { ethers } from 'ethers';
import { GHC_ABI, CONTRACT_ADDRESS, SEPOLIA_CHAIN_ID, fromOnChain } from '../lib/contract';

const LS_KEY = 'ghc_wallet_connected';

export function useWallet() {
  const [account, setAccount]         = useState(null);
  const [chainId, setChainId]         = useState(null);
  const [ghcBalance, setGhcBalance]   = useState(null);
  const [totalSupply, setTotalSupply] = useState(null);
  const [hasMinterRole, setHasMinterRole] = useState(false);
  const [connecting, setConnecting]   = useState(false);
  const [error, setError]             = useState(null);

  // Stable ref so event listeners don't stale-close over account
  const accountRef = useRef(null);
  accountRef.current = account;

  const fetchBalance = useCallback(async (addr) => {
    if (!window.ethereum || !addr) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, GHC_ABI, provider);
      const [rawBal, rawSupply, minterRole] = await Promise.all([
        contract.balanceOf(addr),
        contract.totalSupply(),
        contract.MINTER_ROLE(),
      ]);
      const isMinter = await contract.hasRole(minterRole, addr);
      setGhcBalance(fromOnChain(rawBal));
      setTotalSupply(fromOnChain(rawSupply));
      setHasMinterRole(isMinter);
    } catch (e) {
      console.error('[useWallet] fetchBalance failed:', e);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) { setError('no_wallet'); return; }
    setConnecting(true);
    setError(null);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer  = await provider.getSigner();
      const addr    = await signer.getAddress();
      const network = await provider.getNetwork();
      setAccount(addr);
      setChainId(network.chainId);
      await fetchBalance(addr);
      localStorage.setItem(LS_KEY, '1');
    } catch (e) {
      setError(e.code === 4001 ? 'rejected' : 'failed');
    } finally {
      setConnecting(false);
    }
  }, [fetchBalance]);

  const disconnect = useCallback(() => {
    setAccount(null);
    setChainId(null);
    setGhcBalance(null);
    setTotalSupply(null);
    setHasMinterRole(false);
    setError(null);
    localStorage.removeItem(LS_KEY);
  }, []);

  // Auto-reconnect silently on mount
  useEffect(() => {
    if (!window.ethereum || localStorage.getItem(LS_KEY) !== '1') return;
    (async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.send('eth_accounts', []);
        if (!accounts.length) { localStorage.removeItem(LS_KEY); return; }
        const network = await provider.getNetwork();
        setAccount(accounts[0]);
        setChainId(network.chainId);
        await fetchBalance(accounts[0]);
      } catch (e) {
        console.error('[useWallet] auto-reconnect failed:', e);
      }
    })();
  }, [fetchBalance]);

  // MetaMask event listeners
  useEffect(() => {
    if (!window.ethereum) return;
    const onAccounts = (accounts) => {
      if (!accounts.length) { disconnect(); return; }
      setAccount(accounts[0]);
      fetchBalance(accounts[0]);
    };
    const onChain = () => window.location.reload(); // simplest UX on chain switch
    window.ethereum.on('accountsChanged', onAccounts);
    window.ethereum.on('chainChanged', onChain);
    return () => {
      window.ethereum.removeListener('accountsChanged', onAccounts);
      window.ethereum.removeListener('chainChanged', onChain);
    };
  }, [disconnect, fetchBalance]);

  return {
    account,
    chainId,
    ghcBalance,
    totalSupply,
    hasMinterRole,
    connecting,
    error,
    connect,
    disconnect,
    fetchBalance,
    isCorrectNetwork: chainId === SEPOLIA_CHAIN_ID,
  };
}
