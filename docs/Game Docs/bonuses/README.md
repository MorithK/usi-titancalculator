# Bonus Snapshot Inventory

**Snapshot date:** 2026-11-26. **Purpose:** Track which user-supplied in-game stat breakdowns are recorded and which still need source/formula work.

This inventory describes **snapshot coverage**, *not* formula verification. `Observed` means the player supplied a game breakdown; even a snapshot marked “Missing: None” does **not** mean we have reconstructed its equations. `Placeholder` means no complete stat breakdown is present.

| Category | Files | With breakdown | Placeholder | With missing-source notes |
|---|---:|---:|---:|---:|
| Research | 14 | 8 | 6 | 1 |
| Resource | 4 | 4 | 0 | 3 |
| Synth | 8 | 5 | 3 | 2 |
| Titan Array | 1 | 1 | 0 | 0 |
| Veil Shift | 3 | 3 | 0 | 0 |
| Warp | 5 | 5 | 0 | 1 |

## Snapshot register

### Research

| Statistic | Displayed value | Snapshot coverage | Missing source entries |
|---|---:|---|---:|
| [Bonus to Applied Research](./Research/bonus-to-applied-research.md) | 1.46e115 | Observed | 0 |
| [Bonus to Fundamental Research](./Research/bonus-to-fundamental-research.md) | 1.47e115 | Observed | 0 |
| [Bonus to Specimen Research](./Research/bonus-to-specimen-research.md) | 1.13e43 | Observed; incomplete | 4 |
| [Bonus to Verdanix Specimen Research](./Research/bonus-to-verdanix-specimen-research.md) | 4.91e6 | Observed | 0 |
| [Bonus to Wraithtex Specimen Research](./Research/bonus-to-wraithtex-specimen-research.md) | 4.91e6 | Observed | 0 |
| [Bonus to Xyloquant Specimen Research](./Research/bonus-to-xyloquant-specimen-research.md) | 4.91e6 | Observed | 0 |
| [Bonus to Yttaldar Specimen Research](./Research/bonus-to-yttaldar-specimen-research.md) | 4.91e6 | Observed | 0 |
| [Bonus to Zephyrion Specimen Research](./Research/bonus-to-zephyrion-specimen-research.md) | 4.91e6 | Observed | 0 |
| [specimen gain bonus](./Research/specimen-gain-bonus.md) | — | Placeholder | 0 |
| [verdanix specimen gain bonus](./Research/verdanix-specimen-gain-bonus.md) | — | Placeholder | 0 |
| [wraithtex specimen gain bonus](./Research/wraithtex-specimen-gain-bonus.md) | — | Placeholder | 0 |
| [xyloquant specimen gain bonus](./Research/xyloquant-specimen-gain-bonus.md) | — | Placeholder | 0 |
| [yttaldar specimen gain bonus](./Research/yttaldar-specimen-gain-bonus.md) | — | Placeholder | 0 |
| [zephyrion specimen gain bonus](./Research/zephyrion-specimen-gain-bonus.md) | — | Placeholder | 0 |

### Resource

| Statistic | Displayed value | Snapshot coverage | Missing source entries |
|---|---:|---|---:|
| [Antum Fragment Gain](./Resource/antum-fragment-gain.md) | 5302.17 | Observed; incomplete | 1 |
| [Capital Resource Gain](./Resource/capital-resource-gain.md) | 9.60e61 | Observed; incomplete | 2 |
| [Penum Fragment Gain](./Resource/penum-fragment-gain.md) | 5302.17 | Observed; incomplete | 1 |
| [Veil Fragment Gain](./Resource/veil-fragment-gain.md) | 1.87e5 | Observed | 0 |

### Synth

| Statistic | Displayed value | Snapshot coverage | Missing source entries |
|---|---:|---|---:|
| [Active Module Slots](./Synth/active-module-slots.md) | 7 | Observed | 0 |
| [Alien Synth Speed Multiplier](./Synth/alien-synth-speed-multiplier.md) | 155.25 | Observed; incomplete | 1 |
| [Fixture Creation Speed](./Synth/fixture-creation-speed.md) | 3.04e33 | Observed; incomplete | 2 |
| [Synth Base Output](./Synth/synth-base-output.md) | 1 | Observed | 0 |
| [synth output multplier](./Synth/synth-output-multplier.md) | — | Placeholder | 0 |
| [synth smarter craft](./Synth/synth-smarter-craft.md) | — | Placeholder | 0 |
| [synth sp multiplier](./Synth/synth-sp-multiplier.md) | — | Placeholder | 0 |
| [synth speed](./Synth/synth-speed.md) | — | Observed | 0 |

### Titan Array

| Statistic | Displayed value | Snapshot coverage | Missing source entries |
|---|---:|---|---:|
| [Titan Array Capacity](./Titan%20Array/titan-array-capacity.md) | 25 | Observed | 0 |

### Veil Shift

| Statistic | Displayed value | Snapshot coverage | Missing source entries |
|---|---:|---|---:|
| [Alignment Gain Multiplier](./Veil%20Shift/alignment-gain-multiplier.md) | 9.13 | Observed | 0 |
| [Alignment Normal Sector Scaling Coefficient](./Veil%20Shift/alignment-normal-sector-scaling-coefficient.md) | 4 | Observed | 0 |
| [Alignment Shifted Sector Scaling Coefficient](./Veil%20Shift/alignment-shifted-sector-scaling-coefficient.md) | 4 | Observed | 0 |

### Warp

| Statistic | Displayed value | Snapshot coverage | Missing source entries |
|---|---:|---|---:|
| [Residuum Upgrade Persist](./Warp/residiuum-upgrade-persist.md) | 7 | Observed | 0 |
| [Warp Core Charge Speed](./Warp/warp-core-charge-speed.md) | 2.35e8 | Observed; incomplete | 3 |
| [Warp Discharge Speed](./Warp/warp-discharge-speed.md) | 48.66 | Observed | 0 |
| [Warp Residuum Gain Multiplier](./Warp/warp-residiuum-gain-multiplier.md) | 43.75 | Observed | 0 |
| [Warp Skein Gain](./Warp/warp-skein-gain.md) | 5.31 | Observed | 0 |

## Priorities

1. **Warp:** Finish Residuum and timer mechanics; bonus rates must be reconciled with the bound Apps Script and game snapshots.
2. **Synth:** Keep Synth Speed, Alien Synth Speed and Fixture Creation Speed separate; the Synth Shard was unequipped in the Alien Synth snapshot.
3. **Research and Resource:** Resolve listed “Missing” sources without silently treating unlisted effects as zero.
4. **Model validation:** Map each observed source to its save key, active condition, formula and a regression test.

## Source limitations

The index was generated from the original two documentation commits; **no data was inferred for placeholders**. See [Modifier Map](../modifier-map.md) and [Documentation Index](../README.md).

**Last generated:** 2026-11-26.
