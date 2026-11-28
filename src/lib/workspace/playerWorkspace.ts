
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
 * Updates the calculator's simulated player state.
 *
 * The updater function receives the existing simulated
 * snapshot and returns a new snapshot containing changes.
 *
 * The imported baseline is preserved so calculations
 * can always be reset to the original game state.
 *
 * The updater must use immutable updates and must not
 * directly modify the existing snapshot.
 *
 * This function operates entirely in memory.
 * It does not read or write data in Supabase.
 */
export function updateSimulation(
  workspace: PlayerWorkspace,
  updater: (snapshot: PlayerSnapshot) => PlayerSnapshot
): PlayerWorkspace {

  // Calculate the new simulated state using the supplied updater.
  const simulatedState = updater(workspace.simulatedState);

  // Return a new workspace with the updated simulation.
  return {
    ...workspace,
    simulatedState,
    hasUnsavedChanges: true
  };
}

