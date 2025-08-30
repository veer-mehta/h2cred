export async function connectWallet() {
  if (window.ethereum) {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      return accounts[0];
    } catch (err) {
      // Handle MetaMask pending request error
      if (err && err.code === -32002) {
        alert("A wallet connection request is already pending. Please complete it in MetaMask before trying again.");
      } else {
        alert('Wallet connection failed');
      }
      return null;
    }
  } else {
    alert('Please install Metamask!');
    return null;
  }
}
