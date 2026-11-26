
import Decimal from "decimal.js";
import {
  calculateWarpObjective,
  type WarpNode,
} from "./warpPlanner";

export type WarpCombinedPlan = {
  status: "empty" | "ready" | "blocked";
  requiredNodes: number[];
  blockedNodes: number[];
  totalCost: string | null;
  remainingSkein: string | null;
};

export function calculateCombinedWarpPlan(
  nodes: WarpNode[],
  selected: Set<number>,
  currentSkein: string
): WarpCombinedPlan {
  if (selected.size === 0) {
    return {
      status: "empty",
      requiredNodes: [],
      blockedNodes: [],
      totalCost: "0",
      remainingSkein: "0",
    };
  }

  const byId = new Map(nodes.map(node => [node.id, node]));
  const required = new Set<number>();
  const blocked: number[] = [];

  for (const targetId of selected) {
    const result = calculateWarpObjective(
      targetId,
      nodes,
      selected,
      currentSkein
    );

    if (result.status === "locked") {
      blocked.push(targetId);
      continue;
    }

    if (result.status === "maxed") {
      continue;
    }

    for (const nodeId of result.requiredNodes) {
      required.add(nodeId);
    }
  }

  // A partial plan must not be presented as a complete total.
  if (blocked.length > 0) {
    return {
      status: "blocked",
      requiredNodes: [...required],
      blockedNodes: blocked,
      totalCost: null,
      remainingSkein: null,
    };
  }

  let total = new Decimal(0);

  for (const nodeId of required) {
    const node = byId.get(nodeId);

    if (!node) {
      throw new Error(`Unknown Warp node ${nodeId}`);
    }

    total = total.plus(node.cost);
  }

  const remaining = Decimal.max(
    0,
    total.minus(currentSkein)
  );

  return {
    status: "ready",
    requiredNodes: [...required],
    blockedNodes: [],
    totalCost: total.toString(),
    remainingSkein: remaining.toString(),
  };
}
