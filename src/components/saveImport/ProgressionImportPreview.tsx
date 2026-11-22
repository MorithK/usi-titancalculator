
import type {
  ImportedProgression,
} from "@/lib/saveImport/extractors/progression";

export default function ProgressionImportPreview({
  progression,
}: {
  progression: ImportedProgression;
}) {
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">
        Regional Progression Preview
      </h3>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground">Current region</p>
          <p className="font-semibold">
            {progression.currentRegionName}
          </p>
        </div>

        <div>
          <p className="text-muted-foreground">Current sector</p>
            <p className="font-semibold">
            {progression.currentSector}
            {progression.currentSectorVariant}
            </p>
          <p className="font-mono text-xs text-muted-foreground">
            {progression.currentSectorId}
          </p>
        </div>

        <div>
          <p className="text-muted-foreground">
            Next Umbra sector
          </p>
          <p className="font-semibold">
            {progression.nextUmbraSector}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">Region</th>
              <th className="p-2 text-right">Historical</th>
              <th className="p-2 text-right">This Run</th>
              <th className="p-2 text-right">Cleared IDs</th>
            </tr>
          </thead>

          <tbody>
            {progression.regions.map(region => (
              <tr key={region.regionId} className="border-b">
                <td className="p-2">{region.name}</td>
                <td className="p-2 text-right">
                  {region.historicalHighest}
                </td>
                <td className="p-2 text-right">
                  {region.currentRunHighest}
                </td>
                <td className="p-2 text-right">
                  {region.clearedSectorIds.length}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
            Review the progression values before importing. Applying the game save will update both resources and regional progression.
      </p>
    </section>
  );
}
