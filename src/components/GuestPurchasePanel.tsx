
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { usePlayerWorkspace } from
  "@/hooks/usePlayerWorkspace";

import type { PlayerSnapshot } from
  "@/types/playerWorkspace";

import type { PurchaseSimulation } from
  "@/utils/purchaseMath";

import {
  loadPublicPurchaseDefinitions,
  buildWorkspacePurchasePreview,
  type WorkspacePurchaseDefinitions
} from "@/lib/workspace/workspacePurchasePreview";

import {
  applyWorkspacePurchase
} from "@/lib/workspace/applyWorkspacePurchase";

/**
 * Records the preview and the exact simulated snapshot
 * from which the preview was calculated.
 *
 * The snapshot reference lets us detect when an earlier
 * preview is no longer valid.
 */
interface GuestPurchasePreview {
  source: PlayerSnapshot;
  result: PurchaseSimulation;
}

/**
 * Provides a temporary guest-only purchase interface.
 *
 * All prices come from public reference definitions.
 * All player balances and levels come from PlayerWorkspace.
 *
 * No authenticated data or database writes are used.
 */
export default function GuestPurchasePanel() {

  const {
    workspace,
    applySimulation
  } = usePlayerWorkspace();

  // Public reference definitions used for purchase costs.
  const [definitions, setDefinitions] =
    useState<WorkspacePurchaseDefinitions | null>(null);

  // Titan slot selected for the next purchase.
  const [selectedSlot, setSelectedSlot] = useState(1);

  // The currently calculated purchase preview.
  const [purchasePreview, setPurchasePreview] =
    useState<GuestPurchasePreview | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  /**
   * Load the public upgrade definitions once.
   *
   * The cancellation guard prevents updating state
   * after the component has been unmounted.
   */
  useEffect(() => {

    let cancelled = false;

    void loadPublicPurchaseDefinitions()
      .then(result => {

        if (cancelled) return;

        setDefinitions(result);
        setLoading(false);
      })
      .catch(err => {

        if (cancelled) return;

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load upgrade definitions."
        );

        setLoading(false);
      });

    return () => {
      cancelled = true;
    };

  }, []);

  // Read the current simulated snapshot.
  const snapshot = workspace?.simulatedState ?? null;

  /**
   * A preview is valid only while the exact simulated
   * snapshot that produced it is still active.
   *
   * Region changes, purchases, resets and new imports
   * replace the simulated snapshot object.
   *
   * A stale preview therefore becomes unavailable
   * without needing to modify state in an effect.
   */
  const activePreview =
    snapshot !== null &&
    purchasePreview?.source === snapshot
      ? purchasePreview.result
      : null;

  /**
   * Generate a purchase preview using real game costs.
   *
   * Initially, we request one level in one Titan slot.
   */
  function handlePreview() {

    if (!snapshot || !definitions) return;

    setError(null);
    setMessage(null);
    setPurchasePreview(null);

    try {

      const result = buildWorkspacePurchasePreview(
        snapshot,
        definitions,
        "titan",
        [selectedSlot],
        1
      );

      setPurchasePreview({
        source: snapshot,
        result
      });

      if (result.totalLevelsBought === 0) {
        setMessage(
          "Insufficient resources to purchase this level."
        );
      }

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to preview purchase."
      );
    }
  }

  /**
   * Apply an affordable purchase to the in-memory
   * calculator workspace.
   *
   * This never calls the authenticated purchase RPC.
   */
  function handleApply() {

    if (
      !workspace ||
      !activePreview ||
      !purchasePreview ||
      activePreview.totalLevelsBought === 0
    ) {
      return;
    }

    setError(null);
    setMessage(null);

    try {

      /*
       * Validate and calculate the updated snapshot
       * before scheduling a React state update.
       *
       * Errors are caught here rather than inside
       * React's state-update callback.
       */
      const updatedSnapshot = applyWorkspacePurchase(
        workspace.simulatedState,
        "titan",
        activePreview
      );

      const sourceSnapshot = purchasePreview.source;

      /*
       * Apply the calculated snapshot through
       * WorkspaceProvider.
       *
       * If another workspace update was queued first,
       * avoid overwriting that newer snapshot.
       */
      applySimulation(current =>
        current === sourceSnapshot
          ? updatedSnapshot
          : current
      );

      // Discard the preview after applying it.
      setPurchasePreview(null);

      setMessage(
        `${activePreview.totalLevelsBought} Titan level ` +
        `simulated. No database changes were made.`
      );

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Unable to apply simulated purchase."
      );
    }
  }

  if (!snapshot) return null;

  if (loading) {
    return (
      <p className="text-sm text-slate-400">
        Loading purchase definitions...
      </p>
    );
  }

  if (!definitions) {
    return (
      <p role="alert" className="text-sm text-red-400">
        {error ?? "Purchase definitions are unavailable."}
      </p>
    );
  }

  // Find the component selected by the player.
  const selectedComponent = snapshot.titanComponents.find(
    component => component.slotNumber === selectedSlot
  );

  // Find its actual price definition.
  const selectedDefinition = definitions.titan.find(
    definition =>
      definition.core_upgrade_id ===
      selectedComponent?.coreUpgradeId
  );

  // Identify the resource that this component consumes.
  const selectedResource = snapshot.resources.find(
    resource =>
      resource.resourceTypeId ===
      selectedDefinition?.resource_type_id
  );

  return (
    <section className="space-y-4 rounded-lg border
      border-slate-700 p-4">

      <div>
        <h3 className="font-semibold">
          Guest Titan Purchase Simulator
        </h3>

        <p className="text-xs text-slate-400">
          Experimental in-memory simulation.
          Purchases do not modify your game or Supabase.
        </p>
      </div>

      {/* Select an equipped Titan component slot. */}
      <div className="space-y-2">
        <label
          htmlFor="guest-titan-slot"
          className="block text-sm font-medium"
        >
          Titan Component
        </label>

        <select
          id="guest-titan-slot"
          value={selectedSlot}
          onChange={event => {
            setSelectedSlot(Number(event.target.value));
            setPurchasePreview(null);
            setError(null);
            setMessage(null);
          }}
          className="w-full rounded-lg border border-slate-700
            bg-slate-900 px-3 py-2 text-white"
        >
          {snapshot.titanComponents.map(component => (
            <option
              key={component.slotNumber}
              value={component.slotNumber}
            >
              Slot {component.slotNumber}: {component.name}
            </option>
          ))}
        </select>
      </div>

      {/* Show current state before purchasing. */}
      {selectedComponent && (
        <div className="space-y-1 text-sm">
          <p>
            Current level: {selectedComponent.level}
          </p>

          <p className="break-all">
            Available {selectedResource?.resourceName ?? "resource"}:
            {" "}{selectedResource?.amount ?? "Unavailable"}
          </p>
        </div>
      )}

      <Button
        variant="outline"
        disabled={!selectedComponent || !selectedDefinition}
        onClick={handlePreview}
      >
        Preview 1 Level
      </Button>

      {/* Display the real calculated purchase result. */}
      {activePreview && (
        <div className="space-y-3 rounded-lg border
          border-slate-700 bg-slate-900 p-3">

          <h4 className="font-medium text-cyan-400">
            Purchase Preview
          </h4>

          {activePreview.items.map(item => (
            <div key={item.id} className="space-y-1 text-sm">

              <p>{item.name}</p>

              <p>
                Current level: {item.currentLevel}
              </p>

              <p>
                Levels purchased: +{item.levelsBought}
              </p>

              <p>
                Final level: {item.finalLevel}
              </p>

            </div>
          ))}

          <div className="space-y-2 border-t
            border-slate-700 pt-3">

            {Object.entries(activePreview.spent)
              .filter(([, amount]) => amount !== "0")
              .map(([resourceId, amount]) => {

                const resource = snapshot.resources.find(
                  item =>
                    item.resourceTypeId === Number(resourceId)
                );

                return (
                  <div
                    key={resourceId}
                    className="space-y-1 text-sm"
                  >
                    <p>
                      {resource?.resourceName ?? resourceId}
                    </p>

                    <p className="break-all">
                      Cost: {amount}
                    </p>

                    <p className="break-all">
                      Remaining: {
                        activePreview.remainingBalances[
                          Number(resourceId)
                        ]
                      }
                    </p>
                  </div>
                );
              })}
          </div>

          <Button
            disabled={activePreview.totalLevelsBought === 0}
            onClick={handleApply}
          >
            Apply Simulated Purchase
          </Button>
        </div>
      )}

      {message && (
        <p role="status" className="text-sm text-green-400">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </section>
  );
}
