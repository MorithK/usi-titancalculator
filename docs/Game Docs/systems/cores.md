# Core and Titan Components

**Status:** Core purchase and import functions implemented; cross-system effective-stat modelling remains to be done.

## Confirmed implementation principles

- Titan component slots and purchase progression are imported from the saved game.
- **Unlocked** is not the same as **equipped**.
- **Historical highest sector** is not evidence that a component is available after reintegration.
- The calculation engine should expose effective Titan damage and shield effects from actually installed components and all active external modifiers.

## Current and future boundaries

The Core calculator currently handles affordability and resources. Full battle-stat composition is a separate effort; never silently replace purchased item state with a speculative computed loadout.

## Reference

- [Wiki: Core](https://spaceidle.game-vault.net/wiki/Core)
- [Titan Array capacity snapshot](../bonuses/Titan%20Array/titan-array-capacity.md)

**Reviewed:** 2026-11-26.
