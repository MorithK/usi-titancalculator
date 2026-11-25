import Decimal from "decimal.js";
import type { ImportDefinitions } from "./importDefinitions";
import type { MappedResource } from "./resourceMapping";
import type { ImportedTitanComponent } from "./extractors/titanComponents";
import type { ImportedCrewUpgrade } from "./extractors/crewUpgrades";
import type { ImportedWarps } from "./extractors/warps";

export interface ImportChange {
  category: string;
  key: string;
  label: string;
  previous: string | null;
  incoming: string;
  status: "increase" | "decrease" | "unchanged" | "new" | "changed";
}

function classify(previous: string | null, incoming: string): ImportChange["status"] {
  if (previous === null) return "new";
  try {
    const a = new Decimal(previous);
    const b = new Decimal(incoming);
    if (a.isFinite() && b.isFinite()) {
      if (b.gt(a)) return "increase";
      if (b.lt(a)) return "decrease";
      return "unchanged";
    }
  } catch { /* values may be symbolic, e.g. a tethered Warp */ }
  return previous === incoming ? "unchanged" : "changed";
}

function item(category: string, key: string, label: string, previous: string | null, incoming: string): ImportChange {
  return { category, key, label, previous, incoming, status: classify(previous, incoming) };
}

export function buildImportChanges(
  resources: MappedResource[],
  titan: ImportedTitanComponent[],
  crew: ImportedCrewUpgrade[],
  warps: ImportedWarps,
  defs: ImportDefinitions
): ImportChange[] {
  const changes: ImportChange[] = [];
  for (const resource of resources) {
    changes.push(item("Resources", resource.gameResourceKey, resource.resourceName,
      resource.currentAmount, resource.amount));
  }
  const currentComponents = new Map(defs.current.components.map(x => [x.slot_number, x]));
  const coreNames = new Map(defs.core.map(x => [x.core_upgrade_id, x.core_upgrade_name]));
  for (const incoming of titan) {
    const old = currentComponents.get(incoming.slotNumber);
    const oldId = old?.core_upgrade_id ?? null;
    if (oldId !== null && oldId !== incoming.coreUpgradeId) {
      changes.push(item("Titan Components", `slot-type-${incoming.slotNumber}`,
        `Slot ${incoming.slotNumber} equipped`, coreNames.get(oldId) ?? String(oldId), incoming.name));
    }
    changes.push(item("Titan Components", `slot-level-${incoming.slotNumber}`,
      `Slot ${incoming.slotNumber} level`, old ? String(old.current_level) : null, String(incoming.level)));
  }
  const currentCrew = new Map(defs.current.crew.map(x => [x.crew_upgrade_id, x.current_level]));
  for (const incoming of crew) {
    const old = currentCrew.get(incoming.crewUpgradeId);
    changes.push(item("Crew / Compute / Reactor", incoming.saveName, incoming.name,
      old === undefined ? null : String(old), String(incoming.level)));
  }
  const warpRefs = new Map(defs.warps.map(x => [x.warp_name, x.warp_id]));
  const currentWarps = new Map(defs.current.warps.map(x => [x.warp_id, x]));
  for (const incoming of warps.warps) {
    const old = currentWarps.get(warpRefs.get(incoming.warpName) ?? -1);
    changes.push(item("Warps", `max-${incoming.warpName}`, `${incoming.warpName} max difficulty`,
      old ? String(old.max_difficulty) : null, String(incoming.maxDifficulty)));
    changes.push(item("Warps", `skein-${incoming.warpName}`, `${incoming.warpName} Skein`,
      old ? String(old.current_skein) : null, incoming.currentSkein));
    changes.push(item("Warps", `unlocked-${incoming.warpName}`, `${incoming.warpName} unlocked`,
      old ? String(old.unlocked) : null, String(incoming.unlocked)));
  }
  const nodeIds = new Map(defs.nodes.map(x => [x.save_name, x.warp_node_id]));
  const currentNodes = new Map(defs.current.nodes.map(x => [x.warp_node_id, x]));
  for (const incoming of warps.nodes) {
    const old = currentNodes.get(nodeIds.get(incoming.saveName) ?? -1);
    changes.push(item("Warp Nodes", incoming.saveName, incoming.saveName,
      old ? String(old.current_level) : null, String(incoming.level)));
  }
  const tetherName = defs.warps.find(x => x.warp_id === defs.current.tetheredWarpId)?.warp_name ?? null;
  changes.push(item("Warps", "tether", "Tethered Warp", tetherName, warps.tetheredWarpName));
  return changes;
}
