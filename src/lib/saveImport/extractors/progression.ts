
import { isLosslessNumber } from "lossless-json";
import type { USIDecodedSave } from "../types";

const REGION_NAMES = [
  "Surface",
  "Antumbra",
  "Penumbra",
  "Umbra",
] as const;

export interface RegionalProgression {
  regionId: number;
  name: string;
  historicalHighest: number;
  currentRunHighest: number;
  clearedSectorIds: string[];
}

export interface ImportedProgression {
  currentRegionId: number;
  currentRegionName: string;
  currentSector: number;
  currentSectorId: string;
  nextUmbraSector: number;
  regions: RegionalProgression[];
}

function readInteger(value: unknown, field: string): number {
  if (
    typeof value !== "number" &&
    !isLosslessNumber(value)
  ) {
    throw new Error(`Invalid ${field}.`);
  }

  const result = Number(value);

  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error(`Invalid ${field}.`);
  }

  return result;
}

function readRegionalNumbers(
  value: unknown,
  field: string
): number[] {
  if (!Array.isArray(value) || value.length !== 4) {
    throw new Error(`Invalid ${field}.`);
  }

  return value.map((item, index) =>
    readInteger(item, `${field}[${index}]`)
  );
}

export function extractProgression(
  save: USIDecodedSave
): ImportedProgression {
  const battle = save.data.BattleArea;
  const veil = save.data.VeilController;

  if (!battle || !veil) {
    throw new Error("Required progression records are missing.");
  }

  const layer = readInteger(
    veil.current_layer,
    "current_layer"
  );

  if (layer > 3) {
    throw new Error("Unsupported Veil region.");
  }

  const historical = readRegionalNumbers(
    veil.highest_sector,
    "highest_sector"
  );

  const currentRun = readRegionalNumbers(
    veil.highest_sector_this_reinforce,
    "highest_sector_this_reinforce"
  );

  const cleared = veil.sectors_cleared_this_run;

  if (!Array.isArray(cleared) || cleared.length !== 4) {
    throw new Error("Invalid cleared-sector records.");
  }

  const regions = REGION_NAMES.map((name, index) => {
    const sectorIds = cleared[index];

    if (
      !Array.isArray(sectorIds) ||
      !sectorIds.every(id => typeof id === "string")
    ) {
      throw new Error(`Invalid cleared sectors for ${name}.`);
    }

    if (currentRun[index] > historical[index]) {
      throw new Error(`Invalid progression for ${name}.`);
    }

    return {
      regionId: index + 1,
      name,
      historicalHighest: historical[index],
      currentRunHighest: currentRun[index],
      clearedSectorIds: [...sectorIds],
    };
  });

  const currentSector = readInteger(
    battle.sector_number,
    "sector_number"
  );

  if (typeof battle.sector_id_load !== "string") {
    throw new Error("Invalid current sector identifier.");
  }

  if (currentSector > currentRun[layer]) {
    throw new Error("Current sector exceeds run progression.");
  }

  return {
    currentRegionId: layer + 1,
    currentRegionName: REGION_NAMES[layer],
    currentSector,
    currentSectorId: battle.sector_id_load,
    nextUmbraSector: readInteger(
      veil.umbra_sector_number,
      "umbra_sector_number"
    ),
    regions,
  };
}
