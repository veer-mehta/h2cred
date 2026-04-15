import { ethers } from 'ethers';

export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS;
export const ESCROW_ADDRESS   = import.meta.env.VITE_ESCROW_ADDRESS;
export const SEPOLIA_CHAIN_ID = 11155111n;

// Human-readable ABI for GreenHydrogenCredit
export const GHC_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function mint(address to, uint256 amount)',
  'function burn(uint256 amount)',
  'function burnFrom(address account, uint256 amount)',
  'function pause()',
  'function unpause()',
  'function paused() view returns (bool)',
  'function hasRole(bytes32 role, address account) view returns (bool)',
  'function MINTER_ROLE() view returns (bytes32)',
  'function PAUSER_ROLE() view returns (bytes32)',
  'function DEFAULT_ADMIN_ROLE() view returns (bytes32)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

/** Convert whole credits (user-facing) → on-chain uint256 */
export const toOnChain = (credits) => ethers.parseUnits(String(credits), 18);

/** Convert on-chain uint256 → whole credits number */
export const fromOnChain = (raw) => Number(ethers.formatUnits(raw, 18));
