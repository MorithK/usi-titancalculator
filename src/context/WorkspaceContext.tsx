
import {
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

import {
    WorkspaceContext,
    type WorkspaceContextValue
  } from "./workspaceContextValue";

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