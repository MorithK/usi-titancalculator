
import { isLosslessNumber } from "lossless-json";
import type { USIDecodedSave } from "../types";

export interface ImportedResource {
  gameResourceKey: string;
  amount: string;
  perSecond: string | null;
  rawPerSecond: string | null;
}

function asRecord(
  value: unknown
): Record<string, unknown> | null {
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value)
  ) {
    return null;
  }

  return value as Record<string, unknown>;
}

function decimalString(value: unknown): string {
  if (isLosslessNumber(value)) {
    return value.toString();
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toString();
  }

  throw new Error("Invalid numeric resource value.");
}

export function extractResources(
  save: USIDecodedSave
): ImportedResource[] {
  const player = save.data.PlayerInfo;

  const resources = asRecord(player.resources_load);
  const production = asRecord(player.resource_per_second);

  if (!resources) {
    throw new Error("Resource balances are missing.");
  }

  return Object.entries(resources).map(([key, amount]) => {
    const rate = asRecord(production?.[key]);

    return {
      gameResourceKey: key,
      amount: decimalString(amount),

      perSecond:
        rate?.per_second != null
          ? decimalString(rate.per_second)
          : null,

      rawPerSecond:
        rate?.raw_per_second != null
          ? decimalString(rate.raw_per_second)
          : null,
    };
  });
}
