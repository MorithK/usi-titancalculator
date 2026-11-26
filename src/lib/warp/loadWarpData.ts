
import { supabase } from "@/utils/supabase";
import type { WarpNode } from "./warpPlanner";

export async function loadWarpNodes(
  userId: string,
  warpId: number
): Promise<WarpNode[]> {
  const [nodesResult, dependenciesResult, playerResult] =
    await Promise.all([
      supabase
        .from("warp_nodes")
        .select(
          "warp_node_id,node_name,max_level,skein_cost::text"
        )
        .eq("warp_id", warpId)
        .order("sort_order"),

      supabase
        .from("warp_node_dependencies")
        .select("warp_node_id,prerequisite_node_id")
        .eq("warp_id", warpId),

      supabase
        .from("player_warp_nodes")
        .select("warp_node_id,current_level")
        .eq("user_id", userId),
    ]);

  const error =
    nodesResult.error ??
    dependenciesResult.error ??
    playerResult.error;

  if (error) {
    throw new Error(error.message);
  }

  const playerLevels = new Map(
    (playerResult.data ?? []).map(row => [
      row.warp_node_id,
      row.current_level,
    ])
  );

  const dependencies = new Map<number, number[]>();

  for (const row of dependenciesResult.data ?? []) {
    const existing = dependencies.get(row.warp_node_id) ?? [];
    existing.push(row.prerequisite_node_id);
    dependencies.set(row.warp_node_id, existing);
  }

  return (nodesResult.data ?? []).map(row => ({
    id: row.warp_node_id,
    name: row.node_name,
    level: playerLevels.get(row.warp_node_id) ?? 0,
    maxLevel: row.max_level,
    cost: row.skein_cost,
    prerequisites: dependencies.get(row.warp_node_id) ?? [],
  }));
}
