
import Decimal from "decimal.js";
import type { ResourceMappingResult } from "@/lib/saveImport/resourceMapping";

interface ResourceImportPreviewProps {
  mapping: ResourceMappingResult;
}

function formatAmount(value: string | null): string {
  if (value === null) {
    return "—";
  }

  const amount = new Decimal(value);

  if (amount.isZero()) {
    return "0";
  }

  if (amount.abs().gte(1000000)) {
    return amount.toExponential(5);
  }

  return amount.toSignificantDigits(6).toString();
}

function changeColor(
  current: string | null,
  imported: string | null
): string {
  if (current === null || imported === null) {
    return "";
  }

  const comparison = new Decimal(imported).comparedTo(current);

  if (comparison > 0) {
    return "text-green-400";
  }

  if (comparison < 0) {
    return "text-red-400";
  }

  return "";
}

export default function ResourceImportPreview({
  mapping,
}: ResourceImportPreviewProps) {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">
        Resource Import Preview
      </h3>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <div className="text-sm text-muted-foreground">
            Mapped
          </div>
          <div className="text-xl font-semibold text-green-400">
            {mapping.mapped.length}
          </div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground">
            Unsupported
          </div>
          <div className="text-xl font-semibold">
            {mapping.unmapped.length}
          </div>
        </div>

        <div>
          <div className="text-sm text-muted-foreground">
            Missing
          </div>
          <div className="text-xl font-semibold">
            {mapping.missing.length}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left">
                Resource
              </th>
              <th className="p-2 text-right">
                Current Amount
              </th>
              <th className="p-2 text-right">
                Imported Amount
              </th>
              <th className="p-2 text-right">
                Current/sec
              </th>
              <th className="p-2 text-right">
                Imported/sec
              </th>
            </tr>
          </thead>

          <tbody>
            {mapping.mapped.map(resource => (
              <tr
                key={resource.resourceTypeId}
                className="border-b"
              >
                <td className="p-2 font-medium">
                  {resource.resourceName}
                </td>

                <td
                  className="p-2 text-right tabular-nums"
                  title={resource.currentAmount ?? undefined}
                >
                  {formatAmount(resource.currentAmount)}
                </td>

                <td
                  className={`p-2 text-right tabular-nums ${
                    changeColor(
                      resource.currentAmount,
                      resource.amount
                    )
                  }`}
                  title={resource.amount}
                >
                  {formatAmount(resource.amount)}
                </td>

                <td
                  className="p-2 text-right tabular-nums"
                  title={resource.currentGainRate ?? undefined}
                >
                  {formatAmount(resource.currentGainRate)}
                </td>

                <td
                  className={`p-2 text-right tabular-nums ${
                    changeColor(
                      resource.currentGainRate,
                      resource.perSecond
                    )
                  }`}
                  title={resource.perSecond ?? undefined}
                >
                  {formatAmount(resource.perSecond)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {mapping.mapped.length === 0 && (
        <p className="text-sm text-amber-400">
          No supported resources were found in this save.
        </p>
      )}

      {mapping.missing.length > 0 && (
        <div className="text-sm text-amber-400">
          <p>Expected resources missing from save:</p>
          <p>{mapping.missing.join(", ")}</p>
        </div>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          Unsupported resources ({mapping.unmapped.length})
        </summary>

        <div className="mt-2 max-h-60 overflow-y-auto">
          {mapping.unmapped.map(resource => (
            <div
              key={resource.gameResourceKey}
              className="flex justify-between gap-4 border-b p-1"
            >
              <span>{resource.gameResourceKey}</span>
              <span
                className="tabular-nums"
                title={resource.amount}
              >
                {formatAmount(resource.amount)}
              </span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
