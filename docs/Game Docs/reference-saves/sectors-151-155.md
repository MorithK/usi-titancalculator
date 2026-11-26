# Titan Early-Progression Save Comparison: Sectors 151–155

**Source:** Twelve player-supplied exports `Sector151*.txt` through `Sector155*.txt`, including Surface, Antumbra and Penumbra snapshots.  
**Game version:** `0.90.0.8`; **compatibility version:** `41` in inspected saves.  
**Review date:** 2026-11-26.  
**Status:** Independently decoded and inspected. These are **observed imported records**, not a complete unlock-mechanics specification.

The save strings are gzip-compressed Base64. Decompressed content has an **8-byte binary header** followed by newline-delimited JSON objects, and may have trailing NUL padding. For scientific-notation-sensitive values the production TypeScript importer uses lossless JSON parsing. This note intentionally omits sensitive/raw player exports.

## 1. Checkpoint matrix

Columns under *Highest unlocked* are the elements of `VeilController.highest_sector` in order **Surface / Antumbra / Penumbra / Umbra**. The current region comes from `VeilController.current_layer` where `0=Surface`, `1=Antumbra`, `2=Penumbra`.

| Named checkpoint | Current region | Highest unlocked (S/A/P/U) | `VeilController.unlocked` | Cleared this run in current region | Equipped components | Recorded Strata Growth keys |
|---|---|---|---|---:|---:|---|
| Surface 151 | Surface | 151/150/150/150 | false | 1 | 5 | 0 |
| Surface 152 | Surface | 152/150/150/150 | false | 2 | 5 | 0 |
| Surface 153 | Surface | 153/150/150/150 | false | 3 | 5 | 0 |
| Surface 154 | Surface | 154/150/150/150 | **true** | **0** | 5 | 2 |
| Surface 155 | Surface | 155/154/153/150 | true | 1 | 6 | 3 |
| Antumbra 151 | Antumbra | 154/151/150/150 | true | 1 | 6 | 2 |
| Antumbra 152 | Antumbra | 154/152/150/150 | true | 2 | 6 | 2 |
| Antumbra 153 | Antumbra | 154/153/150/150 | true | 3 | 6 | 3 |
| Antumbra 154 | Antumbra | 154/154/153/150 | true | 4 | 6 | 3 |
| Penumbra 151 | Penumbra | 154/153/151/150 | true | 1 | 6 | 3 |
| Penumbra 152 | Penumbra | 154/153/152/150 | true | 2 | 6 | 3 |
| Penumbra 153 | Penumbra | 154/153/153/150 | true | 3 | 6 | 3 |

**Caution on chronology:** These files are different route-specific **snapshots**, not one strictly ascending global sequence. A higher Antumbra or Penumbra checkpoint may already have higher Surface progress. Do not derive progression order by alphabetically sorting filenames. The filename dates (`2026_07_28`/`2026_07_29`) were **manually added by the player from the original automatic sector-unlock saves** to preserve the original order and dates of sector entry. The embedded timestamps (`2026-11-26`, approximately `20:35–21:01 UTC`) instead reflect the date of the **fresh manual export strings generated through the game's Settings tab** after loading those older saves. **These timestamps represent different events and do not conflict.** Use the filename's original date to reconstruct historical checkpoint ordering; use the embedded timestamp for manual-export provenance, not sector-entry chronology.

## 2. Confirmed unlock and state boundaries

### Entering 151–153 in Surface

In each early Surface save, `VeilController.unlocked` is false; `VeilController.sectors_cleared_this_run[0]` holds the cleared sectors 150, 150–151, or 150–152 respectively, while `highest_sector[0]` is 151, 152 or 153.

**Regression requirement:** `highest_sector` denotes the next unlocked sector, **not** proof the boss in that sector has been defeated.

### Transition at Surface 154

In the Surface-154 checkpoint:
- `VeilController.unlocked` becomes **true**.
- `highest_sector=[154,150,150,150]` but `sectors_cleared_this_run=[[],[],[],[]]`.
- The player's `PlayerInfo.sectors_cleared_this_run` still contains the historical current-run Surface sequence through sector **153**.
- `TitanComputeController.strata_growths` has the keys `SGSynthSpeed` and `SGWarpDischarge`.

