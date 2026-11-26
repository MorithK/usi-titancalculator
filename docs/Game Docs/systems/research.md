# Research

**Documentation status:** Initial source-grounded outline. **Formula verification:** Incomplete.

**Primary reference:** [Unnamed Space Idle Wiki — Research](https://spaceidle.game-vault.net/wiki/Research). Additional observations come from the player's saved-game and bonus snapshots.

## Game mechanics

Research branches each have their **own income** and progression, while unlocked rewards grant bonuses as bars fill. The wiki distinguishes normal, capital and specimen research in different progression phases.

**Five specimen types:** Zephyrion, Yttaldar, Xyloquant, Wraithtex, Verdanix. Their gain and research bonuses must remain separate, despite shared global specimen modifiers.

## Existing bonus snapshots

See [Applied Research](../bonuses/Research/bonus-to-applied-research.md), [Fundamental Research](../bonuses/Research/bonus-to-fundamental-research.md) and [Specimen Research](../bonuses/Research/bonus-to-specimen-research.md). The [Research folder](../bonuses/Research/) also reserves per-specimen gain and research files, some intentionally empty.

## Calculator requirements

Import progress and levels **per branch**, calculate the currently unlocked reward effects, and account for resource rate and completion time. Do not assume bonuses only apply when a bar is fully filled: the wiki says rewards accumulate during filling.

## Unknowns

Determine the exact saved record names, tier scaling, simultaneous research allocation behavior, and the interaction between global and specimen-specific gain/research multipliers. Mark formulas as unverified until compared with in-game breakdowns.


## Next steps

Map saved keys and numeric formulas, verify against at least one game snapshot, then link the implemented calculation and its tests.

**Last reviewed:** 2026-11-26.
