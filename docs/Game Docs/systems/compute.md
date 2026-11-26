# Compute / Strata

**Documentation status:** Initial source-grounded outline. **Formula verification:** Incomplete.

**Primary reference:** [Unnamed Space Idle Wiki — Compute / Strata](https://spaceidle.game-vault.net/wiki/Compute). Additional observations come from the player's saved-game and bonus snapshots.

## Game mechanics

The wiki describes Compute as a progression system based on **allocating Compute Power across bars**, with Compute Speed changing the throughput each bar receives. Completed bars grant Compute Levels, whose gains may be modified separately. The wiki also describes **Strata Growths**, so the stat mapping should not collapse Compute Power, Compute Speed, Compute Throughput, and Strata Growth into one number.

## Calculator boundary

Import purchased Compute and Strata levels, bar state, allocations and related progression from the save; verify the precise JSON fields before implementing. Expose *effective* Compute/Strata modifiers to the shared stat layer, including Synth Speed, Titan outputs and other downstream stats.

## Outstanding research

- Which bar allocations persist through reinforce/reintegration?
- How are Strata levels and Growth Upgrade multipliers computed from saved progression?
- How does an externally supplied Compute multiplier affect gains versus speed?
- Determine whether current active bar progress is saved or needs a live stopwatch.


## Next steps

Map saved keys and numeric formulas, verify against at least one game snapshot, then link the implemented calculation and its tests.

**Last reviewed:** 2026-11-26.
