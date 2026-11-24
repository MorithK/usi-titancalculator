import { isLosslessNumber } from "lossless-json";
import type { USIDecodedSave } from "../types";
import type { CoreDefinition } from "../importDefinitions";

export interface ImportedTitanComponent {
  slotNumber: number;
  coreUpgradeId: number;
  name: string;
  level: number;
  gameSaveKey: string;
}

export function extractTitanComponents(
  save: USIDecodedSave,
  definitions: CoreDefinition[]
): ImportedTitanComponent[] {
  const result: ImportedTitanComponent[] = [];
  const seen = new Set<number>();
  const prefixes = definitions
    .filter(def => def.game_upgrade_prefix)
    .sort((a, b) => b.game_upgrade_prefix!.length - a.game_upgrade_prefix!.length);

  if (new Set(prefixes.map(def => def.game_upgrade_prefix)).size !== prefixes.length) {
    throw new Error("Duplicate Titan component game key mapping.");
  }

  for (const record of save.records) {
    const key = record.save_name;
    if (typeof key !== "string" || !key.startsWith("CoreTitan")) continue;
    const definition = prefixes.find(def => {
      const prefix = def.game_upgrade_prefix!;
      return key.startsWith(prefix) && /^[0-6]$/.test(key.slice(prefix.length));
    });
    if (!definition) throw new Error(`Unrecognized Titan component: ${key}`);
    const slotNumber = Number(key.slice(definition.game_upgrade_prefix!.length)) + 1;
    const type = definition.component_type;
    const validSlot =
      slotNumber <= 3 ? type === "Weapon" :
      slotNumber === 4 ? type === "Array" :
      slotNumber === 5 ? type === "Shield" :
      type === "Utility";
    if (!validSlot || seen.has(slotNumber)) {
      throw new Error(`Invalid or duplicate Titan slot: ${key}`);
    }

    const value = record.amount_have;
    if (typeof value !== "number" && !isLosslessNumber(value)) {
      throw new Error(`Invalid Titan level: ${key}`);
    }
    const level = Number(value);
    if (!Number.isSafeInteger(level) || level < 0 || level > 2147483647) {
      throw new Error(`Invalid Titan level: ${key}`);
    }
    seen.add(slotNumber);
    result.push({
      slotNumber,
      coreUpgradeId: definition.core_upgrade_id,
      name: definition.core_upgrade_name,
      level,
      gameSaveKey: key,
    });
  }
  if (result.length !== 7 || seen.size !== 7) {
    throw new Error("Expected exactly seven unique Titan slots.");
  }
  const utilities = result.filter(item => item.slotNumber >= 6).map(item => item.coreUpgradeId);
  if (new Set(utilities).size !== utilities.length) {
    throw new Error("Titan utilities must be distinct.");
  }
  return result.sort((a, b) => a.slotNumber - b.slotNumber);
}
