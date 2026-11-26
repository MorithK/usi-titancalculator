
import Decimal from "decimal.js";
import type { WarpNode } from "./warpPlanner";

export type WarpMaxResult = {
  status: "locked" | "available" | "maxed";
  levelsRemaining: number;
  totalCost: string | null;
  remainingSkein: string | null;
};

export function calculateWarpMax(
  targetId: number,
  nodes: WarpNode[],
  currentSkein: string
): WarpMaxResult {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const target = byId.get(targetId);

  if (!target) {
    throw new Error(`Unknown Warp node ${targetId}`);
  }

  const levelsRemaining = Math.max(
    0,
    target.maxLevel - target.level
  );

  if (levelsRemaining === 0) {
    return {
      status: "maxed",
      levelsRemaining: 0,
      totalCost: "0",
      remainingSkein: "0",
    };
  }

  const unlocked = target.prerequisites.every(id => {
    const prerequisite = byId.get(id);

    if (!prerequisite) {
      throw new Error(`Unknown prerequisite ${id}`);
    }

    return prerequisite.level > 0;
  });

  if (!unlocked) {
    return {
      status: "locked",
      levelsRemaining,
      totalCost: null,
      remainingSkein: null,
    };
  }

  const total = new Decimal(target.cost).times(
    levelsRemaining
  );

  return {
    status: "available",
    levelsRemaining,
    totalCost: total.toString(),
    remainingSkein: Decimal.max(
      0,
      total.minus(currentSkein)
    ).toString(),
  };
}
