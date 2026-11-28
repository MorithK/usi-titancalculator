
import Decimal from "decimal.js";
import { supabase } from "@/utils/supabase";

import type { PlayerSnapshot } from
  "@/types/playerWorkspace";

import {
  simulatePurchases,
  type PurchaseItem,
  type PurchaseSimulation
} from "@/utils/purchaseMath";

import { AFFORDABLE_LEVEL_LIMIT } from
  "@/utils/upgradeMath";

/**
 * Purchase definition stored in the Titan reference table.
 *
 * Prices are retained as strings to avoid converting
 * large values into JavaScript floating-point numbers.
 */
export interface TitanPurchaseDefinition {
  core_upgrade_id: number;
  core_upgrade_name: string;
  base_cost: string;
  scale: string;
  resource_type_id: number;
  sector_unlock: number;
  component_type: string;
}

/**
 * Purchase definition stored in the Crew reference table.
 */
export interface CrewPurchaseDefinition {
  crew_upgrade_id: number;
  crew_upgrade_name: string;
  base_cost: string;
  scale: string;
  resource_type_id: number;
  upgrade_group: string;
  sector_unlock: number | null;
}

/** Public upgrade definitions needed by the simulator. */
export interface WorkspacePurchaseDefinitions {
  titan: TitanPurchaseDefinition[];
  crew: CrewPurchaseDefinition[];
}

export type WorkspacePurchaseType = "titan" | "crew";

/*
 * The current Crew calculator treats resource ID 10
 * as a combined requirement for all five specimens.
 */
const ALL_SPECIMENS_ID = 10;
const SPECIMEN_IDS = [5, 6, 7, 8, 9];

/**
 * Converts a database cost to a validated decimal string.
 *
 * This also rejects invalid reference configuration
 * before it can enter the purchase calculation.
 */
function price(value: unknown, label: string): string {
  if (typeof value !== "string" &&
      typeof value !== "number") {
    throw new Error(`Invalid ${label}.`);
  }

  const result = new Decimal(value);

  if (!result.isFinite() || result.lte(0)) {
    throw new Error(`Invalid ${label}.`);
  }

  return String(value);
}

/**
 * Loads public upgrade pricing and configuration.
 *
 * No authentication or player-specific queries are
 * required, and no data is written to Supabase.
 */
export async function loadPublicPurchaseDefinitions():
  Promise<WorkspacePurchaseDefinitions> {

  const [titanResult, crewResult] = await Promise.all([
    supabase
      .from("core_upgrade_cost_reference")
      .select(`
        core_upgrade_id,
        core_upgrade_name,
        base_cost::text,
        scale::text,
        resource_type_id,
        sector_unlock,
        component_type
      `),
 
      supabase
        .from("crew_upgrade_cost_reference")
        .select(`
          crew_upgrade_id,
          crew_upgrade_name,
          base_cost::text,
          scale::text,
          resource_type_id,
          upgrade_group
        `)
      
  ]);

  if (titanResult.error) {
    throw new Error(titanResult.error.message);
  }

  if (crewResult.error) {
    throw new Error(crewResult.error.message);
  }

  if (
    !titanResult.data?.length ||
    !crewResult.data?.length
  ) {
    throw new Error(
      "Purchase reference definitions are missing."
    );
  }

  /*
   * Normalize and validate the price fields.
   * The reference records remain independent of
   * any authenticated player.
   */
  const titan: TitanPurchaseDefinition[] =
    titanResult.data.map(row => ({
      ...row,
      base_cost: price(
        row.base_cost,
        `${row.core_upgrade_name} base cost`
      ),
      scale: price(
        row.scale,
        `${row.core_upgrade_name} scaling`
      )
    }));

    const crew: CrewPurchaseDefinition[] =
      crewResult.data.map(row => ({
        ...row,
    
        // The Crew cost reference table does not currently
        // contain a sector_unlock column.
        sector_unlock: null,
    
        base_cost: price(
          row.base_cost,
          `${row.crew_upgrade_name} base cost`
        ),
    
        scale: price(
          row.scale,
          `${row.crew_upgrade_name} scaling`
        )
      }));
    
  return { titan, crew };
}

/**
 * Resolves a reference resource requirement.
 *
 * Crew upgrades using ALL_SPECIMENS_ID require
 * a separate payment from each specimen balance.
 */
function requiredResources(resourceTypeId: number): number[] {
  return resourceTypeId === ALL_SPECIMENS_ID
    ? [...SPECIMEN_IDS]
    : [resourceTypeId];
}

