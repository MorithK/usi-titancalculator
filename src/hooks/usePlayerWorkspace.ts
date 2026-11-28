
import { useContext } from "react";

import {
  WorkspaceContext,
  type WorkspaceContextValue
} from "../context/workspaceContextValue";

/**
 * Provides access to the shared calculator workspace.
 *
 * Must be called from a React component rendered inside
 * WorkspaceProvider.
 *
 * The hook throws an error when no provider is available.
 */
export function usePlayerWorkspace(): WorkspaceContextValue {

  // Retrieve the shared workspace context.
  const context = useContext(WorkspaceContext);

  // Detect incorrect usage outside WorkspaceProvider.
  if (context === undefined) {
    throw new Error(
      "usePlayerWorkspace must be used inside WorkspaceProvider."
    );
  }

  // Return workspace data and available actions.
  return context;
}
