# Titan Entry — Minimum Supported Phase Baseline

**Source:** User-provided `BrandNewTitan.txt` exported immediately after first prestige into the Titan ship.  
**Game version:** `0.90.0.8`  
**Save compatibility version:** `41`  
**Recorded save timestamp:** `2026-11-26T20:30:13.430Z`  
**Validation status:** Decoded and inspected; import behavior in the app has **not** been retested using this save.

## Purpose

This is an example of the **earliest Titan ship phase the USI Titan Calculator is intended to support**. It is **not** equivalent to a brand-new account or a save with all previous-game upgrades zeroed.

The game creates automated saves upon sector unlock. Additional consecutive snapshots can be used as regression fixtures to isolate progression, unlock, reset and modifier changes.

## Directly observed save values

| Source record | Field | Observed value |
|---|---|---|
| `PlayerInfo` | `ship` | `Titan` |
| `PlayerInfo` | `highest_reinforce_sector` | `149` |
| `PlayerInfo` | `on_reinforcement_run` | `true` |
| `PlayerInfo` | `sectors_cleared_this_run` | 149 entries; last `onehundred_fortynine` |
| `VeilController` | `current_layer` | `0` |
| `VeilController` | `highest_sector` | `[150,150,150,150]` |
| `VeilController` | `highest_sector_this_reinforce` | `[150,150,150,150]` |
| `VeilController` | `sectors_cleared_this_run` | `[[],[],[],[]]` |
| `VeilController` | `unlocked` | `false` |
| `VeilController` | `umbra_sector_number` | `0` |
| `TitanComputeController` | `unlocked` | `true` |
| `TitanComputeController` | `strata_growths` | `{}` |
| `Warps` | `tether_target` | `Rumina` (a pre-Titan Warp) |
| `Warps.warps_load` | `Senectus.locked` | `true` |
| `Warps.warps_load` | `Tiberinus.locked` | `true` |
| `Warps.warps_load` | `Ullr.locked` | `true` |

### Initially equipped components

`PlayerInfo.cores` contains **five** components:

| Slot | Component |
|---:|---|
| 1 | TitanLaser |
| 2 | TitanLaser |
| 3 | TitanLaser |
| 4 | TitanArray |
| 5 | TitanShield |

These installed components **must not be confused** with the `CoreTitanLaser0`, `CoreTitanArray3`, etc. purchase records, which show `amount_purchased: 0` in this save. The equipment list and upgrade levels answer different questions.

## Constraints for calculator implementation

1. Accept a save with **Titan ship unlocked**, even if `VeilController.unlocked === false`, `highest_sector === 150`, and the first Titan-era Warps are locked.
2. Do not infer cleared status from the historical or current-run **highest unlocked sector**.
3. Do not infer *equipped* status from a named upgrade record or its purchased count.
4. Do not assume Titan-era Warp balances, utilities or upgraded Strata Growth exist immediately after entering the phase.
5. Distinguish previous phase's persistent perks/resources from Titan-phase progression.
6. Future tests should compare adjacent auto-save checkpoints to distinguish genuine changes from cached aggregate statistics.

## Suggested regression fixtures

- Import this save without error.
- Preserve `ship === "Titan"` and **highest sector unlocked 150**.
- Show **149 as last cleared this run**, not 150.
- Load exactly three Titan Lasers, one Titan Array and one Titan Shield into the equipped state.
- Display Senectus/Tiberinus/Ullr as locked, without inventing their progress.
- Keep Veil Shift and Strata Growth at their imported progression state.
- Import does not turn zero purchased component upgrade levels into zero equipped components.

**Storage:** The raw game export remains in the uploaded project/conversation sources; this GitHub note intentionally documents findings without committing an unredacted player save.  
**Reviewed:** 2026-11-26.
