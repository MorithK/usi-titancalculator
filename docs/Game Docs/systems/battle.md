# Battle and Combat

**Status:** Initial outline; mathematical model unverified.

Battle outputs depend on actual equipped ship/Titan components and effective stats, including Titan Damage, Titan Shields, resistance and the enemy/sector difficulty. Purchase calculations are **not** equivalent to battle performance.

## Inputs

- Current equipped components, not merely previously unlocked components.
- Current region, sector and variant; historical highest progression is a distinct field.
- Effective damage, shields and other modifiers supplied by Synth, Warp, Reactor, Crew, Research, etc.

## Calculator boundary

A combat simulator is not part of the current Warp calculator milestone. When added, link the combat equations to verified source formulas and concrete game snapshots, not speculative multipliers.

**Sources:** [Wiki: Core](https://spaceidle.game-vault.net/wiki/Core); project Core and save-import implementation.

**Reviewed:** 2026-11-26.
