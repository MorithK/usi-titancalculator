
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { decodeUSISave } from "@/lib/saveImport/decoder";
import type { USIDecodedSave } from "@/lib/saveImport/types";

export default function SaveImportTest() {
  const [save, setSave] = useState<USIDecodedSave | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleImport(file: File) {
    setLoading(true);
    setError(null);
    setSave(null);

    try {
      const text = await file.text();
      const decoded = await decodeUSISave(text);

      setSave(decoded);

      console.log("Decoded USI save:", decoded);
      console.log("PlayerInfo:", decoded.data.PlayerInfo);
      console.log("BattleArea:", decoded.data.BattleArea);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Import failed."
      );

      console.error("Save import failed:", err);
    } finally {
      setLoading(false);
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
        disabled={loading}
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

          <Button
            variant="outline"
            onClick={() => setSave(null)}
          >
            Clear
          </Button>
        </div>
      )}
    </div>
  );
}
