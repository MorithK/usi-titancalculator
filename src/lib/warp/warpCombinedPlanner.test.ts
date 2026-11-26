
import {
  calculateCombinedWarpPlan,
} from "./warpCombinedPlanner";
import type { WarpNode } from "./warpPlanner";

const nodes: WarpNode[] = [
  {
    id: 6,
    name: "Specimen Gain",
    level: 0,
    maxLevel: 10,
    cost: "128",
    prerequisites: [],
  },
  {
    id: 7,
    name: "Titan Battle",
    level: 0,
    maxLevel: 10,
    cost: "256",
    prerequisites: [6],
  },
  {
    id: 8,
    name: "Additional Upgrade",
    level: 0,
    maxLevel: 10,
    cost: "512",
    prerequisites: [6, 7],
  },
];

function check(
  name: string,
  selectedIds: number[],
  expectedCost: string | null,
  expectedRemaining: string | null,
  sourceNodes: WarpNode[] = nodes
) {
  const result = calculateCombinedWarpPlan(
    sourceNodes,
    new Set(selectedIds),
    "228"
  );

  if (
    result.totalCost !== expectedCost ||
    result.remainingSkein !== expectedRemaining
  ) {
    throw new Error(
      `${name}: unexpected result ${JSON.stringify(result)}`
    );
  }

  console.log(`✓ ${name}`, result);
}

check(
  "Specimen and Titan Battle",
  [6, 7],
  "384",
  "156"
);

check(
  "Three upgrades sharing prerequisites",
  [6, 7, 8],
  "896",
  "668"
);

check(
  "Missing prerequisite blocks plan",
  [7],
  null,
  null
);

check(
  "Purchased prerequisite is not charged",
  [7],
  "256",
  "28",
  nodes.map(node =>
    node.id === 6 ? { ...node, level: 1 } : node
  )
);

check(
  "Purchased node explicitly selected for another level",
  [6, 7],
  "384",
  "156",
  nodes.map(node =>
    node.id === 6 ? { ...node, level: 1 } : node
  )
);

console.log("All combined Warp planner tests passed!");
