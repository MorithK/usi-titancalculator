
import { isLosslessNumber } from "lossless-json";
import type { USIDecodedSave } from "../types";

export interface ImportedTitanComponent {
  slotNumber: number;
  coreUpgradeId: number;
  name: string;
  level: number;
  gameSaveKey: string;
}

const COMPONENTS: Record<string, {
  id: number;
  name: string;
}> = {
  Cannon: { id: 1, name: "Titan Cannon" },
  Laser: { id: 2, name: "Titan Laser" },
  Shockwave: { id: 3, name: "Shockwave Cannon" },
  ShockwaveCannon: { id: 3, name: "Shockwave Cannon" },
  Array: { id: 4, name: "Titan Array" },
  Shield: { id: 5, name: "Titan Shield" },
  ComputeEnhancer: { id: 6, name: "Compute Enhancer" },
  SpliceLab: { id: 7, name: "Splicing Lab" },
  SynthEnhancer: { id: 8, name: "Synth Enhancer" },
};

export function extractTitanComponents(
  save: USIDecodedSave
): ImportedTitanComponent[] {
  const result: ImportedTitanComponent[] = [];
  const seen = new Set<number>();

  for (const record of save.records) {
    if (typeof record.save_name !== "string") continue;
    if (!record.save_name.startsWith("CoreTitan")) continue;

    const match = /^CoreTitan(.+?)([0-6])$/.exec(
      record.save_name
    );

    if (!match) {
      throw new Error(
        `Unknown Titan component: ${record.save_name}`
      );
    }

    const definition = COMPONENTS[match[1]];

    if (!definition) {
      throw new Error(
        `Unrecognized Titan component: ${record.save_name}`
      );
    }

    const slotNumber = Number(match[2]) + 1;

    const validSlot =
      slotNumber <= 3
        ? definition.id >= 1 && definition.id <= 3
        : slotNumber === 4
          ? definition.id === 4
          : slotNumber === 5
            ? definition.id === 5
            : definition.id >= 6 && definition.id <= 8;

    if (!validSlot || seen.has(slotNumber)) {
      throw new Error(
        `Invalid or duplicate Titan slot: ${record.save_name}`
      );
    }

    const value = record.amount_have;

    if (
      typeof value !== "number" &&
      !isLosslessNumber(value)
    ) {
      throw new Error(
        `Invalid Titan level: ${record.save_name}`
      );
    }

    const level = Number(value);

    if (
      !Number.isSafeInteger(level) ||
      level < 0 ||
      level > 2147483647
    ) {
      throw new Error(
        `Invalid Titan level: ${record.save_name}`
      );
    }

    seen.add(slotNumber);

    result.push({
      slotNumber,
      coreUpgradeId: definition.id,
      name: definition.name,
      level,
      gameSaveKey: record.save_name,
    });
  }

  if (result.length !== 7 || seen.size !== 7) {
    throw new Error(
      "Expected exactly seven unique Titan slots."
    );
  }

  const utilities = result
    .filter(item => item.slotNumber >= 6)
    .map(item => item.coreUpgradeId);

  if (new Set(utilities).size !== utilities.length) {
    throw new Error(
      "Titan utilities must be distinct."
    );
  }

  return result.sort(
    (a, b) => a.slotNumber - b.slotNumber
  );
}