/**
 * Constructs a purchase preview using actual reference
 * costs and the current simulated workspace state.
 *
 * selectedIds:
 * - Titan: slot numbers (1 through 7).
 * - Crew: upgrade IDs.
 *
 * requestedLevels defaults to 1 for controlled testing.
 * The existing purchase simulator enforces the 1000-level
 * upper limit.
 *
 * This function does not mutate the workspace or perform
 * a database operation.
 */
export function buildWorkspacePurchasePreview(
  snapshot: PlayerSnapshot,
  definitions: WorkspacePurchaseDefinitions,
  purchaseType: WorkspacePurchaseType,
  selectedIds: number[],
  requestedLevels = 1
): PurchaseSimulation {

  if (
    !Number.isSafeInteger(requestedLevels) ||
    requestedLevels < 1 ||
    requestedLevels > AFFORDABLE_LEVEL_LIMIT
  ) {
    throw new Error("Invalid requested level count.");
  }

  if (
    selectedIds.length === 0 ||
    new Set(selectedIds).size !== selectedIds.length ||
    selectedIds.some(
      id => !Number.isSafeInteger(id) || id <= 0
    )
  ) {
    throw new Error("Invalid purchase selection.");
  }

  /*
   * Sector unlocks are checked against the current
   * run's Surface progression, not historical highest.
   *
   * After reintegration, historically unlocked
   * upgrades must not automatically become available.
   */
  const surface = snapshot.progression.regions.find(
    region => region.regionId === 1
  );

  if (!surface) {
    throw new Error("Surface progression is missing.");
  }

  const currentRunSector = surface.currentRunHighest;

  /*
   * Build the resource balances from simulatedState.
   * Do not read the imported baseline or cloud balances.
   */
  const balances: Record<number, string> = {};

  for (const resource of snapshot.resources) {
    if (balances[resource.resourceTypeId] !== undefined) {
      throw new Error(
        `Duplicate resource ID ${resource.resourceTypeId}.`
      );
    }

    balances[resource.resourceTypeId] = resource.amount;
  }

  let items: PurchaseItem[];

  if (purchaseType === "titan") {

    items = selectedIds.map(slotNumber => {

      const component = snapshot.titanComponents.find(
        item => item.slotNumber === slotNumber
      );

      if (!component) {
        throw new Error(
          `Titan slot ${slotNumber} was not found.`
        );
      }

      const definition = definitions.titan.find(
        item =>
          item.core_upgrade_id === component.coreUpgradeId
      );

      if (!definition) {
        throw new Error(
          `Missing Titan definition for slot ${slotNumber}.`
        );
      }

      if (currentRunSector < definition.sector_unlock) {
        throw new Error(
          `${definition.core_upgrade_name} is locked this run.`
        );
      }

      // Preserve the existing slot-number purchase ID.
      return {
        id: String(slotNumber),
        expectedUpgradeId: component.coreUpgradeId,
        name:
          `${definition.core_upgrade_name} (Slot ${slotNumber})`,
        currentLevel: component.level,
        baseCost: definition.base_cost,
        scale: definition.scale,
        resourceIds: [definition.resource_type_id],
        requestedLevels
      };
    });

  } else {

    items = selectedIds.map(upgradeId => {

      const upgrade = snapshot.crewUpgrades.find(
        item => item.crewUpgradeId === upgradeId
      );

      if (!upgrade) {
        throw new Error(
          `Crew upgrade ${upgradeId} was not found.`
        );
      }

      const definition = definitions.crew.find(
        item => item.crew_upgrade_id === upgradeId
      );

      if (!definition) {
        throw new Error(
          `Missing Crew definition ${upgradeId}.`
        );
      }

      if (
        currentRunSector <
        (definition.sector_unlock ?? 0)
      ) {
        throw new Error(
          `${definition.crew_upgrade_name} is locked this run.`
        );
      }

      return {
        id: String(upgradeId),
        expectedUpgradeId: upgradeId,
        name: definition.crew_upgrade_name,
        currentLevel: upgrade.level,
        baseCost: definition.base_cost,
        scale: definition.scale,
        resourceIds: requiredResources(
          definition.resource_type_id
        ),
        requestedLevels
      };
    });
  }

  /*
   * Reuse the established purchase algorithm.
   *
   * It calculates costs, determines affordability,
   * deducts required resources and returns the
   * resulting balances without changing our snapshot.
   */
  return simulatePurchases(items, balances);
}
