
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { decodeUSISave } from "@/lib/saveImport/decoder";
import type { USIDecodedSave } from "@/lib/saveImport/types";
import { extractResources } from "@/lib/saveImport/extractors/resources";
import {mapResources, mapImportedResources, loadPublicResourceDefinitions, type ResourceMappingResult } from "@/lib/saveImport/resourceMapping";
import ResourceImportPreview from "@/components/saveImport/ResourceImportPreview";
import type { ApplyResourceImport } from "@/lib/saveImport/importApi";
import { extractProgression, type ImportedProgression } from "@/lib/saveImport/extractors/progression";
import ProgressionImportPreview from "@/components/saveImport/ProgressionImportPreview";
import { extractTitanComponents, type ImportedTitanComponent } from "@/lib/saveImport/extractors/titanComponents";
import { extractWarps, type ImportedWarps} from "@/lib/saveImport/extractors/warps";
import { requireTitanStage } from "@/lib/saveImport/stage";
import { loadImportDefinitions, loadPublicImportDefinitions, type PublicImportDefinitions, type ImportDefinitions } from "@/lib/saveImport/importDefinitions";
import { extractCrewUpgrades, type ImportedCrewUpgrade, } from "@/lib/saveImport/extractors/crewUpgrades";
import { buildImportChanges, type ImportChange, } from "@/lib/saveImport/buildImportChanges";
import SnapshotDiffPreview from "@/components/saveImport/SnapshotDiffPreview";
import { usePlayerWorkspace } from "@/hooks/usePlayerWorkspace";
import type { PlayerSnapshot, WorkspaceSource } from "@/types/playerWorkspace";

/**
 * Displays the game-save decoder and import preview.
 *
 * When onApplyResourceImport is provided, the component
 * uses the existing authenticated Supabase import.
 *
 * Without that callback, the panel operates in guest mode
 * and loads the imported save into React workspace memory.
 */
