import { ethers } from 'ethers';
import contractJson from '../../../blockchain/artifacts/contracts/GreenHydrogenCredit.sol/GreenHydrogenCredit.json';

const CONTRACT_ADDRESS = '<DEPLOYED_CONTRACT_ADDRESS>';
const ABI = contractJson.abi;

export function getProvider() {
  if (window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  throw new Error('No Ethereum provider found');
}

export function getSigner() {
  const provider = getProvider();
  return provider.getSigner();
}

export function getContract() {
  const signer = getSigner();
  return new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
}

export async function getMyCredits() {
  const contract = getContract();
  return await contract.getMyCredits();
}

export async function buyCredits(amount, valueEth) {
  const contract = getContract();
  const tx = await contract.buyCredits(amount, { value: ethers.utils.parseEther(valueEth) });
  return tx;
}

export async function transferCredits(to, amount) {
  const contract = getContract();
  const tx = await contract.transferCredits(to, amount);
  return tx;
}

export async function getCredits(address) {
  const contract = getContract();
  return await contract.credits(address);
}

export async function getOwner() {
  const contract = getContract();
  return await contract.owner();
}
