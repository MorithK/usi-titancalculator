import { isLosslessNumber } from "lossless-json";
import type { USIDecodedSave } from "../types";
import type { WarpDefinition, WarpNodeDefinition } from "../importDefinitions";

export interface ImportedWarp {
  warpName: string;
  unlocked: boolean;
  maxDifficulty: number;
  numCompletions: number;
  currentSkein: string;
  lifetimeSkein: string;
}
export interface ImportedWarpNode {
  saveName: string;
  level: number;
  unlocked: boolean;
}
export interface ImportedWarps {
  tetheredWarpName: string;
  residium: string;
  warps: ImportedWarp[];
  nodes: ImportedWarpNode[];
}
function asRecord(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid ${label} record.`);
  }
  return value as Record<string, unknown>;
}
function decimal(value: unknown, field: string): string {
  if (isLosslessNumber(value) || (typeof value === "number" && Number.isFinite(value))) {
    const text = value.toString();
    if (text.startsWith("-")) throw new Error(`Negative ${field}.`);
    return text;
  }
  throw new Error(`Invalid ${field}.`);
}
function integer(value: unknown, field: string): number {
  const result = Number(decimal(value, field));
  if (!Number.isSafeInteger(result) || result < 0 || result > 2147483647) {
    throw new Error(`Invalid ${field}.`);
  }
  return result;
}
function boolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") throw new Error(`Invalid ${field}.`);
  return value;
}
export function extractWarps(
  save: USIDecodedSave,
  definitions: WarpDefinition[],
  nodeDefinitions: WarpNodeDefinition[]
): ImportedWarps {
  const warpRecord = asRecord(save.data.Warps, "Warps");
  const player = asRecord(save.data.PlayerInfo, "PlayerInfo");
  const warpStates = asRecord(warpRecord.warps_load, "warps_load");
  const balances = asRecord(player.resources_load, "resources_load");
  const lifetime = asRecord(player.resource_totals_gained_load, "resource_totals_gained_load");

  // An unfinished Warp reference row (Verminus, for example) does not
  // cause imports to fail. The supported set is derived from defined nodes.
  const supportedIds = new Set(nodeDefinitions.map(node => node.warp_id));
  const supported = definitions.filter(warp => supportedIds.has(warp.warp_id));
  if (supported.length === 0) {
    throw new Error("No supported Titan Warp definitions found.");
  }
  const tetheredWarpName = warpRecord.tether_target;
  if (typeof tetheredWarpName !== "string" ||
      !supported.some(def => def.game_save_key === tetheredWarpName)) {
    throw new Error("Unsupported or missing Titan Warp tether.");
  }
  const warps = supported.map(def => {
    const key = def.game_save_key;
    const skein = def.skein_resource_key;
    if (!key || !skein) throw new Error(`Incomplete Warp reference: ${def.warp_name}`);
    const state = asRecord(warpStates[key], `${key} Warp state`);
    return {
      warpName: def.warp_name,
      unlocked: !boolean(state.locked, `${key}.locked`),
      maxDifficulty: integer(state.max_difficulty, `${key}.max_difficulty`),
      numCompletions: integer(state.num_completions, `${key}.num_completions`),
      currentSkein: decimal(balances[skein], skein),
      lifetimeSkein: decimal(lifetime[skein], `${skein} lifetime`),
    };
  });
  const nodes = nodeDefinitions.map(def => {
    const record = save.data[def.save_name];
    if (!record) throw new Error(`Missing Warp node: ${def.save_name}`);
    const level = integer(record.amount_purchased, `${def.save_name}.amount_purchased`);
    if (level > def.max_level) throw new Error(`Warp level exceeds maximum: ${def.save_name}`);
    return {
      saveName: def.save_name,
      level,
      unlocked: boolean(record.unlocked, `${def.save_name}.unlocked`),
    };
  });
  return {
    tetheredWarpName: supported.find(def => def.game_save_key === tetheredWarpName)!.warp_name,
    residium: decimal(balances.WarpResiduum, "WarpResiduum"),
    warps,
    nodes,
  };
}
