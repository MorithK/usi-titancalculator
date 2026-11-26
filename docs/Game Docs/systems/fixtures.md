# Fixtures — Synth Subsystem

**Status:** Mechanics documented from the wiki; Titan-era applicability and exact per-fixture formulas still require save verification.

Fixtures are a **time-cost** upgrade system associated with Synth, but **not powered by regular Synth Speed**. Their timing uses the separate **Fixture Creation Speed** statistic. Fixture upgrades contribute multipliers to Titan damage/shields, Synth Speed, Reactor Speed, Strata Speed, Specimen Gain, Crew Adaptions and other targets depending on tier/progression.

## Source mechanics

According to the [wiki Synth / Fixtures section](https://spaceidle.game-vault.net/wiki/Fixtures):

- Fixtures unlock from **sector 76** in the general progression description.
- Early fixtures take **two hours at level zero**; the time cost **doubles for each level**.
- First-row fixtures cap at **level 35**. Later rows have different baseline times and caps.
- Fixtures are **not** accelerated by normal Synth Speed, and do **not** reset on ordinary prestige.
- This wiki description includes earlier progression and should **not** be taken as a complete Titan-era fixture catalog.

The player's current breakdown lists four Synth Speed Fixtures and other tiered fixture bonuses; obtain the correct base time/cap/effect for **each actual fixture** before calculating purchase durations.

## Independent modifiers

[Fixture Creation Speed snapshot](../bonuses/Synth/fixture-creation-speed.md):

- Base 1; recorded flat additions from `Recipes: Recipe Fixture Speed`.
- Multiplicative sources include Titan Synth, Synth upgrades, Titan Utilities, Powercells, Research, Warp, Residium, Crew Mastery, Splicing, Reinforcement, Fleet and Veil.
- Missing from the snapshot: `Module: Fixture Fixer` and `Spliced Materials Engineer: Fixture Discipline`.

This is a list of **observed contributions**, not all formulas or active conditions.

## Intended calculator

Inputs: fixture identity/tier, imported levels, remaining progress, current effective Fixture Creation Speed and source effects.

Outputs: time to next fixture level, time to max a fixture, resource/time implications and emitted modifiers.

**Do not subtract material inventory:** the relevant upgrade cost here is **time**, not a craftable ingredient.

## Related

- [Synth system](synth.md)
- [Alien Synth](alien-synth.md)
- [Synth Speed bonus](../bonuses/Synth/synth-speed.md)
- [Fixture Creation Speed](../bonuses/Synth/fixture-creation-speed.md)

**Last reviewed:** 2026-11-26.
