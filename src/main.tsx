
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App.tsx";
import { WorkspaceProvider } from "./context/WorkspaceContext";

/**
 * Mounts the React application into the HTML root element.
 *
 * StrictMode enables additional development checks.
 *
 * WorkspaceProvider makes the calculator's local state
 * available throughout the application, regardless of
 * whether a user is authenticated.
 */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WorkspaceProvider>
      <App />
    </WorkspaceProvider>
  </StrictMode>
);
