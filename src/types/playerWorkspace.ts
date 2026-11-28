
import type { ImportedProgression } from "../lib/saveImport/extractors/progression";
import type { ImportedTitanComponent } from "../lib/saveImport/extractors/titanComponents";
import type { ImportedCrewUpgrade } from "../lib/saveImport/extractors/crewUpgrades";
import type { ImportedWarps } from "../lib/saveImport/extractors/warps";

/**
 * Represents a single resource available to the player.
 *
 * Resource definitions identify the type of resource,
 * while amounts and production rates come from the
 * imported game save or calculator simulations.
 *
 * These values are stored independently of Supabase
 * so the calculator can operate without authentication.
 */
export interface WorkspaceResource {

  /** Unique resource identifier from our reference data. */
  resourceTypeId: number;

  /** Internal resource key used by the game's save format. */
  gameResourceKey: string;

  /** Human-readable name displayed in the calculator. */
  resourceName: string;

  /** Resource category, such as Fragment or Specimen. */
  resourceType: string;

  /**
   * Current resource balance.
   *
   * Stored as a string to preserve precision for very
   * large numbers such as 1.09e91.
   *
   * Convert to Decimal when performing calculations.
   */
  amount: string;

  /**
   * Effective resource production rate per second.
   *
   * Null indicates that the save did not provide
   * a production rate. It does not mean zero.
   */
  perSecond: string | null;

  /**
   * Raw production rate reported by the game.
   *
   * Kept separately from the effective production rate
   * because game modifiers may affect the final value.
   *
   * Null means that the value was unavailable.
   */
  rawPerSecond: string | null;
}

/**
 * Represents a complete snapshot of the player systems
 * currently supported by the calculator.
 *
 * A snapshot can describe either:
 *
 * 1. The player's imported game state.
 * 2. The player's state after simulated upgrades.
 *
 * Both use the same structure so the application can
 * compare them without special conversion logic.
 *
 * Additional systems, such as Synth, Fixtures, Research
 * and Fleet, will be added as their importers are built.
 */
export interface PlayerSnapshot {

  /** Resource balances and production rates. */
  resources: WorkspaceResource[];
  
  /**
   * Region selected for calculator simulations.
   *
   * This is independent of progression.currentRegionId,
   * which records the region occupied when the game
   * save was exported.
   *
   * Defaults to the imported region and can be changed
   * without modifying the original progression history.
   *
   * Valid values:
   * 1 = Surface
   * 2 = Antumbra
   * 3 = Penumbra
   * 4 = Umbra
   */
  farmingRegionId: number;
  
  /**
   * Current sector, region and progression history.
   *
   * Includes historical and current-run unlocks,
   * cleared sectors and region-specific progression.
   */
  progression: ImportedProgression;

  /**
   * Titan components and their purchased upgrade levels.
   *
   * Component levels are distinct from resource balances
   * and must be updated separately during simulations.
   */
  titanComponents: ImportedTitanComponent[];

  /**
   * Crew, Compute and Reactor upgrades currently
   * supported by the existing Crew importer.
   */
  crewUpgrades: ImportedCrewUpgrade[];

  /**
   * Warp progression, Skein balances, Residuum,
   * tethering information and purchased Warp nodes.
   */
  warps: ImportedWarps;
}

/**
 * Records the origin of a workspace's imported baseline.
 *
 * This information helps identify which game version
 * produced the save and when it was imported.
 *
 * Import metadata should remain unchanged during
 * calculator simulations.
 */
export interface WorkspaceSource {

  /** Game version recorded in the imported save. */
  gameVersion: string;

  /**
   * Save compatibility version.
   *
   * Used to identify save format changes that might
   * require updates to our decoder or extractors.
   */
  compatibilityVersion: number;

  /**
   * Timestamp extracted from the game save.
   *
   * This may reflect a newly exported historical save,
   * rather than the date a sector was originally reached.
   *
   * Null indicates that the timestamp was unavailable.
   */
  gameSaveTimestamp: number | null;

  /**
   * ISO 8601 timestamp recording when the save was
   * imported into the calculator.
   *
   * This is calculator metadata, not an in-game
   * progression timestamp.
   */
  importedAt: string;
}

/**
 * Holds the player's active calculator workspace.
 *
 * This is the central data structure for our
 * guest-first architecture.
 *
 * It exists independently of authentication and
 * does not require a Supabase user ID.
 *
 * The imported baseline preserves the original
 * game state, while the simulated state holds
 * changes made through the calculator.
 *
 * Supabase persistence will be handled separately
 * and will only be available to signed-in users.
 */
export interface PlayerWorkspace {

  /**
   * Information about the imported game's origin.
   *
   * Used for version compatibility, comparison
   * and identifying the imported baseline.
   */
  source: WorkspaceSource;

  /**
   * Original imported player state.
   *
   * This is our reference point for all calculations.
   *
   * Simulated purchases and region changes must
   * never modify this snapshot.
   *
   * A new game import may replace the baseline.
   */
  importedBaseline: PlayerSnapshot;

  /**
   * Current working state of the calculator.
   *
   * Calculations, upgrade purchases and other
   * simulated actions update this snapshot.
   *
   * Resetting a simulation restores a fresh copy
   * of the imported baseline.
   */
  simulatedState: PlayerSnapshot;

  /**
   * Indicates whether the working state differs
   * from the imported baseline.
   *
   * Used to warn users before discarding changes
   * or replacing their current workspace.
   *
   * This flag does not indicate whether the data
   * has been saved to Supabase.
   */
  hasUnsavedChanges: boolean;
}
