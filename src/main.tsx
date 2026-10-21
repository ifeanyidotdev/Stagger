import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Initialize application theme from saved preferences or default to Catppuccin Mocha
const savedTheme = localStorage.getItem("stagenode_theme") || "catppuccin-mocha";
document.documentElement.setAttribute("data-theme", savedTheme);
if (document.body) {
  document.body.setAttribute("data-theme", savedTheme);
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