**Critical importer caveat:** An empty `VeilController.sectors_cleared_this_run[0]` after the transition does **not** imply the player never cleared Surface sectors 150–153. The earlier clear history can remain in `PlayerInfo`, and is not necessarily duplicated into the new region-specific array. Do not replace all historical/current-run clear information with the empty region array.

### Surface 155 is already a cross-region save

The Surface-155 checkpoint records `highest_sector=[155,154,153,150]` and current region Surface. Its Veil-specific cleared lists contain Surface **154**, Antumbra **150–153**, and Penumbra **150–152**. Reaching the Surface 155 checkpoint is therefore **not evidence** the player has never entered Antumbra/Penumbra. The snapshot does **not** prove that reintegration has already taken place.

### Antumbra and Penumbra

The Antumbra/Penumbra files directly demonstrate independent, unequal region progress: for example Antumbra 154 and Penumbra 153 can coexist with Surface 154. Keep each region's highest unlocked, cleared variants, and current region separate. `umbra_sector_number` remains **0** in all twelve provided checkpoints; do not invent Umbra progress.

### Warp availability

All twelve checkpoints have `Warps.warps_load.Senectus.locked=false` and `Tiberinus.locked=true`, `Ullr.locked=true`. In early Surface 151–153 saves `Warps.tether_target=Rumina` (a pre-Titan Warp), whereas Surface 154–155 uses `Senectus`.

**Important distinction:** `locked=false` in the saved warp record is not the same as currently **tethered** or currently **yielding Skein**. Read the tether target separately.

### Equipped Titan components

`PlayerInfo.cores` is a list of equipped component records with the key `core_id`. Surface 151–154 checkpoints have **5 equipped components**; Surface 155 and the supplied shifted-region checkpoints have **6**.

An entry may have e.g. `core_id="TitanLaser"`, even if corresponding `CoreTitanLaser*` purchase records have different purchased levels. Component placement and purchase progression must remain separate.

### Strata Growth

The keys visible in these checkpoints are:
- `SGSynthSpeed`
- `SGWarpDischarge`
- `SGBaseProduction`

The first three Surface checkpoints have an empty `strata_growths` dictionary; Surface 154 has the first two keys; Surface 155 and several shifted-region snapshots have all three. **The set of keys is not the same as their active status or effective bonuses**: each entry separately provides `active`, `unlocked`, `level`, and `progress`.

## 3. Regression tests worth creating

1. Surface 151/152/153: highest unlocked is respectively 151/152/153; last cleared is respectively 150/151/152.
2. Surface 154: Veil Shift unlocked, four region lists empty, *but* `PlayerInfo` still records Surface clears to 153. Do not lose this information.
3. Surface 155: import all four historical highest-unlocked values and the three region-specific cleared lists without rewriting them as one scalar.
4. Antumbra/Penumbra checkpoints: imported current region corresponds to `current_layer`, independent of which region has the highest unlocked sector.
5. Warp: Senectus can be unlocked but `tether_target` is still Rumina. Tethering is distinct from unlock state.
6. Component import: use the equipped `cores[*].core_id`, not the count of nonzero `CoreTitan*` purchases.
7. Strata Growth: distinguish keys present from entries with `active=true` or `unlocked=true`.
8. Replay each checkpoint into a clean **test** environment only; do not overwrite the user's production save.

## 4. Validation boundaries

- These files cover **12 checkpoints** but not every region-sector combination (no Penumbra 154/155 or Antumbra 155).
- They do **not** prove unlock causality on their own; e.g. a new subsystem might be unlocked by an action between two auto-saves rather than precisely by reaching the named sector.
- Automatic saves are progression snapshots; they also contain player choices and can include already-completed progression in other regions.
- Do not commit raw exports to public GitHub. See [Titan-entry baseline](titan-entry.md) for the initial sector-150 checkpoint.

**Last reviewed:** 2026-11-26.
