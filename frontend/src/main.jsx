import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { sepolia } from "wagmi/chains";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import App from "./App";
import { ConfigProvider, useAppConfig } from "./context/configContext";

import "@rainbow-me/rainbowkit/styles.css";

function Providers({ children }) {
  const { projectId } = useAppConfig();

  // FIX: use new RainbowKit API
  const config = getDefaultConfig({
    appName: "Green Hydrogen Credit",
    projectId,
    chains: [sepolia],
  });

  const queryClient = new QueryClient();

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider>
      <Providers>
        <App />
      </Providers>
    </ConfigProvider>
  </React.StrictMode>
);
