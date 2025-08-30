export async function disconnectWallet() {
  if (window.ethereum && window.ethereum.request) {
    try {
      // Metamask does not support programmatic disconnect, but we can clear app state
      // Optionally, you can suggest the user disconnect manually from Metamask UI
      // For now, just clear any app-side wallet state
      return true;
    } catch (err) {
      return false;
    }
  }
  return false;
}
