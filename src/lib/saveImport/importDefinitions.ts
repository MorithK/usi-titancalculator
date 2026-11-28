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
export interface ImportDefinitions {
  core: CoreDefinition[];
  crew: CrewDefinition[];
  warps: WarpDefinition[];
  nodes: WarpNodeDefinition[];
  current: ExistingImportState;
}

export async function loadImportDefinitions(): Promise<ImportDefinitions> {
  const { data: auth, error: authError } = await supabase.auth.getUser();
  if (authError || !auth.user) throw new Error("Player is not authenticated.");
  const uid = auth.user.id;

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
    ),
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
    ).eq("user_id", uid).maybeSingle(),
  ]);

  for (const result of results) {
    if (result.error) throw new Error(result.error.message);
  }
  const rows = (index: number) => (results[index].data ?? []) as unknown[];

  const core = rows(0) as CoreDefinition[];
  const crew = rows(1) as CrewDefinition[];
  const warps = rows(2) as WarpDefinition[];
  const nodes = rows(3) as WarpNodeDefinition[];

  if (core.length === 0 || crew.length === 0 || nodes.length === 0) {
    throw new Error("Game import reference definitions are missing.");
  }
  if (core.some(x => !x.game_component_id || !x.game_upgrade_prefix) ||
      crew.some(x => !x.game_save_key)) {
    throw new Error("Game import reference mappings are incomplete.");
  }

  const tether = results[8].data as { tethered_warp_id: number | null } | null;
  const player = results[9].data as { last_update: string | null } | null;
  return {
    core, crew, warps, nodes,
    current: {
      components: rows(4) as ExistingImportState["components"],
      crew: rows(5) as ExistingImportState["crew"],
      warps: rows(6) as ExistingImportState["warps"],
      nodes: rows(7) as ExistingImportState["nodes"],
      tetheredWarpId: tether?.tethered_warp_id ?? null,
      playerUpdatedAt: player?.last_update ?? null,
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

