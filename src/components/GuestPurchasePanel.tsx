
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
 * A purchase submitted to the workspace.
 *
 * The target is the exact snapshot that should become
 * active after React processes the simulation update.
 *
 * We only report success when the current simulated
 * snapshot is this target object.
 */
interface PendingGuestPurchase {
  source: PlayerSnapshot;
  target: PlayerSnapshot;
  levelsBought: number;
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
    
  // Tracks a submitted purchase until its result is visible.
  const [pendingPurchase, setPendingPurchase] =
    useState<PendingGuestPurchase | null>(null);
    
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
      
      /*
       * Determine what happened to the submitted purchase.
       *
       * Accepted:
       * The workspace now contains our calculated target.
       *
       * Pending:
       * React still exposes the original source snapshot.
       *
       * Rejected:
       * Some other snapshot became active instead.
       *
       * This is derived from actual workspace state, not
       * from a promise that React has scheduled an update.
       */
      const purchaseStatus =
        pendingPurchase === null
          ? null
          : snapshot === pendingPurchase.target
            ? "accepted"
            : snapshot === pendingPurchase.source
              ? "pending"
              : "rejected";
      
  /**
   * Generate a purchase preview using real game costs.
   *
   * Initially, we request one level in one Titan slot.
   */
  function handlePreview() {

    if (!snapshot || !definitions) return;
    // A new preview clears the previous purchase confirmation.
    setPendingPurchase(null);
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
   * Requests a simulated Titan purchase.
   *
   * The existing purchase calculator validates costs,
   * balances, equipment IDs and upgrade levels.
   *
   * The workspace update is conditional: it is accepted
   * only if the source snapshot is still current.
   *
   * Success is NOT reported here. The UI confirms
   * acceptance after observing the resulting snapshot.
   */
  function handleApply() {
  
    if (
      !workspace ||
      !activePreview ||
      !purchasePreview ||
      activePreview.totalLevelsBought === 0 ||
      pendingPurchase !== null
    ) {
      return;
    }
  
    setError(null);
    setMessage(null);
  
    try {
  
      // Calculate and validate the purchase result.
      const updatedSnapshot = applyWorkspacePurchase(
        workspace.simulatedState,
        "titan",
        activePreview
      );
  
      // Remember exactly which state was used.
      const sourceSnapshot = purchasePreview.source;
  
      /*
       * Record the intended result before asking React
       * to update the shared workspace.
       *
       * This lets the UI confirm the actual outcome.
       */
      setPendingPurchase({
        source: sourceSnapshot,
        target: updatedSnapshot,
        levelsBought: activePreview.totalLevelsBought
      });
  
      /*
       * Apply only if the active snapshot still matches
       * the snapshot used to calculate this preview.
       *
       * If not, return the current snapshot unchanged.
       * updateSimulation() now treats that as a no-op.
       */
      applySimulation(current =>
        current === sourceSnapshot
          ? updatedSnapshot
          : current
      );
  
      // The submitted preview can no longer be reused.
      setPurchasePreview(null);
  
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
            // A new preview clears the previous purchase confirmation.
            setPendingPurchase(null);        
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
            disabled={
                activePreview.totalLevelsBought === 0 ||
                pendingPurchase !== null
              }
            onClick={handleApply}
          >
            Apply Simulated Purchase
          </Button>
        </div>
      )}

    {/* Confirm simulated purchases from observed workspace state. */}
    {pendingPurchase && purchaseStatus === "pending" && (
    <p role="status" className="text-sm text-slate-400">
        Applying simulated purchase...
    </p>
    )}

    {pendingPurchase && purchaseStatus === "accepted" && (
    <p role="status" className="text-sm text-green-400">
        {pendingPurchase.levelsBought} Titan level(s)
        simulated successfully. No database changes made.
    </p>
    )}

    {pendingPurchase && purchaseStatus === "rejected" && (
    <p role="alert" className="text-sm text-amber-400">
        The workspace changed before the purchase was
        applied. Generate a new purchase preview.
    </p>
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
