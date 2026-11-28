
import type { PlayerSnapshot } from
  "@/types/playerWorkspace";

import {
  simulatePurchases,
  type PurchaseItem,
  type PurchaseSimulation
} from "@/utils/purchaseMath";

/**
 * Identifies the game system receiving the purchase.
 *
 * Titan purchases use slot numbers as item IDs.
 * Crew purchases use Crew upgrade IDs.
 */
export type WorkspacePurchaseType = "titan" | "crew";

/**
 * Verifies that two collections of resource amounts
 * contain identical keys and calculated values.
 *
 * Used to detect differences between a displayed
 * preview and a newly calculated simulation.
 */
function assertMatchingAmounts(
  expected: Record<number, string>,
  actual: Record<number, string>,
  label: string
): void {

  const expectedKeys = Object.keys(expected).sort();
  const actualKeys = Object.keys(actual).sort();

  if (
    expectedKeys.length !== actualKeys.length ||
    expectedKeys.some(
      (key, index) => key !== actualKeys[index]
    )
  ) {
    throw new Error(`${label} resource keys have changed.`);
  }

  for (const key of expectedKeys) {
    const id = Number(key);

    if (expected[id] !== actual[id]) {
      throw new Error(`${label} amounts have changed.`);
    }
  }
}

/**
 * Applies a purchase preview to an in-memory snapshot.
 *
 * Reuses the existing purchase calculation rather than
 * creating a second implementation of game costs.
 *
 * The preview must have been generated using the
 * current workspace resource balances and upgrade levels.
 *
 * This function:
 * - Does not access Supabase.
 * - Does not mutate the supplied snapshot.
 * - Rejects stale or inconsistent purchase previews.
 * - Preserves unrelated player progression.
 *
 * @param snapshot Current simulated player state.
 * @param purchaseType Titan or Crew upgrades.
 * @param preview Previously calculated purchase preview.
 *
 * @returns A new snapshot with purchased upgrades.
 */
export function applyWorkspacePurchase(
  snapshot: PlayerSnapshot,
  purchaseType: WorkspacePurchaseType,
  preview: PurchaseSimulation
): PlayerSnapshot {

  // Require an actual purchase.
  if (
    preview.items.length === 0 ||
    preview.totalLevelsBought <= 0
  ) {
    throw new Error("No upgrades to purchase.");
  }

  // Track IDs to prevent duplicate purchase targets.
  const seenIds = new Set<number>();

  /*
   * Verify that every requested upgrade still matches
   * the current simulated workspace.
   *
   * This prevents applying a preview based on outdated
   * component selections or previously purchased levels.
   */
  for (const item of preview.items) {

    const id = Number(item.id);

    if (
      !Number.isSafeInteger(id) ||
      id <= 0 ||
      String(id) !== item.id ||
      seenIds.has(id)
    ) {
      throw new Error(`Invalid purchase ID: ${item.id}`);
    }

    seenIds.add(id);

    if (purchaseType === "titan") {

      // Titan item IDs refer to equipped slot numbers.
      const component = snapshot.titanComponents.find(
        component => component.slotNumber === id
      );

      if (
        !component ||
        component.coreUpgradeId !== item.expectedUpgradeId ||
        component.level !== item.currentLevel
      ) {
        throw new Error(
          `Titan slot ${id} has changed. Refresh the preview.`
        );
      }

    } else {

      // Crew item IDs refer to Crew upgrade IDs.
      const upgrade = snapshot.crewUpgrades.find(
        upgrade => upgrade.crewUpgradeId === id
      );

      if (
        !upgrade ||
        item.expectedUpgradeId !== id ||
        upgrade.level !== item.currentLevel
      ) {
        throw new Error(
          `Crew upgrade ${id} has changed. Refresh the preview.`
        );
      }
    }
  }

  /*
   * Build balances from the CURRENT simulated snapshot.
   *
   * We deliberately do not use balances from the
   * imported baseline or an authenticated player table.
   */
  const balances: Record<number, string> =
    Object.fromEntries(
      snapshot.resources.map(resource => [
        resource.resourceTypeId,
        resource.amount
      ])
    );

  /*
   * Reconstruct the original purchase requests.
   *
   * finalLevel and levelsBought are calculated results,
   * not inputs. simulatePurchases() calculates them again.
   */
  const requests: PurchaseItem[] = preview.items.map(
    item => ({
      id: item.id,
      expectedUpgradeId: item.expectedUpgradeId,
      name: item.name,
      currentLevel: item.currentLevel,
      baseCost: item.baseCost,
      scale: item.scale,
      resourceIds: [...item.resourceIds],
      requestedLevels: item.requestedLevels
    })
  );

  // Reuse the existing cost and affordability calculations.
  const recalculated = simulatePurchases(
    requests,
    balances
  );

  // Reject previews that no longer match the workspace.
  if (
    recalculated.totalLevelsBought !==
    preview.totalLevelsBought
  ) {
    throw new Error(
      "Purchase affordability has changed. Refresh the preview."
    );
  }

  // Verify all final upgrade levels.
  for (let index = 0; index < preview.items.length; index++) {

    const oldItem = preview.items[index];
    const newItem = recalculated.items[index];

    if (
      oldItem.id !== newItem.id ||
      oldItem.levelsBought !== newItem.levelsBought ||
      oldItem.finalLevel !== newItem.finalLevel
    ) {
      throw new Error(
        "Purchase levels have changed. Refresh the preview."
      );
    }
  }

  // Verify the resource deductions shown in the preview.
  assertMatchingAmounts(
    preview.spent,
    recalculated.spent,
    "Purchase cost"
  );

  // Verify the resulting balances.
  assertMatchingAmounts(
    preview.remainingBalances,
    recalculated.remainingBalances,
    "Remaining balance"
  );

  /*
   * Index the calculated final levels by purchase ID.
   *
   * Only items that actually bought levels are included.
   */
  const purchasedLevels = new Map(
    recalculated.items
      .filter(item => item.levelsBought > 0)
      .map(item => [Number(item.id), item.finalLevel])
  );

  /*
   * Construct new resource objects.
   *
   * Use the calculated remaining balances rather than
   * subtracting costs a second time.
   */
  const resources = snapshot.resources.map(resource => ({
    ...resource,
    amount:
      recalculated.remainingBalances[resource.resourceTypeId] ??
      resource.amount
  }));

  if (purchaseType === "titan") {

    // Update only the Titan components that were purchased.
    const titanComponents = snapshot.titanComponents.map(
      component => ({
        ...component,
        level:
          purchasedLevels.get(component.slotNumber) ??
          component.level
      })
    );

    return {
      ...snapshot,
      resources,
      titanComponents
    };
  }

  // Update only the Crew upgrades that were purchased.
  const crewUpgrades = snapshot.crewUpgrades.map(
    upgrade => ({
      ...upgrade,
      level:
        purchasedLevels.get(upgrade.crewUpgradeId) ??
        upgrade.level
    })
  );

  return {
    ...snapshot,
    resources,
    crewUpgrades
  };
}
