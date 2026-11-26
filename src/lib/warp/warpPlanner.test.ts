
import {
  calculateWarpObjective,
  type WarpNode,
} from "./warpPlanner";

function test(
  name: string,
  nodes: WarpNode[],
  selected: number[],
  targetId: number,
  skein: string,
  expectedStatus: string,
  expectedRemaining: string | null
) {
  const result = calculateWarpObjective(
    targetId,
    nodes,
    new Set(selected),
    skein
  );

  const passed =
    result.status === expectedStatus &&
    result.remainingSkein === expectedRemaining;

  console.log(
    `${passed ? "✓" : "✗"} ${name}`,
    result
  );

  if (!passed) {
    throw new Error(`Test failed: ${name}`);
  }
}

const nodes: WarpNode[] = [
  {
    id: 1,
    name: "Warp Discharge Speed",
    level: 10,
    maxLevel: 10,
    cost: "64",
    prerequisites: [],
  },
  {
    id: 6,
    name: "Specimen Gain",
    level: 0,
    maxLevel: 10,
    cost: "128",
    prerequisites: [1],
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
    name: "Another Upgrade",
    level: 0,
    maxLevel: 10,
    cost: "512",
    prerequisites: [6, 7],
  },
];

// Test 1: Selected prerequisite
test(
  "Titan Battle with Specimen Gain selected",
  nodes, [6, 7], 7, "11.94",
  "planned", "372.06"
);

// Test 2: Missing prerequisite selection
test(
  "Titan Battle without Specimen Gain selected",
  nodes, [7], 7, "11.94",
  "locked", null
);

// Test 3: Already purchased prerequisite
test(
  "Titan Battle with Specimen Gain purchased",
  nodes.map(n =>
    n.id === 6 ? { ...n, level: 1 } : n
  ),
  [7], 7, "11.94",
  "unlocked", "244.06"
);

// Test 4: Multi-level dependencies
test(
  "Upgrade requiring Specimen Gain and Titan Battle",
  nodes, [6, 7, 8], 8, "11.94",
  "planned", "884.06"
);

// Test 5: Existing target level
test(
  "Titan Battle level 3 to 4",
  nodes.map(n =>
    n.id === 7 ? { ...n, level: 3 } :
    n.id === 6 ? { ...n, level: 1 } : n
  ),
  [7], 7, "11.94",
  "unlocked", "244.06"
);

// Test 6: Maximum level
test(
  "Maxed Titan Battle",
  nodes.map(n =>
    n.id === 7 ? { ...n, level: 10 } : n
  ),
  [7], 7, "11.94",
  "maxed", null
);

console.log("\nAll Warp planner tests passed!");
