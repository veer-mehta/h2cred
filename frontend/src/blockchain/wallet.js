export async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return accounts[0];
    } catch (err) {
      alert('Wallet connection failed');
      return null;
    }
  } else {
    alert('Please install Metamask!');
    return null;
  }
}
