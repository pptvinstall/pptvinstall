import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";

// Error boundary for the entire app
import ErrorBoundary from "@/components/error-boundary";

const root = document.getElementById("root");
if (!root) throw new Error("Root element not found");

// Wrap the entire app in ErrorBoundary for better error handling
createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);