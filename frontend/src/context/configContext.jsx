import { createContext, useContext } from "react";
import contractArtifact from "../../artifacts/contracts/GreenHydrogenCredit.sol/GreenHydrogenCredit.json";

const ConfigContext = createContext(null);
const abi = contractArtifact.abi;

export function ConfigProvider({ children }) {
  const config = {
    projectId: import.meta.env.VITE_WLC_ID || "test-id",
    contractAddress: import.meta.env.VITE_GHC_ADR,
    abi,
  };

  return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
}

export function useAppConfig() {
  return useContext(ConfigContext);
}
