import { ethers } from "ethers";
import detectEthereumProvider from "@metamask/detect-provider";

const GHC_ADDRESS = "0x96c99BDa19A40fEAF449E3b2fEFA6b5Db7D0C487";
const PAYMENT_TOKEN_ADDRESS = "0xc718f7a935b77E33556f45d5AF2A838C7D23204c";

import GHC_ABI from "../../../blockchain/artifacts/contracts/GreenHydrogenCredit.sol";
import PAYMENT_ABI from "../../../blockchain/artifacts/contracts/MockERC20.sol";

export async function getContracts() {
  const provider = await detectEthereumProvider();
  if (!provider) throw new Error("MetaMask not detected");

  const web3Provider = new ethers.providers.Web3Provider(provider);
  const signer = web3Provider.getSigner();

  const ghcContract = new ethers.Contract(GHC_ADDRESS, GHC_ABI, signer);
  const paymentContract = new ethers.Contract(
    PAYMENT_TOKEN_ADDRESS,
    PAYMENT_ABI,
    signer
  );

  const userAddress = await signer.getAddress();

  return { ghcContract, paymentContract, userAddress };
}
