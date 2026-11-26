# Veil Shift

**Documentation status:** Initial source-grounded outline. **Formula verification:** Incomplete.

**Primary reference:** [Unnamed Space Idle Wiki — Veil Shift](https://spaceidle.game-vault.net/wiki/Unlocks/Sector_Unlocks). Additional observations come from the player's saved-game and bonus snapshots.

## Scope

Veil progression includes Surface, Antumbra, Penumbra and reintegrated Umbra states; **historically unlocked** is not the same as **cleared in the current run**. A/B sector variants are distinct and should not be auto-completed together.

## Observed alignment statistics

- [Alignment Gain Multiplier](../bonuses/Veil%20Shift/alignment-gain-multiplier.md): observed **9.13**.
- [Normal Sector Scaling Coefficient](../bonuses/Veil%20Shift/alignment-normal-sector-scaling-coefficient.md): base **3** + **1** Reintegration alignment improvement = **4**.
- [Shifted Sector Scaling Coefficient](../bonuses/Veil%20Shift/alignment-shifted-sector-scaling-coefficient.md): likewise **4** in the captured snapshot.

Identical observed coefficients do not establish identical progression rules in every run.

## Calculator requirements

Track region, sector, variant unlock/clear state, depth and reintegration history separately. Apply only confirmed alignment modifiers. A reintegration can reset Titan components while retaining specific cross-system progression; reconstruct effective stats from **current** state, not historic highest sector.


## Next steps

Map saved keys and numeric formulas, verify against at least one game snapshot, then link the implemented calculation and its tests.

**Last reviewed:** 2026-11-26.
