
import type {
  PlayerSnapshot,
  PlayerWorkspace,
  WorkspaceSource
} from "../../types/playerWorkspace";

/**
 * Creates a new calculator workspace from imported player data.
 *
 * Two independent copies of the imported snapshot are created:
 *
 * 1. importedBaseline preserves the original game state.
 * 2. simulatedState is used for calculator operations.
 *
 * Using independent copies prevents changes made during
 * simulations from accidentally modifying the baseline.
 *
 * This function only processes local data.
 * It does not require authentication or access Supabase.
 */
export function createPlayerWorkspace(
  snapshot: PlayerSnapshot,
  source: WorkspaceSource
): PlayerWorkspace {

  // Preserve an independent copy of the imported game state.
  const importedBaseline = structuredClone(snapshot);

  // Create a separate working copy for calculator simulations.
  const simulatedState = structuredClone(snapshot);

  // Assemble and return the complete calculator workspace.
  return {
    source: { ...source },
    importedBaseline,
    simulatedState,
    hasUnsavedChanges: false
  };
}

/**
 * Resets all simulated changes to the imported game state.
 *
 * A fresh copy of the baseline replaces the working state.
 * The imported baseline and its source metadata are preserved.
 *
 * This function returns a new workspace rather than modifying
 * the existing one, following React's immutable state pattern.
 *
 * No changes are written to Supabase.
 */
export function resetSimulation(
  workspace: PlayerWorkspace
): PlayerWorkspace {

  // Rebuild the working state from the untouched baseline.
  const simulatedState = structuredClone(
    workspace.importedBaseline
  );

  // Return the updated workspace with changes cleared.
  return {
    ...workspace,
    simulatedState,
    hasUnsavedChanges: false
  };
}

/**
 * Applies an immutable update to the simulated state.
 *
 * If the updater returns the current snapshot unchanged,
 * the entire workspace is returned unchanged.
 *
 * This allows conditional updates to reject stale
 * operations without falsely marking the workspace
 * as modified.
 *
 * @param workspace Current calculator workspace.
 * @param updater Function producing the next snapshot.
 *
 * @returns Updated workspace, or the original on no-op.
 */
export function updateSimulation(
  workspace: PlayerWorkspace,
  updater: (snapshot: PlayerSnapshot) => PlayerSnapshot
): PlayerWorkspace {

  const currentSnapshot = workspace.simulatedState;

  // Ask the caller to calculate the next simulated state.
  const updatedSnapshot = updater(currentSnapshot);

  /*
   * Returning the exact same snapshot means that
   * no operation was accepted.
   *
   * Preserve the entire workspace object and its
   * existing hasUnsavedChanges value.
   */
  if (updatedSnapshot === currentSnapshot) {
    return workspace;
  }

  // Accept the new simulated state without changing baseline.
  return {
    ...workspace,
    simulatedState: updatedSnapshot,
    hasUnsavedChanges: true
  };
}


