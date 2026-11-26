# Warp System — Calculator Specification

**Status:** Core Skein planning implemented; Residium calculator and automatic cycle synchronization incomplete.  
**Sources:** [Original spreadsheet — WarpCalculator](https://docs.google.com/spreadsheets/d/1xdB9Xdr1SLnLHsQxNrbUPB6cQrC62kfweJQfW6lQxJ8/edit), *Notes/Instructions* rows 46–57, [wiki: Warp Drive](https://spaceidle.game-vault.net/wiki/Warp_Drive), and current TypeScript implementation.

> **Scope warning:** The wiki describes the historical/general Warp Drive and massive Warp upgrades, whereas the calculator currently focuses on Titan-era **Senectus, Tiberinus and Ullr** Skein/Residium progression. Do not transplant early-Warp Essence mechanics directly into Titan-era Skein formulas.

## 1. Working calculator features

| Feature | Source | Current code | Status |
|---|---|---|---|
| Import current Skein, Warp progression and selected tether | Game save | `src/lib/saveImport/`, Supabase | Implemented |
| Load nodes, levels and dependencies | Supabase | `src/lib/warp/loadWarpData.ts` | Implemented |
| Next-level cost with full prerequisite chain | Spreadsheet | `src/lib/warp/warpPlanner.ts` | Implemented / tested |
| Multiple objectives with shared prerequisite deduplication | Calculator extension | `src/lib/warp/warpCombinedPlanner.ts` | Implemented / tested |
| Remaining levels and max-level costs | Spreadsheet | `src/lib/warp/warpMaxPlanner.ts` | Implemented / tested |
| Affordability based on discrete Skein cycles | Spreadsheet | `src/lib/warp/warpTiming.ts` | Implemented / tested with manual cycle inputs |
| Residium purchases, row completion totals | Spreadsheet | — | **Not implemented** |
| Automatic cycle countdown / award of Skein and Residium | Bound Google Apps Script | — | **Unverified / not implemented** |
| Derive per-Warp cycle inputs from game state & modifiers | Save + bonus formulas | — | **Not implemented** |

## 2. Terminology and state

- **Tethered Warp:** the one currently accruing Skein; time estimates are shown only for that Warp in the original spreadsheet.
- **Current Skein:** resource balance for the selected Warp. Each Warp's balance is distinct.
- **Residium:** separate currency for its own upgrade table; accrues via discharge mechanics in the spreadsheet's automatic update.
- **Purchased level:** from imported game save.
- **Selected checkbox:** planning intention only, **not** a purchased level.
- **Locked (🔒):** prerequisite levels missing and the relevant dependency path not fully selected.
- **Planned unlock (🔓):** prerequisite levels missing, but all needed purchases are selected.
- **Maxed:** level at the node cap.
- **Current discharge remaining:** manual time input used to anchor the next expected Skein award.

In the original spreadsheet, the player enters the relevant charge time, discharge time, Skein per charge and Residium per discharge for each Warp. That is a **snapshot** of effective values (after modifiers), not the unmodified base values of the Warp upgrade definitions.

## 3. Skein objectives and dependencies

For a given *target's next level*:

1. Check whether the target is at max level.
2. Traverse its directed prerequisite graph recursively.
3. Skip a prerequisite if its imported level is already **greater than zero**.
4. Otherwise, include that prerequisite's first purchase only if it is explicitly selected.
5. Deduplicate prerequisites shared by multiple branches; sum each required purchase once.
6. Subtract **current Skein once** from the gross cost and clamp missing Skein to zero.

### Test vector: Ullr

- **Specimen Gain** level 0 costs **128** Skein.
- **Titan Battle** level 0 costs **256** Skein; requires Specimen Gain level 1.
- Selected together, total = **384** Skein. With **228** Skein, missing = **156** Skein.
- The game may display only the *individual item's* affordability (256 − 228 = 28), but our calculator must report the **full objective** including unpurchased prerequisites.

For multiple objectives, use `warpCombinedPlanner.ts`; do **not** sum individual “missing Skein” numbers, because that would subtract the same balance repeatedly and count shared prerequisites twice.

For **max-level** estimates, the spreadsheet's rightmost columns calculate `levelsRemaining × fixedLevelCost − currentSkein` only for **already-unlocked** nodes. Locked max-level rows remain locked rather than guessing their prerequisite budget. This differs deliberately from the next-level objective planner.

## 4. Cycle-based time estimates

For remaining Skein `S` after deducting current balance, Skein per charge `G`, charge duration `C`, full discharge duration `D`, and remaining discharge `R`:

```text
if S <= 0: time = 0
else:
  cycles = ceil(S / G)
  time = (R + C) + (cycles - 1) * (D + C)
```

This is the current spreadsheet-aligned estimate and implementation contract for `warpTiming.ts`. A correct timing estimate **cannot** be obtained by dividing missing Skein by a continuous per-second rate, because awards occur in complete cycles.

**Assumptions requiring game/script validation:** the next award occurs after the remaining discharge plus a charge, and charge/discharge order, paused/catch-up behaviour, and resource-award timestamps match the sheet's cycle logic. The spreadsheet describes minute-granularity countdown updates and occasional drift, but its **bound Apps Script source is not available through the current Drive connector**. Do not implement automatic state-changing awards from the estimate alone.

Example: `S=156`, `G=43.39`, `R=1070s`, `C=37s`, `D=1849s`: four award cycles, `6765s` = **01:52:45**.

**Changing upgrades matter:** some Warp, Research, Reactor and other bonuses change effective charge, discharge or Skein rates. The present estimate assumes the effective rates remain constant over the planned interval; it is **not** a dynamic purchase simulation.

## 5. Residium upgrades

The spreadsheet places the Residium upgrade table at the left of the WarpCalculator tab (starting around row 9). Each upgrade has next-level cost/time and remaining-level cost/time.

Its **Row Completion** summaries aggregate a group of Residium upgrades, deducting the current balance only once. The summary requires its own aggregate formula and should **not** be implemented by adding each row's already-discounted “remaining” value.

**Next implementation task:** confirm how Residium upgrades/levels and actual Residium balance are represented in the imported save and in Supabase, then implement a pure Residium calculation engine with tests before adding it to WarpPanel.

## 6. Cross-system modifier inputs

See these observed stat snapshots:

- [Warp Core Charge Speed](../bonuses/Warp/warp-core-charge-speed.md): includes **flat additions**, **additive multipliers**, and **multiplicative multipliers**. These are distinct stages.
- [Warp Discharge Speed](../bonuses/Warp/warp-discharge-speed.md): displayed **48.66** in the user's snapshot, from many game systems.
- [Warp Skein Gain](../bonuses/Warp/warp-skein-gain.md): displayed **5.31**.
- [Warp Residuum Gain Multiplier](../bonuses/Warp/warp-residiuum-gain-multiplier.md): displayed **43.75**.
- [Residium upgrade persistence](../bonuses/Warp/residiuum-upgrade-persist.md): not necessarily a production-rate bonus; verify what survives resets.

**No aggregate snapshot multiplier is itself a formula for a Warp's actual charge duration.** Account for base timings, stage order, active bonuses and progression first.

## 7. Data model and tests

Current reference tables: `warps`, `warp_nodes`, `warp_node_dependencies`. Player tables: `player_warps`, `player_warp_nodes`, `player_warp_state`. Confirm live schemas before adding any fields.

Tests:
```bash
npx tsx src/lib/warp/warpPlanner.test.ts
npx tsx src/lib/warp/warpCombinedPlanner.test.ts
npx tsx src/lib/warp/warpTiming.test.ts
npx tsx src/lib/warp/warpMaxPlanner.test.ts
npm run build
```

### Implementation boundary

Finish accurate **calculator** functionality before introducing a strategy simulator. A genuine simulator must account for benefits of purchased upgrades to Titan, Synth, Research, Crew, Warp cycles and other systems, rather than treating purchases as isolated costs.

## 8. Reference links and open questions

- [Game wiki: Warp Drive](https://spaceidle.game-vault.net/wiki/Warp_Drive)
- [Spreadsheet: WarpCalculator and Notes/Instructions](https://docs.google.com/spreadsheets/d/1xdB9Xdr1SLnLHsQxNrbUPB6cQrC62kfweJQfW6lQxJ8/edit)
- How does the bound Apps Script handle charge/discharge transitions, elapsed time, award timing and paused state?
- What are the exact imported Residium balance and upgrade save keys?
- How do currently equipped modifiers produce per-Warp charge/discharge/Skein/Residium values?
- Which automatic timing rules differ across Titan-era Warps?

**Last reviewed:** 2026-11-26.
