import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "@fontsource/fredoka/600.css";
import "./styles.css";
import { App } from "./App";
import { UpdateBanner } from "./components/UpdateBanner";
import { startUpdateChecks } from "./lib/swUpdates";

if (import.meta.env.PROD) startUpdateChecks();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <UpdateBanner />
  </StrictMode>,
);
