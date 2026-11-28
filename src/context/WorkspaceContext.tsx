
import {
  createContext,
  useContext,
  useState,
  type ReactNode
} from "react";

import type {
  PlayerWorkspace,
  PlayerSnapshot,
  WorkspaceSource
} from "../types/playerWorkspace";

import {
  createPlayerWorkspace,
  resetSimulation,
  updateSimulation
} from "../lib/workspace/playerWorkspace";

/**
 * Describes the data and actions available to components
 * that use the shared calculator workspace.
 *
 * Components access these through usePlayerWorkspace()
 * rather than receiving them as individual props.
 */
interface WorkspaceContextValue {

  /**
   * Current calculator workspace.
   *
   * Null means the player has not loaded a workspace.
   * A workspace can exist without a signed-in user.
   */
  workspace: PlayerWorkspace | null;

  /**
   * Creates a new workspace from an imported game snapshot.
   *
   * Replaces any existing workspace, including simulations.
   * Does not write imported data to Supabase.
   */
  loadSnapshot: (
    snapshot: PlayerSnapshot,
    source: WorkspaceSource
  ) => void;

  /**
   * Updates the simulated snapshot using a callback.
   *
   * The imported baseline remains unchanged.
   */
  applySimulation: (
    updater: (snapshot: PlayerSnapshot) => PlayerSnapshot
  ) => void;

  /**
   * Restores the simulated state from the imported baseline.
   */
  reset: () => void;

  /**
   * Clears the current workspace from React memory.
   *
   * Does not delete any cloud-saved player progression.
   */
  clear: () => void;
}

/**
 * Creates the shared React Context.
 *
 * Undefined is used as the default because accessing
 * the context outside its provider is a programming error.
 *
 * This is different from workspace === null, which is
 * a valid state meaning no game save has been loaded.
 */
const WorkspaceContext = createContext<
  WorkspaceContextValue | undefined
>(undefined);

/**
 * Provides shared workspace state to child components.
 *
 * The provider owns the PlayerWorkspace through useState.
 * All workspace changes are made through the actions
 * exposed by its Context.
 *
 * Authentication and database persistence are deliberately
 * excluded from this component.
 */
export function WorkspaceProvider({
  children
}: {
  children: ReactNode;
}) {

  /**
   * Holds the currently loaded calculator workspace.
   *
   * Initially null until a snapshot has been loaded.
   */
  const [workspace, setWorkspace] =
    useState<PlayerWorkspace | null>(null);

  /**
   * Loads a new game snapshot into React state.
   *
   * createPlayerWorkspace creates independent baseline
   * and simulated copies of the imported data.
   */
  function loadSnapshot(
    snapshot: PlayerSnapshot,
    source: WorkspaceSource
  ) {
    setWorkspace(
      createPlayerWorkspace(snapshot, source)
    );
  }

  /**
   * Applies an immutable update to the simulated state.
   *
   * Uses React's functional state update so the callback
   * receives the latest workspace, even when multiple
   * changes are queued.
   *
   * Does nothing when no workspace is loaded.
   */
  function applySimulation(
    updater: (snapshot: PlayerSnapshot) => PlayerSnapshot
  ) {
    setWorkspace(current =>
      current === null
        ? null
        : updateSimulation(current, updater)
    );
  }

  /**
   * Resets the simulated state to the original import.
   *
   * Does nothing when no workspace is loaded.
   */
  function reset() {
    setWorkspace(current =>
      current === null
        ? null
        : resetSimulation(current)
    );
  }

  /**
   * Discards the current in-memory workspace.
   *
   * This should eventually require confirmation
   * when the player has unpersisted changes.
   */
  function clear() {
    setWorkspace(null);
  }

  /**
   * Exposes the state and workspace actions to children.
   *
   * Child components can read these values through
   * the usePlayerWorkspace custom hook.
   */
  const value: WorkspaceContextValue = {
    workspace,
    loadSnapshot,
    applySimulation,
    reset,
    clear
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

/**
 * Custom React hook for accessing the shared workspace.
 *
 * Any component rendered inside WorkspaceProvider may
 * call this hook to access workspace data and actions.
 *
 * Throws an error when the provider is missing, making
 * incorrect component placement easier to diagnose.
 */
export function usePlayerWorkspace(): WorkspaceContextValue {

  // Retrieve the nearest WorkspaceContext provider.
  const context = useContext(WorkspaceContext);

  // Fail clearly if a component is outside the provider.
  if (context === undefined) {
    throw new Error(
      "usePlayerWorkspace must be used inside WorkspaceProvider."
    );
  }

  // Return the shared workspace and its available actions.
  return context;
}
