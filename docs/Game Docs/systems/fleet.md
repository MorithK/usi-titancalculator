# Fleet

**Documentation status:** Initial source-grounded outline. **Formula verification:** Incomplete.

**Primary reference:** [Unnamed Space Idle Wiki — Fleet](https://spaceidle.game-vault.net/wiki/Fleet). Additional observations come from the player's saved-game and bonus snapshots.

## Game mechanics

The wiki describes Fleet as a late-game system unlocked after reinforcement, with galaxy battles and powerful progression bonuses. Much Fleet progress persists across reinforcement layers. This persistence is central to accurately importing the player's state.

## Calculator requirements

Preserve separate counters for clears, difficulties, permanent Fleet upgrades and any unstable/progression-dependent effects. Fleet contributes multipliers to Synth, Warp, Research and several other systems; model each source independently rather than applying one generic Fleet bonus.

The Synth Speed breakdown includes `Fleet: Battle Clear Bonus`, `Fleet Unstable: Unstable Synth Speed`, `Fleet: Void Energy Replacement` and other Fleet sources. These are **observed values**, not their mathematical rules.

## Unknowns

Determine exact galaxy progression keys, saved activation conditions, bonus formula per upgrade, and how persistence interacts with reintegration.


## Next steps

Map saved keys and numeric formulas, verify against at least one game snapshot, then link the implemented calculation and its tests.

**Last reviewed:** 2026-11-26.
