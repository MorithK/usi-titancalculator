# Guest-first calculator and public Clear Library

**Status:** Agreed product direction; design proposal, NOT implemented.

## Product rule

Importing a save, exploring all calculators, simulating purchases and submitting a sector-clear report must **not require an account**. Authentication is only required for storing and restoring private progression in Supabase.

- **Guest:** browse/import/compare/simulate and submit a public report. No cloud save/restore.
- **Signed-in:** all guest features plus save/restore/sync private progression.
- Show sign-in or registration when the user explicitly requests cloud persistence, not on entry or whenever they simulate a purchase.
- Preserve current guest workspace during sign-in; don't overwrite it automatically with a previous cloud save. Offer an explicit choice to continue current workspace or restore cloud state.
- Keep guests' unsaved changes in memory initially and warn on reload/navigation; optional local browser storage can be a later explicit decision, with privacy implications.
- Anonymous public report submission is distinct from anonymous reads of reference data: require validation, reasonable rate limits, spam prevention and moderation before publication. Do not grant broad anonymous INSERT access to arbitrary tables or bypass RLS. Prefer a controlled backend endpoint / Edge Function with abuse controls and a pending review state; ensure no service-role secret is shipped to the browser.
- Raw game saves can contain account/player-specific data. Only publish a whitelist of extracted report fields; never publish the raw string without consent.

## Existing dependencies observed on GitHub

- `src/App.tsx`: currently returns `PlayerLogin` before mounting `AppShell` when `!user`; uses `key={user.id}` and passes `user.id` into all panels. `savePlayerData` invokes the `save_player_settings` RPC. `applyPurchases` calls a database RPC. `applyResourceImport` calls `importPlayerSnapshot`, which writes immediately.
- `src/components/AppShell.tsx`: `userEmail` and `onSignOut` currently required; needs guest header action (Sign in / Save to Cloud) and signed-in action (Save / Log out).
- `src/components/SaveImportPanel.tsx`: decoding and extracting are client-side, but `loadImportDefinitions()` requires an authenticated user and loads both reference mappings and private current player rows. The import preview compares against database state; Apply writes via `importApi.ts`.
- `src/lib/saveImport/importDefinitions.ts`: split public reference metadata retrieval from private cloud state retrieval. A guest import should work with published reference metadata and the local workspace.
- `src/hooks/usePlayerResources.ts`, `src/components/PlayerOverview.tsx`, `src/components/WarpPanel.tsx`, `src/lib/warp/loadWarpData.ts`: directly read player-specific Supabase tables/views; these must consume local workspace state rather than requiring a user ID for calculations.
- `src/utils/purchaseApi.ts`: `apply_upgrade_purchases` RPC is a cloud persistence mutation; simulations should update the local workspace first, then persist only via an explicit cloud-save workflow.
- Existing public reference tables/views need separately verified anonymous `SELECT` permissions or a static bundled reference-data strategy. Do **not** relax player-owned RLS to enable guest mode.

## Proposed state boundary

1. **Game save parser:** pure decode/extract/validate functions; no authentication and no writes.
2. **Reference metadata:** read-only game definitions available publicly (through safe published views or bundled static data).
3. **Working state:** one `PlayerWorkspace` with a distinct `importedBaseline` and `simulatedState`; calculator actions apply immutably to the local state, using decimal-safe arithmetic.
4. **Cloud persistence adapter:** signed-in load/save of the workspace to existing user-scoped tables and RPCs. No anonymous player writes.
5. **Clear Library reporting adapter:** independent public submission process with controlled server-side validation and moderation; no reliance on `player_saves`.

## Implementation sequence (manual TypeScript/React changes by project owner)

1. Introduce typed `PlayerWorkspace` and local state provider/hooks, preserving baseline vs simulation semantics.
2. Split import reference definitions from existing private player state; allow guest decoding/importing.
3. Convert one calculation vertical (resources + core purchases, for example) to read/update local workspace and verify guest behavior.
4. Convert remaining calculators and overview to the same workspace interface.
5. Make `AppShell` and `App.tsx` accessible to all; move login/registration to explicit persistence actions. Remove the assumption `user.id` always exists; avoid remounting/losing the workspace on auth changes.
6. Implement signed-in restore/save explicitly, with collision resolution when guest state and cloud state both exist.
7. Add public browse and controlled no-account submission flow for the Sector Clear Library.
8. Test logged-out private-table isolation, guest calculation parity, sign-in conversion, logout/account switch and refresh behavior.

## Acceptance criteria

- Open app in a fresh unauthenticated browser; all functional calculators and imports work without errors.
- An imported baseline remains distinct from purchase simulations, and buying upgrades changes local balances appropriately.
- Guest calculation calls perform **no private player reads or writes**.
- Signing in does not silently replace a populated guest workspace.
- Cloud saves are associated with the authenticated account and protected by existing RLS.
- Guests can submit Clear Library reports without an account but cannot edit other users' private data or spam public output directly.
- Public browsing works without login.

**No application code or Supabase SQL was changed by this design document.**
