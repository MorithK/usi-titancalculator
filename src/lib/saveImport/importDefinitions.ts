import { supabase } from "@/utils/supabase";

export interface CoreDefinition {
  core_upgrade_id: number;
  core_upgrade_name: string;
  component_type: string;
  game_component_id: string | null;
  game_upgrade_prefix: string | null;
}
export interface CrewDefinition {
  crew_upgrade_id: number;
  crew_upgrade_name: string;
  game_save_key: string | null;
}
export interface WarpDefinition {
  warp_id: number;
  warp_name: string;
  game_save_key: string | null;
  skein_resource_key: string | null;
}
export interface WarpNodeDefinition {
  warp_node_id: number;
  warp_id: number;
  node_name: string;
  save_name: string;
  max_level: number;
}

/**
 * Contains the game reference definitions required to
 * interpret an imported save.
 *
 * These definitions describe game systems, not an
 * individual player's progression.
 *
 * They can therefore be shared between guest and
 * authenticated calculator sessions.
 */
export interface PublicImportDefinitions {

  /** Supported Titan components and their save mappings. */
  core: CoreDefinition[];

  /** Crew, Compute and Reactor upgrade mappings. */
  crew: CrewDefinition[];

  /** Supported Warp definitions and game save keys. */
  warps: WarpDefinition[];

  /** Warp nodes and their maximum upgrade levels. */
  nodes: WarpNodeDefinition[];
}

export interface ExistingImportState {
  components: Array<{ slot_number: number; core_upgrade_id: number; current_level: number }>;
  crew: Array<{ crew_upgrade_id: number; current_level: number }>;
  warps: Array<{ warp_id: number; unlocked: boolean; max_difficulty: number; current_skein: string }>;
  nodes: Array<{ warp_node_id: number; current_level: number; unlocked: boolean }>;
  tetheredWarpId: number | null;
  playerUpdatedAt: string | null;
}

/**
 * Contains the information required by the existing
 * authenticated game-save importer.
 *
 * Inherits the public game definitions and adds
 * the signed-in player's current database state.
 *
 * Guest imports will use PublicImportDefinitions
 * directly, without requesting private player data.
 */
export interface ImportDefinitions
  extends PublicImportDefinitions {

  /** Existing player state used for import comparisons. */
  current: ExistingImportState;
}


/**
 * Loads the reference definitions and existing player
 * state required by the authenticated game-save importer.
 *
 * Public game definitions are retrieved through
 * loadPublicImportDefinitions(), so both guest and
 * authenticated importers share the same mappings.
 *
 * Private progression is loaded separately using the
 * authenticated player's user ID.
 *
 * This function only reads data from Supabase.
 * It does not modify the player's saved progression.
 *
 * @throws If the player is not authenticated.
 * @throws If a reference or player-state query fails.
 */
export async function loadImportDefinitions():
  Promise<ImportDefinitions> {

  // Verify that a player is currently authenticated.
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error("Player is not authenticated.");
  }

  // Identify the player whose existing state we need.
  const uid = auth.user.id;

  /*
   * Load public definitions and the player's existing
   * database state.
   *
   * The public loader handles all reference mappings,
   * avoiding the duplicate queries and validation logic
   * previously maintained in this function.
   */
  const [definitions, results] = await Promise.all([

    // Load common game reference definitions.
    loadPublicImportDefinitions(),

    // Load the authenticated player's existing state.
    Promise.all([
      supabase.from("player_titan_components").select(
        "slot_number,core_upgrade_id,current_level"
      ).eq("user_id", uid),

      supabase.from("player_crew_upgrades").select(
        "crew_upgrade_id,current_level"
      ).eq("user_id", uid),

      supabase.from("player_warps").select(
        "warp_id,unlocked,max_difficulty,current_skein::text"
      ).eq("user_id", uid),

      supabase.from("player_warp_nodes").select(
        "warp_node_id,current_level,unlocked"
      ).eq("user_id", uid),

      supabase.from("player_warp_state").select(
        "tethered_warp_id"
      ).eq("user_id", uid).maybeSingle(),

      supabase.from("player_saves").select(
        "last_update"
      ).eq("user_id", uid).maybeSingle()
    ])
  ]);

  // Detect failed queries before interpreting the results.
  for (const result of results) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  /**
   * Returns the row array from one player-data query.
   *
   * Empty query results become empty arrays.
   * Single-row queries are handled separately below.
   */
  const rows = (index: number): unknown[] =>
    (results[index].data ?? []) as unknown[];

  // Read the player's currently selected tethered Warp.
  const tether = results[4].data as {
    tethered_warp_id: number | null;
  } | null;

  // Read the timestamp of the player's cloud save.
  const player = results[5].data as {
    last_update: string | null;
  } | null;

  /*
   * Combine public definitions with private player state.
   *
   * Spreading definitions copies its four reference
   * properties into the returned ImportDefinitions object.
   */
  return {
    ...definitions,

    current: {
      components: rows(0) as ExistingImportState["components"],
      crew: rows(1) as ExistingImportState["crew"],
      warps: rows(2) as ExistingImportState["warps"],
      nodes: rows(3) as ExistingImportState["nodes"],
      tetheredWarpId: tether?.tethered_warp_id ?? null,
      playerUpdatedAt: player?.last_update ?? null
    }
  };
}

/**
 * Loads game reference definitions without requesting
 * an authenticated player or their private progression.
 *
 * These definitions are used to translate game save
 * records into the calculator's internal identifiers.
 *
 * This function performs read-only Supabase queries.
 * Guest access also requires the corresponding database
 * tables or views to permit anonymous SELECT operations.
 *
 * No player data is read or modified.
 */
export async function loadPublicImportDefinitions():
  Promise<PublicImportDefinitions> {

  // Load the four sets of game reference definitions.
  const results = await Promise.all([
    supabase.from("core_upgrade_cost_reference").select(
      "core_upgrade_id,core_upgrade_name,component_type,game_component_id,game_upgrade_prefix"
    ),

    supabase.from("crew_upgrade_cost_reference").select(
      "crew_upgrade_id,crew_upgrade_name,game_save_key"
    ),

    supabase.from("warps").select(
      "warp_id,warp_name,game_save_key,skein_resource_key"
    ),

    supabase.from("warp_nodes").select(
      "warp_node_id,warp_id,node_name,save_name,max_level"
    )
  ]);

  // Stop if any reference query failed.
  for (const result of results) {
    if (result.error) {
      throw new Error(result.error.message);
    }
  }

  // Give the result sets their corresponding TypeScript types.
  const core = (results[0].data ?? []) as CoreDefinition[];
  const crew = (results[1].data ?? []) as CrewDefinition[];
  const warps = (results[2].data ?? []) as WarpDefinition[];
  const nodes = (results[3].data ?? []) as WarpNodeDefinition[];

  // Ensure the required definitions were retrieved.
  if (
    core.length === 0 ||
    crew.length === 0 ||
    nodes.length === 0
  ) {
    throw new Error(
      "Game import reference definitions are missing."
    );
  }

  // Check that all required import mappings are present.
  if (
    core.some(item =>
      !item.game_component_id ||
      !item.game_upgrade_prefix
    ) ||
    crew.some(item => !item.game_save_key)
  ) {
    throw new Error(
      "Game import reference mappings are incomplete."
    );
  }

  // Return definitions without any player-specific state.
  return {
    core,
    crew,
    warps,
    nodes
  };
}

