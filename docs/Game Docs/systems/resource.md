# Resources

**Documentation status:** Initial source-grounded outline. **Formula verification:** Incomplete.

**Primary reference:** [Unnamed Space Idle Wiki — Resources](https://spaceidle.game-vault.net/wiki/Resources). Additional observations come from the player's saved-game and bonus snapshots.

## Scope

Resources have multiple acquisition and spending mechanics: combat gains, crafting inventory, reinforcement layers, shard/fragment earnings and other system-specific production. **A resource balance is not the same as a gain multiplier.** The original save importer already extracts player-resource balances for the calculator.

## Current observed bonus destinations

- [Capital Resource Gain](../bonuses/Resource/capital-resource-gain.md)
- [Veil Fragment Gain](../bonuses/Resource/veil-fragment-gain.md)
- [Antum Fragment Gain](../bonuses/Resource/antum-fragment-gain.md)
- [Penum Fragment Gain](../bonuses/Resource/penum-fragment-gain.md)

The Antum and Penum snapshots currently show the **same observed factor**, which is evidence of one snapshot, **not** proof that the two formulas must always remain identical.

## Requirements

Track balances and effective rates separately, including game region, unlocks and the difference between normal versus shifted fragment types. Retain scientific precision for large balances. Surface each contributing modifier through the shared mapping layer.


## Next steps

Map saved keys and numeric formulas, verify against at least one game snapshot, then link the implemented calculation and its tests.

**Last reviewed:** 2026-11-26.
