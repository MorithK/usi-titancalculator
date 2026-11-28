
import { createContext } from "react";

import type {
  PlayerWorkspace,
  PlayerSnapshot,
  WorkspaceSource
} from "../types/playerWorkspace";

/**
 * Describes the shared workspace state and operations
 * available to components through React Context.
 */
export interface WorkspaceContextValue {

  /** Currently loaded workspace, or null if none exists. */
  workspace: PlayerWorkspace | null;

  /** Creates a workspace from imported game data. */
  loadSnapshot: (
    snapshot: PlayerSnapshot,
    source: WorkspaceSource
  ) => void;

  /** Applies an immutable simulated-state update. */
  applySimulation: (
    updater: (snapshot: PlayerSnapshot) => PlayerSnapshot
  ) => void;

  /** Restores the imported baseline. */
  reset: () => void;

  /** Discards the current in-memory workspace. */
  clear: () => void;
}

/**
 * Shared context used by the provider and consumer hook.
 *
 * Undefined indicates that no provider is available.
 */
export const WorkspaceContext = createContext<
  WorkspaceContextValue | undefined
>(undefined);
