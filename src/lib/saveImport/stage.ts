import { isLosslessNumber } from "lossless-json";
import type { USIDecodedSave } from "./types";

/**
 * TitanTransitionDone is present in earlier exports too. Its purchased
 * value, not its unlocked flag or record presence, identifies Titan stage.
 */
export function requireTitanStage(save: USIDecodedSave): void {
  const record = save.data.TitanTransitionDone;
  if (!record) {
    throw new Error("TitanTransitionDone is missing. Unsupported game save.");
  }
  const value = record.amount_purchased;
  if (typeof value !== "number" && !isLosslessNumber(value)) {
    throw new Error("Invalid TitanTransitionDone purchase value.");
  }
  const level = Number(value);
  if (level === 0) {
    throw new Error(
      "This is a valid pre-Titan save. Titan Calculator import requires TitanTransitionDone = 1; no data was changed."
    );
  }
  if (level !== 1) {
    throw new Error("Unsupported TitanTransitionDone value.");
  }
}
