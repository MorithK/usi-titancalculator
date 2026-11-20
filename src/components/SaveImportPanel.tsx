
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decodeUSISave } from "@/lib/saveImport/decoder";
import type { USIDecodedSave } from "@/lib/saveImport/types";
import { extractResources } from "@/lib/saveImport/extractors/resources";
import { mapResources, type ResourceMappingResult } from "@/lib/saveImport/resourceMapping";
import ResourceImportPreview from "@/components/saveImport/ResourceImportPreview";
import type { ApplyResourceImport } from "@/lib/saveImport/importApi";

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

  async function handleImport(file: File) {
    setImportMessage(null);
    setLoading(true);
    setError(null);
    setSave(null);
    setMapping(null);

    try {
      const text = await file.text();
      const decoded = await decodeUSISave(text);

   

      console.log("Decoded USI save:", decoded);
      console.log("PlayerInfo:", decoded.data.PlayerInfo);
      console.log("BattleArea:", decoded.data.BattleArea);
      const extractedResources = extractResources(decoded);

      console.table(extractedResources);
      
      console.table(
        extractedResources.filter(resource =>
          resource.gameResourceKey.endsWith("Specimen")
        )        
      );
      const mapping = await mapResources(extractedResources);
      setMapping(mapping);

      console.log("Resource mapping:", mapping);
      console.table(mapping.mapped);

      console.log("Mapped resources:", mapping.mapped.length);
      console.log("Unmapped resources:", mapping.unmapped.length);
      console.log("Missing resources:", mapping.missing);

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
    if (!mapping || mapping.mapped.length === 0) {
      return;
    }
  
    setImporting(true);
    setError(null);
    setImportMessage(null);
  
    try {
      const result = await onApplyResourceImport(
        mapping.mapped
      );
  
      setImportMessage(
        `${result.resources_imported} resources imported successfully.`
      );
  
      setSave(null);
      setMapping(null);
  
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
        Save Import Test
      </h2>

      <Input
        type="file"
        accept=".txt"
        disabled={loading || importing}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void handleImport(file);
          }

          event.target.value = "";
        }}
      />

      {loading && <p>Decoding save file...</p>}

      {error && (
        <p className="text-destructive">{error}</p>
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
          
          {importMessage && (
            <p role="status" className="text-green-400">
              {importMessage}
            </p>
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
              mapping.mapped.length === 0
            }
            onClick={() => void handleApplyImport()}
          >
            {importing
              ? "Importing..."
              : "Apply Resource Import"}
          </Button>

          </div>
        </div>
      )}
    </div>
  );
}
