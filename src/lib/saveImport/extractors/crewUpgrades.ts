import { isLosslessNumber } from "lossless-json";
import type { USIDecodedSave } from "../types";
import type { CrewDefinition } from "../importDefinitions";

export interface ImportedCrewUpgrade {
  crewUpgradeId: number;
  saveName: string;
  name: string;
  level: number;
}

export function extractCrewUpgrades(
  save: USIDecodedSave,
  definitions: CrewDefinition[]
): ImportedCrewUpgrade[] {
  const keys = new Set<string>();
  return definitions.map(def => {
    const key = def.game_save_key;
    if (!key || keys.has(key)) throw new Error("Duplicate or missing Crew upgrade mapping.");
    keys.add(key);
    const record = save.data[key];
    if (!record) throw new Error(`Missing Crew upgrade save record: ${key}`);
    const value = record.amount_purchased;
    if (typeof value !== "number" && !isLosslessNumber(value)) {
      throw new Error(`Invalid Crew level: ${key}`);
    }
    const level = Number(value);
    if (!Number.isSafeInteger(level) || level < 0 || level > 2147483647) {
      throw new Error(`Invalid Crew level: ${key}`);
    }
    return {
      crewUpgradeId: def.crew_upgrade_id,
      saveName: key,
      name: def.crew_upgrade_name,
      level
    };
  });
}
