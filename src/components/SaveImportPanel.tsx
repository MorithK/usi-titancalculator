
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { decodeUSISave } from "@/lib/saveImport/decoder";
import type { USIDecodedSave } from "@/lib/saveImport/types";
import { extractResources } from "@/lib/saveImport/extractors/resources";
import { mapResources, type ResourceMappingResult } from "@/lib/saveImport/resourceMapping";
import ResourceImportPreview from "@/components/saveImport/ResourceImportPreview";
import type { ApplyResourceImport } from "@/lib/saveImport/importApi";
import { extractProgression, type ImportedProgression } from "@/lib/saveImport/extractors/progression";
import ProgressionImportPreview from "@/components/saveImport/ProgressionImportPreview";


export default function SaveImportPanel({
  onApplyResourceImport
}: {
  onApplyResourceImport: ApplyResourceImport
}) {  
  const [save, setSave] = useState<USIDecodedSave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState<ResourceMappingResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [exportString, setExportString] = useState("");
  const [progression, setProgression] = useState<ImportedProgression | null>(null);

  async function handleImport() {
    if (!exportString.trim()) {
      setError("Paste your exported game save first.");
      return;
    }   
    
    setImportMessage(null);
    setLoading(true);
    setError(null);
    setSave(null);
    setMapping(null);

    try {
      const decoded = await decodeUSISave(exportString);
      const extractedProgression = extractProgression(decoded);
      const extractedResources = extractResources(decoded);
      const mapping = await mapResources(extractedResources);
      
      setProgression(extractedProgression);  
      setMapping(mapping);
      setSave(decoded);

    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import failed."
      );

      console.error("Save import failed:", err);
    } finally {
      setLoading(false);
    }

  }

  async function handleApplyImport() {
    if (
      !mapping ||
      mapping.mapped.length === 0 ||
      !progression
    ) {
      return;
    }  
    setImporting(true);
    setError(null);
    setImportMessage(null);
  
    try {
      const result = await onApplyResourceImport(
        mapping.mapped,
        progression
      );  
      setImportMessage(
        `Game save imported successfully. ` +
        `${result.resources_imported} resources and ` +
        `${result.regions_imported} regions updated.`
      );  
      setSave(null);
      setMapping(null);
      setExportString("");
      setProgression(null);

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Resource import failed."
      );
    } finally {
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
            setError(null);
            setImportMessage(null);
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
            setError(null);
            setImportMessage(null);
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
          
          {mapping && (
            <ResourceImportPreview mapping={mapping} />
          )}

          <div className="flex items-center justify-end gap-2">

          <Button
            variant="outline"
            disabled={importing}
            onClick={() => {
              setSave(null);
              setMapping(null);
              setProgression(null);
              setError(null);
              setImportMessage(null);
            }}
          >
            Cancel
          </Button>

          <Button
            disabled={
              importing ||
              !mapping ||
              !progression ||
              mapping.mapped.length === 0
            }
            onClick={() => void handleApplyImport()}
          >
            {importing
              ? "Importing..."
              : "Apply Game Save Import"}
          </Button>

          </div>
        </div>
      )}
    </div>
  );
}
