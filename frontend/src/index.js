import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      if (process.env.NODE_ENV === "production") {
        const reg = await navigator.serviceWorker.register("/sw.js");
        console.log("SW registered:", reg.scope);
      } else {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        console.log("SW disabled in development");
      }
    } catch (err) {
      console.log("SW error:", err);
    }
  });
}
