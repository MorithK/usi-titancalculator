
import Decimal from "decimal.js";

export type WarpNode = {
  id: number;
  name: string;
  level: number;
  maxLevel: number;
  cost: string;
  prerequisites: number[];
};

export type WarpPlanResult = {
  status: "unlocked" | "planned" | "locked" | "maxed";
  requiredNodes: number[];
  totalCost: string | null;
  remainingSkein: string | null;
};

export function calculateWarpObjective(
  targetId: number,
  nodes: WarpNode[],
  selected: Set<number>,
  currentSkein: string
): WarpPlanResult {
  const byId = new Map(nodes.map(node => [node.id, node]));
  const required = new Set<number>();
  const visiting = new Set<number>();

  function visit(nodeId: number): boolean {
    const node = byId.get(nodeId);

    if (!node) {
      throw new Error(`Unknown Warp node ${nodeId}`);
    }

    // A purchased level satisfies an unlock prerequisite.
    if (nodeId !== targetId && node.level > 0) {
        return true;
      }

    // Missing prerequisites must be explicitly selected.
    if (nodeId !== targetId && !selected.has(nodeId)) {
      return false;
    }

    if (visiting.has(nodeId)) {
      throw new Error("Circular Warp dependency detected.");
    }

    visiting.add(nodeId);

    for (const prerequisite of node.prerequisites) {
      if (!visit(prerequisite)) {
        visiting.delete(nodeId);
        return false;
      }
    }

    visiting.delete(nodeId);
    required.add(nodeId);

    return true;
  }

  const target = byId.get(targetId);

  if (!target) {
    throw new Error("Unknown target Warp node.");
  }

  if (target.level >= target.maxLevel) {
    return {
      status: "maxed",
      requiredNodes: [],
      totalCost: null,
      remainingSkein: null,
    };
  }

  const alreadyUnlocked = target.prerequisites.every(id => {
    const node = byId.get(id);
    if (!node) throw new Error(`Unknown prerequisite ${id}`);
    return node.level > 0;
  });

  if (!alreadyUnlocked && !selected.has(targetId)) {
    return {
      status: "locked",
      requiredNodes: [],
      totalCost: null,
      remainingSkein: null,
    };
  }

  const canPlan = visit(targetId);

  if (!canPlan) {
    return {
      status: "locked",
      requiredNodes: [],
      totalCost: null,
      remainingSkein: null,
    };
  }

  let total = new Decimal(0);

  for (const id of required) {
    total = total.plus(byId.get(id)!.cost);
  }

  const remaining = Decimal.max(
    0,
    total.minus(currentSkein)
  );

  return {
    status: alreadyUnlocked ? "unlocked" : "planned",
    requiredNodes: [...required],
    totalCost: total.toString(),
    remainingSkein: remaining.toString(),
  };
}