export default function SaveImportPanel({
  onApplyResourceImport
}: {
  onApplyResourceImport?: ApplyResourceImport;
}) {

  // Access the shared in-memory player workspace.
  const { workspace, loadSnapshot } = usePlayerWorkspace();

  // Continue with your existing useState declarations.
  const [save, setSave] = useState<USIDecodedSave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState<ResourceMappingResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [exportString, setExportString] = useState("");
  const [progression, setProgression] = useState<ImportedProgression | null>(null);
  const [titanComponents, setTitanComponents] = useState<ImportedTitanComponent[]>([]);
  const [warps, setWarps] = useState<ImportedWarps | null>(null);
  const [crewUpgrades, setCrewUpgrades] = useState<ImportedCrewUpgrade[]>([]);
  const [changes, setChanges] = useState<ImportChange[]>([]);
  const [playerLastUpdated, setPlayerLastUpdated] = useState<string | null>(null);

  
  /**
   * Decodes and validates a pasted game save.
   *
   * Both guest and authenticated users share the same
   * game-data extraction and validation.
   *
   * Guest mode loads only public definitions.
   * Authenticated mode also loads private player data,
   * allowing the existing import comparison preview.
   *
   * This function never writes to Supabase.
   */
  async function handleImport() {
  
    // Require a non-empty game save.
    if (!exportString.trim()) {
      setError("Paste your exported game save first.");
      return;
    }
  
    // Reset previous preview state.
    setImportMessage(null);
    setLoading(true);
    setError(null);
    setSave(null);
    setMapping(null);
    setProgression(null);
    setTitanComponents([]);
    setWarps(null);
    setCrewUpgrades([]);
    setChanges([]);
    setPlayerLastUpdated(null);
  
    try {
  
      // Decode the exported game save.
      const decoded = await decodeUSISave(exportString);
  
      // Reject saves that have not reached the Titan stage.
      requireTitanStage(decoded);
  
      /*
       * Load reference definitions.
       *
       * Only authenticated imports require private
       * player-state information.
       */
      let definitions: PublicImportDefinitions;
      let authenticatedDefinitions: ImportDefinitions | null =
        null;
  
      if (onApplyResourceImport) {
  
        // Retrieve references plus existing account state.
        authenticatedDefinitions =
          await loadImportDefinitions();
  
        definitions = authenticatedDefinitions;
  
      } else {
  
        // Guests need only the public game definitions.
        definitions = await loadPublicImportDefinitions();
      }
  
      // Extract progression and resource values.
      const extractedProgression =
        extractProgression(decoded);
  
      const extractedResources =
        extractResources(decoded);
  
      /*
       * Map the extracted resources.
       *
       * Signed-in users receive existing account balances
       * for comparison.
       *
       * Guests use public resource definitions and the
       * pure in-memory mapper.
       */
      let resourceMapping: ResourceMappingResult;
  
      if (onApplyResourceImport) {
  
        resourceMapping =
          await mapResources(extractedResources);
  
      } else {
  
        const resourceDefinitions =
          await loadPublicResourceDefinitions();
  
        resourceMapping = mapImportedResources(
          extractedResources,
          resourceDefinitions
        );
      }
  
      // Extract Titan components using shared definitions.
      const extractedTitanComponents =
        extractTitanComponents(
          decoded,
          definitions.core
        );
  
      // Extract Warp progression and purchased nodes.
      const extractedWarps =
        extractWarps(
          decoded,
          definitions.warps,
          definitions.nodes
        );
  
      // Extract Crew, Compute and Reactor upgrades.
      const extractedCrewUpgrades =
        extractCrewUpgrades(
          decoded,
          definitions.crew
        );
  
      /*
       * Build account comparison records only when
       * authenticated player data was loaded.
       *
       * Guests do not have a previous cloud state.
       */
      if (authenticatedDefinitions !== null) {
  
        const extractedChanges = buildImportChanges(
          resourceMapping.mapped,
          extractedTitanComponents,
          extractedCrewUpgrades,
          extractedWarps,
          authenticatedDefinitions
        );
  
        setChanges(extractedChanges);
  
        setPlayerLastUpdated(
          authenticatedDefinitions.current.playerUpdatedAt
        );
      }
  
      /*
       * All validation has passed.
       *
       * Populate the preview only after every required
       * extractor has completed successfully.
       */
      setProgression(extractedProgression);
      setMapping(resourceMapping);
      setSave(decoded);
      setTitanComponents(extractedTitanComponents);
      setWarps(extractedWarps);
      setCrewUpgrades(extractedCrewUpgrades);
  
    } catch (err) {
  
      // Surface errors to the user and the console.
      setError(
        err instanceof Error
          ? err.message
          : "Import failed."
      );
  
      console.error("Save import failed:", err);
  
    } finally {
  
      // Restore the Decode & Preview button.
      setLoading(false);
    }
  }
    
/**
 * Applies the game-save data from the completed preview.
 *
 * Authenticated players retain the existing Supabase
 * import operation.
 *
 * Guests instead create an in-memory PlayerSnapshot,
 * allowing the calculator to operate without a login
 * or a database write.
 */
async function handleApplyImport() {

  /*
   * Require a valid, fully decoded import preview.
   *
   * Account comparison records are only required
   * when the authenticated cloud importer is used.
   */
  if (
    !save ||
    !mapping ||
    mapping.mapped.length === 0 ||
    !progression ||
    titanComponents.length !== 7 ||
    !warps ||
    crewUpgrades.length === 0 ||
    (onApplyResourceImport && changes.length === 0)
  ) {
    return;
  }

  // Prevent duplicate imports and clear old messages.
  setImporting(true);
  setError(null);
  setImportMessage(null);

  try {

    if (onApplyResourceImport) {

      /*
       * AUTHENTICATED IMPORT
       *
       * Retain the existing Supabase import callback.
       *
       * TypeScript knows this callback is defined
       * inside this conditional branch.
       */
      const result = await onApplyResourceImport(
        mapping.mapped,
        progression,
        titanComponents,
        warps,
        crewUpgrades
      );

      setImportMessage(
        `Game save imported successfully. ` +
        `${result.resources_imported} resources, ` +
        `${result.regions_imported} regions, ` +
        `${result.titan_components_imported} Titan components, ` +
        `${result.crew_upgrades_imported} Crew upgrades, ` +
        `${result.warps_imported} Warps and ` +
        `${result.warp_nodes_imported} Warp nodes updated.`
      );

    } else {

      /*
       * GUEST IMPORT
       *
       * Create a snapshot using the extracted
       * game-save data already held in React state.
       *
       * Account comparison values are intentionally
       * excluded from workspace resources.
       */
      const snapshot: PlayerSnapshot = {

        resources: mapping.mapped.map(resource => ({
          resourceTypeId: resource.resourceTypeId,
          gameResourceKey: resource.gameResourceKey,
          resourceName: resource.resourceName,
          resourceType: resource.resourceType,
          amount: resource.amount,
          perSecond: resource.perSecond,
          rawPerSecond: resource.rawPerSecond
        })),

        progression,
        titanComponents,
        crewUpgrades,
        warps
      };

      /*
       * Record the origin of the imported snapshot.
       *
       * The imported timestamp comes from the game,
       * while importedAt records when the calculator
       * loaded the snapshot.
       */
      const source: WorkspaceSource = {
        gameVersion: save.version,
        compatibilityVersion: save.compatibilityVersion,
        gameSaveTimestamp: save.timestamp,
        importedAt: new Date().toISOString()
      };

      /*
       * Load the snapshot into WorkspaceProvider.
       *
       * This creates independent importedBaseline
       * and simulatedState copies.
       *
       * No Supabase write is performed.
       */
      loadSnapshot(snapshot, source);

      setImportMessage(
        `Game save loaded into your workspace. ` +
        `${snapshot.resources.length} supported resources, ` +
        `${snapshot.titanComponents.length} Titan components, ` +
        `${snapshot.crewUpgrades.length} Crew upgrades and ` +
        `${snapshot.warps.warps.length} Warps loaded.`
      );
    }

    /*
     * Clear the temporary import preview.
     *
     * The guest workspace remains available through
     * WorkspaceProvider after these fields are reset.
     */
    setSave(null);
    setMapping(null);
    setExportString("");
    setProgression(null);
    setTitanComponents([]);
    setWarps(null);
    setCrewUpgrades([]);
    setChanges([]);
    setPlayerLastUpdated(null);

  } catch (err) {

    // Display import errors without losing the preview.
    setError(
      err instanceof Error
        ? err.message
        : "Game save import failed."
    );

    console.error("Game save import failed:", err);

  } finally {

    // Re-enable the import controls.
    setImporting(false);
  }
}


  const battleArea = save?.data.BattleArea;
  const playerInfo = save?.data.PlayerInfo;

  const resources = playerInfo?.resources_load as
    | Record<string, unknown>
    | undefined;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h2 className="text-lg font-semibold">
          Import Game Save
      </h2>
      
      {!onApplyResourceImport && (
        <p className="text-sm text-muted-foreground">
          Guest mode: Import a game save to use the calculator
          without signing in. Your imported data stays in
          browser memory and is not saved to your account.
        </p>
      )}


      <div className="space-y-3">
        <p className="text-sm text-slate-400">
          Open Settings in Unnamed Space Idle and select Export.
          Paste the copied save string below.
        </p>

        <textarea
          aria-label="Exported game save"
          value={exportString}
          onChange={(event) => {
            setExportString(event.target.value);
            setSave(null);
            setMapping(null);
            setProgression(null);
            setTitanComponents([]);
            setWarps(null);
            setError(null);
            setImportMessage(null);
            setCrewUpgrades([]);
            setChanges([]);
            setPlayerLastUpdated(null);
          }}          
          placeholder="Paste your exported save string here (H4sIA...)"
          rows={5}
          spellCheck={false}
          autoComplete="off"
          disabled={loading || importing}
          className="w-full resize-y rounded-lg border border-slate-700
            bg-slate-900 p-3 font-mono text-xs text-slate-200
            placeholder:text-slate-600 focus:border-cyan-400
            focus:outline-none"
        />

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          disabled={loading || importing || !exportString}
          onClick={() => {
            setExportString("");
            setSave(null);
            setMapping(null);
            setProgression(null);
            setTitanComponents([]);
            setWarps(null);
            setError(null);
            setImportMessage(null);
            setCrewUpgrades([]);
            setChanges([]);
            setPlayerLastUpdated(null);
          }}
        >
          Clear
        </Button>

        <Button
          disabled={loading || importing || !exportString.trim()}
          onClick={() => void handleImport()}
        >
          {loading ? "Decoding..." : "Decode & Preview"}
        </Button>
      </div>
    </div>

    
{/* Show a summary of the current guest workspace. */}
{!onApplyResourceImport && workspace !== null && (
  <section className="rounded-lg border p-4 space-y-2">
    <h3 className="font-semibold">
      Active Guest Workspace
    </h3>

    <p className="text-sm">
      Region: {
        workspace.simulatedState.progression.currentRegionName
      }
    </p>

    <p className="text-sm">
      Current sector: {
        workspace.simulatedState.progression.currentSector
      }
    </p>

    <p className="text-sm">
      Loaded resources: {
        workspace.simulatedState.resources.length
      }
    </p>

    <p className="text-xs text-muted-foreground">
      This workspace will be lost if you refresh or
      close the page. Cloud saving is not enabled
      in guest mode.
    </p>
  </section>
)}

      {loading && <p>Decoding save file...</p>}

      {error && (
        <p className="text-destructive">{error}</p>
      )}

      {importMessage && (
        <p role="status" className="text-green-400">
          {importMessage}
        </p>
      )}

      {save && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <span>Game version</span>
            <span>{save.version}</span>

            <span>Compatibility version</span>
            <span>{save.compatibilityVersion}</span>

            <span>Decoded records</span>
            <span>{save.recordCount}</span>

            <span>Highest sector</span>
            <span>{String(battleArea?.highest_sector)}</span>

            <span>Current sector</span>
            <span>{String(battleArea?.sector_number)}</span>

            <span>Resource balances</span>
            <span>
              {Object.keys(resources ?? {}).length}
            </span>

            <span>Save timestamp</span>
            <span>
              {save.timestamp !== null
                ? new Date(
                    save.timestamp * 1000
                  ).toLocaleString()
                : "Unknown"}
            </span>
          </div>

          {progression && (
            <ProgressionImportPreview progression={progression} />
          )}

          {save && titanComponents.length > 0 && (
            <section className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold">
                Titan Components Preview
              </h3>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-400">
                    <th className="p-2 text-left">Slot</th>
                    <th className="p-2 text-left">Component</th>
                    <th className="p-2 text-right">Level</th>
                  </tr>
                </thead>

                <tbody>
                  {titanComponents.map(component => (
                    <tr
                      key={component.slotNumber}
                      className="border-b border-slate-800"
                    >
                      <td className="p-2">
                        {component.slotNumber}
                      </td>
                      <td className="p-2">
                        {component.name}
                      </td>
                      <td className="p-2 text-right">
                        {component.level}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-3 text-xs text-slate-400">
                Review the component values before importing. Applying the game save will update Titan components.
              </p>
            </section>
          )}
          
          {warps && (
            <section className="rounded-lg border p-4">
              <h3 className="mb-3 font-semibold">
                Warp Import Preview
              </h3>

              <p className="mb-3 text-sm">
                Tethered: {warps.tetheredWarpName}
              </p>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-slate-400">
                    <th className="p-2 text-left">Warp</th>
                    <th className="p-2 text-right">
                      Max Jump
                    </th>
                    <th className="p-2 text-right">
                      Current Skein
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {warps.warps.map(warp => (
                    <tr
                      key={warp.warpName}
                      className="border-b border-slate-800"
                    >
                      <td className="p-2">{warp.warpName}</td>
                      <td className="p-2 text-right">
                        {warp.maxDifficulty}
                      </td>
                      <td className="p-2 text-right">
                        {warp.currentSkein}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="mt-3 text-xs text-slate-400">
                {warps.nodes.length} Warp node records found.
                Preview only; no changes saved yet.
              </p>
            </section>
          )}

          {mapping && (
            <ResourceImportPreview mapping={mapping} />
          )}

          {onApplyResourceImport && save && changes.length > 0 && (            
            <SnapshotDiffPreview
              changes={changes}
              saveTimestamp={save.timestamp}
              lastUpdated={playerLastUpdated}
            />
          )}

          <div className="flex items-center justify-end gap-2">

          <Button
            variant="outline"
            disabled={importing}
            onClick={() => {
              setSave(null);
              setMapping(null);
              setProgression(null);
              setTitanComponents([]);
              setWarps(null);
              setError(null);
              setImportMessage(null);      
              setCrewUpgrades([]);
              setChanges([]);
              setPlayerLastUpdated(null);          
            }}
          >
            Cancel
          </Button>
                    
          {/* Apply to account or load into guest workspace. */}
          <Button
            disabled={
              importing ||
              !mapping ||
              !progression ||
              mapping.mapped.length === 0 ||
              titanComponents.length !== 7 ||
              !warps ||
              crewUpgrades.length === 0
            }
            onClick={() => void handleApplyImport()}
          >
            {importing
              ? "Importing..."
              : onApplyResourceImport
                ? "Apply Game Save Import"
                : "Load Into Guest Workspace"}
          </Button>

          </div>
        </div>
      )}
    </div>
  );
}
