# USI Titan Calculator — Game Mechanics Documentation

> **Purpose:** Version-controlled evidence for implementing the calculator, not a claim that every game formula has been reverse-engineered.

## How to use these documents

- **[System documents](systems/)** describe how each mechanic works, what game state it needs, what it produces, and how other systems affect it.
- **[Bonus snapshots](bonuses/)** preserve the *observed* in-game stat breakdowns from **26 November 2026**. The listed multipliers are observations at a particular progression state, **not** automatically reusable formulas.
- **[Modifier map](modifier-map.md)** tracks sources, effects, operations, activation conditions, candidate save keys, and verification.
- **[Warp system](systems/warp.md)** is the current implementation focus.
- **[Synth system](systems/synth.md)** includes recipe planning, modules and links to the separate Alien Synth mechanics.
- **[Alien Synth notes](systems/alien-synth.md)** document differences in inventory, recipes and speed.
- **[Fixture mechanics](systems/fixtures.md)** document time-based upgrades.

### Bonus categories

| Category | Scope |
|---|---|
| [Resource](bonuses/Resource/) | Capital resources, Veil, Antum and Penum fragments |
| [Synth](bonuses/Synth/) | Synth Speed, Alien Synth Speed, Fixture Creation Speed, output and active slots |
| [Warp](bonuses/Warp/) | Charge, discharge, Skein, Residuum and persistence |
| [Research](bonuses/Research/) | Applied, Fundamental, Specimen and specimen-type research/gain |
| [Titan Array](bonuses/Titan%20Array/) | Titan capacity |
| [Veil Shift](bonuses/Veil%20Shift/) | Alignment and scaling |

**Status convention:** `Observed` = copied from the game; `Candidate` = plausible mapping/formula; `Verified` = checked against game at relevant progression levels; `Unknown` = not enough evidence. Empty stat files are intentional placeholders, **not zero bonuses**.

## Sources and precedence

1. **In-game stat breakdown**: strongest reference for *what applies to the captured save*; rounded displayed values should not be treated as exact.
2. **Decoded player save**: authoritative for player levels, ownership, loadout, and resource balances; not automatically a source of calculated bonus formulas.
3. **[Original calculator spreadsheet](https://docs.google.com/spreadsheets/d/1xdB9Xdr1SLnLHsQxNrbUPB6cQrC62kfweJQfW6lQxJ8/edit)**: tested behavior for planning, dependencies, timing estimates and display.
4. **[Unnamed Space Idle Wiki](https://spaceidle.game-vault.net/wiki/Main_Page)**: published mechanics and candidate mathematical effects; content may describe another phase or version.
5. **Google Apps Script bound to the spreadsheet**: the source for automatic Warp countdown/award behavior, **not yet retrievable through the available connector**. Do not mark timer transitions verified until the script is inspected.

Where these disagree, **record the difference and game version** rather than silently replacing the user's snapshot.

## Calculator boundaries

- Imported save is the **baseline**; checkboxes are *plans*, not purchases.
- A target's true cost includes all missing prerequisites. For recipes, shared ingredients may be **consumed** and must be counted by quantity; Warp unlock prerequisites are one-time purchases.
- Distinguish **owned, unlocked, equipped, active** and **planned**.
- Use decimal/scientific arithmetic without rounding internally; round only for presentation.
- Individual objectives and combined-objective totals are different calculations. Apply inventory/Skein **once** to the combined result.
- A future goal simulator needs validated cross-system modifiers. It is **not** part of the current Warp calculator work.

## Documentation tasks

1. Preserve each in-game breakdown without altering its original values.
2. Identify source upgrade/save key and target statistic.
3. Record operation (flat, additive multiplier, or multiplicative multiplier) and activation rules.
4. Find a candidate progression formula from the wiki/reference data.
5. Test against at least one game snapshot, ideally two progression levels.
6. Link the verified calculation and regression test.

**Last reviewed:** 2026-11-26.
