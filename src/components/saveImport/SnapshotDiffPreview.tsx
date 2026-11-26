import { useMemo, useState } from "react";
import type { ImportChange } from "@/lib/saveImport/buildImportChanges";
import Decimal from "decimal.js";

type Filter = "changed" | "all" | "decreases";
const color: Record<ImportChange["status"], string> = {
  increase: "text-green-400",
  decrease: "text-red-400 font-semibold",
  changed: "text-amber-400",
  new: "text-cyan-400",
  unchanged: "text-slate-500",
};

function formatPreviewValue(
  value: string | null,
  category: string,
  key: string
): string {
  if (value === null) return "Not saved";

  const isSkein =
    key.endsWith("Skein") ||
    (category === "Warps" && key.startsWith("skein-"));

  if (isSkein) {
    return new Decimal(value).toFixed(2);
  }

  if (category === "Resources") {
    return new Decimal(value).toExponential(2);
  }

  return value;
}

export default function SnapshotDiffPreview({
  changes, saveTimestamp, lastUpdated,
}: {
  changes: ImportChange[];
  saveTimestamp: number | null;
  lastUpdated: string | null;
}) {
  const [filter, setFilter] = useState<Filter>("changed");
  const summary = useMemo(() => changes.reduce((totals, change) => {
    totals[change.status] += 1;
    return totals;
  }, { increase: 0, decrease: 0, changed: 0, new: 0, unchanged: 0 }), [changes]);
  const filtered = changes.filter(x => filter === "all" ||
    (filter === "decreases" ? x.status === "decrease" : x.status !== "unchanged"));
  const byCategory = [...new Set(filtered.map(x => x.category))];
  const timestampIsOlder = saveTimestamp !== null && lastUpdated !== null &&
    Number.isFinite(Date.parse(lastUpdated)) &&
    saveTimestamp * 1000 < Date.parse(lastUpdated);

  return (
    <section className="space-y-3 rounded-lg border border-slate-700 p-4">
      <h3 className="text-lg font-semibold">Review changes before import</h3>
      <div className="flex flex-wrap gap-3 text-sm">
        <span className="text-green-400">{summary.increase} increases</span>
        <span className="text-red-400">{summary.decrease} decreases</span>
        <span className="text-amber-400">{summary.changed} other changes</span>
        <span className="text-cyan-400">{summary.new} new</span>
        <span className="text-slate-400">{summary.unchanged} unchanged</span>
      </div>
      {summary.decrease > 0 && <p className="rounded border border-red-600 p-2 text-sm text-red-300" role="alert">
        Some imported numeric values are lower than your current database values. Applying this snapshot will overwrite those values.
      </p>}
      {timestampIsOlder && <p className="rounded border border-amber-600 p-2 text-sm text-amber-300" role="alert">
        This game save predates the current database row's last update. The database timestamp may reflect an app edit or previous import; review the differences carefully.
      </p>}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Preview filter">
        {(["changed", "all", "decreases"] as const).map(option => (
          <button key={option} type="button" aria-pressed={filter === option}
            onClick={() => setFilter(option)}
            className={`rounded border px-3 py-1 text-sm ${filter === option ? "border-cyan-400 text-white" : "border-slate-700 text-slate-400"}`}>
            {option === "changed" ? "Changes only" : option === "all" ? "All values" : "Decreases"}
          </button>
        ))}
      </div>
      <div className="max-h-112 overflow-auto rounded border border-slate-800">
        <table className="w-full min-w-xl text-sm">
          <thead className="sticky top-0 bg-slate-900 text-slate-400">
            <tr><th className="p-2 text-left">Value</th><th className="p-2 text-right">Current</th>
              <th className="p-2 text-right">Game Save</th><th className="p-2 text-right">Result</th></tr>
          </thead>
          <tbody>
            {byCategory.map(category => (
              <FragmentGroup key={category} category={category} rows={filtered.filter(x => x.category === category)} />
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <p className="p-3 text-sm text-slate-400">No matching differences.</p>}
      </div>
      <p className="text-xs text-slate-500">Preview only. No database changes have been applied.</p>
    </section>
  );
}
function FragmentGroup({category,rows}: {category: string; rows: ImportChange[]}) {
  return <>
    <tr className="bg-slate-800/70"><th colSpan={4} className="p-2 text-left text-cyan-300">{category}</th></tr>
    {rows.map(change => <tr key={`${change.category}-${change.key}`} className="border-t border-slate-800">
      <td className="p-2">{change.label}</td>
      <td className="max-w-44 break-all p-2 text-right font-mono text-slate-400">
        {formatPreviewValue(
          change.previous,
          change.category,
          change.key
        )}
      </td>
      <td className="max-w-44 break-all p-2 text-right font-mono">
        {formatPreviewValue(
          change.incoming,
          change.category,
          change.key
        )}
      </td>
      <td className={`p-2 text-right ${color[change.status]}`}>{change.status}</td>
    </tr>)}
  </>;
}
