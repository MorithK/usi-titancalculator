
import { isLosslessNumber } from "lossless-json";
import type { USIDecodedSave } from "../types";

const WARP_NAMES = [
  "Senectus",
  "Tiberinus",
  "Ullr",
] as const;

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

function asRecord(
  value: unknown
): Record<string, unknown> {
  if (
    value === null ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new Error("Invalid Warp save record.");
  }

  return value as Record<string, unknown>;
}

function readDecimal(
  value: unknown,
  field: string
): string {
  if (isLosslessNumber(value)) {
    return value.toString();
  }

  if (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0
  ) {
    return value.toString();
  }

  throw new Error(`Invalid ${field}.`);
}

function readInteger(
  value: unknown,
  field: string
): number {
  const result = Number(readDecimal(value, field));

  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error(`Invalid ${field}.`);
  }

  return result;
}

function readBoolean(
  value: unknown,
  field: string
): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid ${field}.`);
  }

  return value;
}

export function extractWarps(
  save: USIDecodedSave
): ImportedWarps {
  const warpRecord = asRecord(save.data.Warps);
  const player = asRecord(save.data.PlayerInfo);

  const warpStates = asRecord(warpRecord.warps_load);
  const balances = asRecord(player.resources_load);
  const lifetime = asRecord(
    player.resource_totals_gained_load
  );

  const tetheredWarpName = warpRecord.tether_target;

  if (
    typeof tetheredWarpName !== "string" ||
    !WARP_NAMES.some(name => name === tetheredWarpName)
  ) {
    throw new Error(
      "Unsupported or missing Titan Warp tether."
    );
  }

  const warps = WARP_NAMES.map(warpName => {
    const state = asRecord(warpStates[warpName]);

    return {
      warpName,
      unlocked: !readBoolean(
        state.locked,
        `${warpName}.locked`
      ),
      maxDifficulty: readInteger(
        state.max_difficulty,
        `${warpName}.max_difficulty`
      ),
      numCompletions: readInteger(
        state.num_completions,
        `${warpName}.num_completions`
      ),
      currentSkein: readDecimal(
        balances[`${warpName}Skein`],
        `${warpName}Skein`
      ),
      lifetimeSkein: readDecimal(
        lifetime[`${warpName}Skein`],
        `${warpName}Skein lifetime`
      ),
    };
  });

  const nodes: ImportedWarpNode[] = [];
  const seen = new Set<string>();

  for (const record of save.records) {
    const name = record.save_name;

    if (typeof name !== "string") continue;

    if (
      !WARP_NAMES.some(warp =>
        name.startsWith(warp)
      )
    ) {
      continue;
    }

    if (seen.has(name)) {
      throw new Error(`Duplicate Warp node: ${name}`);
    }

    seen.add(name);

    nodes.push({
      saveName: name,
      level: readInteger(
        record.amount_purchased,
        `${name}.amount_purchased`
      ),
      unlocked: readBoolean(
        record.unlocked,
        `${name}.unlocked`
      ),
    });
  }

  if (nodes.length === 0) {
    throw new Error("No Titan Warp nodes found.");
  }

  return {
    tetheredWarpName,
    residium: readDecimal(
      balances.WarpResiduum,
      "WarpResiduum"
    ),
    warps,
    nodes,
  };
}
