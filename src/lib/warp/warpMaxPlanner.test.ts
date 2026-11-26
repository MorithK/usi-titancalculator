
import { calculateWarpMax } from "./warpMaxPlanner";
import type { WarpNode } from "./warpPlanner";

const nodes: WarpNode[] = [
  {
    id: 1,
    name: "Prerequisite",
    level: 1,
    maxLevel: 10,
    cost: "128",
    prerequisites: [],
  },
  {
    id: 2,
    name: "Target",
    level: 3,
    maxLevel: 10,
    cost: "256",
    prerequisites: [1],
  },
];

function check(
  name: string,
  targetId: number,
  data: WarpNode[],
  expectedStatus: string,
  expectedCost: string | null
) {
  const result = calculateWarpMax(targetId, data, "228");

  if (
    result.status !== expectedStatus ||
    result.totalCost !== expectedCost
  ) {
    throw new Error(`${name}: ${JSON.stringify(result)}`);
  }

  console.log(`✓ ${name}`, result);
}

check("Seven levels remaining", 2, nodes, "available", "1792");

check(
  "Locked upgrade",
  2,
  nodes.map(node =>
    node.id === 1 ? { ...node, level: 0 } : node
  ),
  "locked",
  null
);

check(
  "Already maxed",
  2,
  nodes.map(node =>
    node.id === 2 ? { ...node, level: 10 } : node
  ),
  "maxed",
  "0"
);

console.log("All Warp max-level tests passed!");
