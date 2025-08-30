import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { BlockchainProvider } from "./context/BlockchainContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BlockchainProvider>
      <App />
    </BlockchainProvider>
  </React.StrictMode>
);
