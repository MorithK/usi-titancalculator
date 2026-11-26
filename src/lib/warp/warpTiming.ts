
import Decimal from "decimal.js";

export type WarpTimingInput = {
  remainingSkein: string;
  skeinPerCharge: string;
  chargeSeconds: number;
  dischargeSeconds: number;
  remainingDischargeSeconds: number;
};

export function calculateWarpTime(
  input: WarpTimingInput
): number {
  const remaining = new Decimal(input.remainingSkein);
  const gain = new Decimal(input.skeinPerCharge);

  if (remaining.lte(0)) return 0;

  if (
    gain.lte(0) ||
    !Number.isFinite(input.chargeSeconds) ||
    !Number.isFinite(input.dischargeSeconds) ||
    !Number.isFinite(input.remainingDischargeSeconds) ||
    input.chargeSeconds < 0 ||
    input.dischargeSeconds < 0 ||
    input.remainingDischargeSeconds < 0 ||
    input.chargeSeconds + input.dischargeSeconds <= 0
  ) {
    throw new Error("Invalid Warp timing values.");
  }

  const cyclesNeeded = remaining.div(gain).ceil();
  const extraCycles = cyclesNeeded.minus(1);
  const fullCycle = input.chargeSeconds + input.dischargeSeconds;

  const seconds = new Decimal(
    input.remainingDischargeSeconds + input.chargeSeconds
  ).plus(extraCycles.times(fullCycle));

  return seconds.toNumber();
}

export function formatWarpDuration(
  totalSeconds: number
): string {
  const seconds = Math.ceil(totalSeconds);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;

  const time = [
    hours.toString().padStart(2, "0"),
    minutes.toString().padStart(2, "0"),
    remaining.toString().padStart(2, "0"),
  ].join(":");

  return days > 0 ? `${days}d ${time}` : time;
}
