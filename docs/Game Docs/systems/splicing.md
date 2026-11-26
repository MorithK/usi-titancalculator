# Splicing and Crew Extensions

**Documentation status:** Initial source-grounded outline. **Formula verification:** Incomplete.

**Primary reference:** [Unnamed Space Idle Wiki — Splicing and Crew Extensions](https://spaceidle.game-vault.net/wiki/Splice). Additional observations come from the player's saved-game and bonus snapshots.

## Scope

Splicing, Humanity and Corruption upgrades contribute cross-system effects but must remain distinct from basic Crew XP and specialist levels.

## Observed effects

The in-game breakdowns show sources including `Splicing Humanity: Synth Support`, `Splicing Corruption: Warp Discharge Support`, `Spliced Materials Engineer: Enhanced Synthing`, and `Spliced Researcher: Research Discipline`. Preserve exact source names until mapped to save keys.

## Architecture

Build Crew/splicing progression as an independent state model. Export modifiers based on currently purchased, active and applicable upgrades. Avoid applying all Humanity and Corruption modifiers unconditionally; source presence is not proof of activation.

## Verification

The [Crew wiki](https://spaceidle.game-vault.net/wiki/Crew) includes upgrade and point mechanics, but Titan-era progression may add conditions. Verify current game source before implementing point costs and cross-system formulas.


## Next steps

Map saved keys and numeric formulas, verify against at least one game snapshot, then link the implemented calculation and its tests.

**Last reviewed:** 2026-11-26.
