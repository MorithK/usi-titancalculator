# Clear Library: Historical Sector Clear Submission Instructions

**Status:** Proposed player-facing flow, pending UI implementation and testing with more players.  
**Game version verified in supplied example:** 0.90.0.8.

## The essential distinction

A clear of **Sector N** unlocks **Sector N+1**. The automatically generated checkpoint to recover is therefore:

`Sector<N+1>_Reached_<timestamp>.save`

**Example:** For **Surface Sector 165 clear**, load a save beginning with **`Sector166_Reached_`**, *not* `Sector165_Reached_`. The timestamp suffix varies by player. One supplied example is `Sector166_Reached_2026_09_03T161528.save`.

For regions with variant clears or non-linear progression, the prefix alone is **not sufficient proof** of the clear's region or variant. The imported game data must be checked to identify the sector and region that were actually cleared. Do not infer it from the filename alone.

## Proposed player-facing walkthrough

1. In the Clear Library, first select the **sector you cleared** and **region** (and variant, when relevant).
2. **Before loading any historical save**, open the game's **Settings → General** tab and **check `No Offline Progress`**. This setting persists when an older save is loaded, according to the player's test. Do not load the save first and toggle the setting afterward.
3. In Settings, use **Open Saves Folder** (or the game's Load Save interface), then open **`SectorSaves`**.
4. Sort the files **Newest first** to make navigating the save list predictable.
5. Find the automatically generated save beginning with `Sector<N+1>_Reached_`. The app should display the exact prefix for the selected sector.
6. Load that historical save. Keep `No Offline Progress` checked so the original checkpoint does not gain up to 24 hours of simulated offline progression upon loading.
7. Return to **Settings → General** and select **Export**. Copy the resulting save string.
8. Paste the save string into the Clear Library submission page, then review the decoded sector, cleared history, region and build details before submission.

**Important:** The original sector-entry date may be embedded in the automatic save filename. The timestamp inside a freshly exported save reflects export/re-save activity and should **not** replace the original sector-entry date. Store both separately if available.

**Player safety:** Loading a historical save may replace the currently active game state. Before doing so, make sure the player's latest active save is safely backed up and they know how to restore it. Do not instruct players to overwrite their live save as part of submission.

## Suggested validation in the calculator

- Parse and validate the save string; don't modify the user's active calculator baseline merely because they are submitting a community report.
- Confirm the saved current-run clear history contains the **requested sector** in the **requested region**, considering the earlier Surface/Veil split in the save structure.
- Confirm `highest_sector` unlock evidence is consistent with the claimed clear; highest *unlocked* is not itself evidence of a cleared sector.
- Treat the filename prefix as guidance for locating the correct save, not as sufficient validation, particularly for Antumbra, Penumbra, Umbra and A/B variants.
- Show the player a preview of submitted stats and permit manual corrections.
- Record whether the player confirmed `No Offline Progress` before loading. This is a **player confirmation**, not proof supplied by the save's export timestamp.
- Do not publicly expose a player's raw private save string without explicit permission; extract only the agreed report fields.

## Validated example: Surface 165 clear

User supplied an export from `Sector166_Reached_2026_09_03T161528.save`.

Decoded values:
- `PlayerInfo.ship = "Titan"`
- `PlayerInfo.sectors_cleared_this_run` ends with `onehundred_sixtyfive`.
- `VeilController.current_layer = 0` (Surface).
- `VeilController.highest_sector = [166,164,164,164]` (Surface/Antumbra/Penumbra/Umbra).
- `VeilController.sectors_cleared_this_run[0]` includes `onehundred_sixtyfive`.

This **does** validate the Surface 165 cleared-sector claim, unlike a `Sector165_Reached_` checkpoint which normally represents the unlock after clearing Surface 164.

No raw player save string is committed to this repository.
