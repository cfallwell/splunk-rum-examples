import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SplunkRumProvider } from "@cfallwell/rumbootstrap";
import { rumConfig } from "./rum.config";
import App from "./App";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <SplunkRumProvider configOverride={rumConfig}>
        <App />
      </SplunkRumProvider>
    </BrowserRouter>
  </React.StrictMode>
);
