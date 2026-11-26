
import {
  calculateWarpTime,
  formatWarpDuration,
} from "./warpTiming";

function check(
  name: string,
  remainingSkein: string,
  expectedSeconds: number
) {
  const actual = calculateWarpTime({
    remainingSkein,
    skeinPerCharge: "50",
    chargeSeconds: 30,
    dischargeSeconds: 90,
    remainingDischargeSeconds: 60,
  });

  if (actual !== expectedSeconds) {
    throw new Error(
      `${name}: expected ${expectedSeconds}, got ${actual}`
    );
  }

  console.log(`✓ ${name}: ${formatWarpDuration(actual)}`);
}

check("Already affordable", "0", 0);
check("One Warp cycle", "50", 90);
check("Two Warp cycles", "75", 210);
check("Three Warp cycles", "125", 330);

console.log("All Warp timing tests passed!");
