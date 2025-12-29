import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";

// ✅ NO crear theme aquí - App.tsx ya tiene ThemeProvider
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);