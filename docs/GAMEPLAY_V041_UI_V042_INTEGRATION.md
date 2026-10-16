# RC1 integration candidate: Balance B + UI v0.4.2 + Polish 5/5.1, 6 and 7 + Azure Keep HUD

## Current RC1 scope (2026-10-16)

Evidence retention: screenshots/generated verification files mentioned below are historical local archive paths, deliberately omitted from the minimal RC1 commit. They are not required attachments in a Git-only checkout. See `rc1-audit/WHITELIST_REVIEW.md` for the exact classification; this report's release/integration findings remain included.

This candidate now includes the approved fantasy panel polish and compact controls (5/5.1), Slice 6 compact Build placement and removal of the decorative Azure Archer Tower, and the accepted Slice 7 Fantasy Pause Menu. See `RC1_AUDIT.md` for the current verification, exact proposed commit manifest, test-debt classification and approval gate. The sections below retain the earlier integration investigation as historical evidence; its test counts and baseline comparisons are not fresh RC1 results.

Status: **uncommitted integration candidate for human playtesting.** Nothing is committed, pushed, merged into `main` or deployed. Both source worktrees are unmodified.

| | |
|---|---|
| Worktree | `G:\work\ark\arkhero-integration-v041-v042` |
| Branch | `integration/gameplay-v041-ui-v042`, created at `80a24df` (UI v0.4.2) |
| Working-tree changes | Balance B, Azure Keep HP plate, UI Polish 5/5.1, Slice 6 placement/tower removal, Slice 7 Pause Menu, tests and release evidence; all uncommitted |

## A. Source branch and commit inventory

| Source | Location | Commit | State at preflight |
|---|---|---|---|
| `main` | `G:\work\ark\arkhero` | `da7475debb5e382c429d9005ff010390dcc7a1cc` | Five untracked planning docs (not touched) |
| UI v0.4.2 `ui-v0.4.2-shop-grid` | `C:\Users\patip\.codex\worktrees\ui-v042-shop-grid\arkhero` | `80a24dffc7ed00c0d33b729d69c1919027856290` | Clean. Four commits on top of `da7475d`: `5762fc6` Shop grid, `7634b13` Equipment, `9c8500a` Build, `80a24df` Skills |
| Gameplay v0.4.1 `gameplay-v0.4.1-balance` | `G:\work\ark\arkhero-gameplay-v041` | `da7475d` (**no commits**) | All work is uncommitted: 5 modified and 9 untracked paths (below) |

The common baseline is `da7475d`. The UI branch descends from it directly, so step 1 is a fast-forward with no conflicts.

The gameplay changes were transferred by audit-friendly export, not by copying whole files over UI-modified files:
- `git diff --binary` into a patch (SHA-256 `bbe401ed4631eadcef38ed4b45d0804d9707279253f247426953ef88961f9f73`);
- a copy of each untracked file;
- `git apply` / `git apply --3way` per file.

The gameplay worktree's `git status` showed the same 13 entries before and after the transfer.

## B. Scope classification

| Class | Files | Decision |
|---|---|---|
| Approved UI implementation | `src/ui/{ShopPanel,ShopItemIcon,shopItems,shopModel,shopGridLayout,equipmentLayout,BuildPanel,buildLayout,buildModel,SkillsPanel,skillsLayout,skillsModel}.ts`, `src/scenes/HUD.ts`, `public/assets/item-*.png`, UI tests and verify scripts, `docs/ui-v042-*` | Taken unchanged (`80a24df`) |
| Approved Gameplay Balance B | `src/data/gameplayV041.ts`, `src/simulation/Simulation.ts`, `src/simulation/GuardianSkills.ts`, the combat-variant hunks of `src/scenes/Battle.ts`, `tests/gameplay-v041.cjs` | Integrated, with B made the active default (§D) |
| Azure Keep HP HUD | `src/ui/azureKeepHud.ts`, the plate hunks of `src/scenes/HUD.ts`, the Keep-obstruction hunks of `src/scenes/Battle.ts`, `tests/azure-defense-hud.cjs`, `docs/AZURE_DEFENSE_HUD.md`, `docs/gameplay-v041/*.png` | Integrated (§E) |
| Experimental Balance A/C support | Variants `a` and `c` in `gameplayV041.ts`; `scripts/balance-v041.mjs` (A/B/C plus sensitivity variants); the `setCombat` hook in `scripts/balance-v04.mjs` | Kept for comparison only. They are never the default: the harness passes them explicitly, and the dev server overrides only with a console warning |
| Azure Tower experiments | Historical in-memory balance experiments, `docs/AZURE_DEFENSE_HUD.md` §3 | No experimental combat implementation. Slice 6 removes the decorative map tower (§G) |
| Tests and documentation | `docs/GAMEPLAY_V0_4_1.md`, which got a status banner; this report; `scripts/verify-azure-keep-hud.mjs`, a new integration browser check; retargeted unit tests (§C3) | Integrated |
| Unrelated or unapproved | None found in either source. The five untracked docs on `main` were not touched | — |

Overlapping files:
- **`src/scenes/HUD.ts`** is the only file changed by both sources. Two textual conflicts, resolved in §C.
- **`src/scenes/Battle.ts`** was changed only by gameplay, but HUD obstruction now has two producers:
  - the UI branch reuses `shop-obstruction` for the Shop, Skills and Build panels;
  - gameplay adds `keep-hud-obstruction`.

Integration risks:
1. Base-HP and damage literals in pre-existing tests (41 failures once B became the default; §C3).
2. HUD real estate under the minimap (the inspector conflict; §C2).
3. Silent variant override. Mitigated: the override is dev-only and warns in the console (§D).

## C. Manual conflict-resolution log

### C1. Textual conflicts in `src/scenes/HUD.ts` (`git apply --3way`)

1. **`layoutControls()` emit line.**
   - UI side: added Build/Skills panel layout, the new `shop.layout(…, topHudBottom)` signature, and a combined Shop/Skills/Build obstruction.
   - Gameplay side: prepended `keep-hud-obstruction` and closed the method before adding `drawKeepPlate()`.
   - Resolution: the **UI line is kept byte-for-byte**, prefixed by the gameplay `keep-hud-obstruction` emit, and followed by gameplay's `drawKeepPlate()` method, unchanged.
   - Both channels coexist. Battle stores them in separate fields (`shopObstruction` and `keepHudObstruction`) and applies both to the world Keep bars.
2. **Per-frame update.**
   - UI side: replaced the old Build label loop with `this.buildPanel.render()`.
   - Gameplay side: kept the old label loop and appended `drawKeepPlate()`.
   - Resolution: **UI `buildPanel.render()` kept, old label loop dropped** (it targets labels the UI branch removed), and `this.drawKeepPlate()` appended after `defenseFeedback.sync`.

Audit result:
- `HUD.ts` = UI `80a24df` + exactly the gameplay plate additions + the one-line inspector move (C2), verified by `diff --strip-trailing-cr`.
- `Battle.ts` = the gameplay worktree's file, except the B-default selector (§D).

### C2. Layout reconciliation: tap inspector vs Keep plate (new edit)

Problem: the tap inspector, a two-line "name / HP" text shown after tapping a world object, was fixed at logical (948, 113) under the minimap. That is exactly where the Keep plate sits (logical 782–952 × 109–139 at 960×540).

Evidence: the integration browser check reproduced the collision; the two HP strings were printed on top of each other. The gameplay branch had the same latent overlap, but its checks never opened the inspector.

First attempt: moving the inspector below the plate created a new overlap with the Shop-time toast, which sits at `shopHudBottom+16`. It was rejected.

Resolution, one line in `HUD.layoutControls()`:
- the inspector is right-aligned to the plate's left edge and top-aligned with it (`k.x-6/scale`, `k.y+2/scale`);
- at every tested size it is clear of the pause button, minimap, plate, toast, ability and utility buttons, and the Shop, Equipment, Build and Skills panels, which all end further left.

Its font, text and behaviour are unchanged.

### C3. Test reconciliation (Balance B becomes the default)

Making B the `Simulation` default failed 41 pre-existing assertions. All of them pinned v0.4 numbers: Guardian base HP 1200, Crimson tower 24 vs the Guardian, Crimson Keep 14. No mechanics regression was involved.

Fixture choice: they were **retargeted to the active balance, not pinned to Variant A**. The suite therefore checks what the game ships, and every assertion keeps its strictness:

| File | Change |
|---|---|
| `artifacts.cjs`, `artifact-transactions.cjs`, `guardian-skills.cjs`, `match.cjs`, `simulation.cjs` | `1200` → `HP0` (`activeCombatVariant.guardianBaseHp` = 980) in the same formulas, e.g. `(HP0+60*(LV-1))*(1+.05*Fortitude)+items` |
| Same files: fixtures set at 600 HP | Changed to `HP0/2`. They are "exact half HP" tests: 600 was exactly half of 1200, and keeping 600 under B would test a different fraction, 0.612. The `1 HP → 1.2` precision case is now the floored B value, 1.25 |
| `balance-v02.cjs`, `encounter.cjs` | Tower raw vs the Guardian 24 → 26. Both also still assert the underlying constant (`balanceV02.crimsonTowerDamageVsGuardian === 24`, `guardianStats.maxHp === 1200`) |
| `gameplay-v04.cjs` | Runtime Keep damage 14 → 17. The v0.4 data object is still asserted to be 14, with cadence and range unchanged |
| `gameplay-v041.cjs` | "A equals the default constructor" becomes "B equals the default; A and C diverge". The launch-option test now expects B for missing, unknown and production values |

Added: a **runtime Balance B** test. A default-constructed match:
- starts at 980 HP (both encounters) and reaches 1100 at LV3;
- takes **real ticked** Crimson minion, tower and Keep hits of raw 20 / 26 / 17, with armor applied once;
- respawns at the B maximum for its level.

## D. Verified Balance B parameters

Variant B is active through `activeCombatVariantId='b'` in `src/data/gameplayV041.ts`:
- `Simulation`'s default `combat` argument is `activeCombatVariant`;
- `combatVariantFromSearch` falls back to it for missing, unknown or production values;
- `?combat=a|c` works **only** on the Vite dev server and logs `console.warn("[gameplay v0.4.1] dev override: …")`;
- production builds ignore the parameter.

| Parameter | Required | Runtime check | Result |
|---|---|---|---|
| Guardian base HP | 980 | `new Simulation()`: `hero.hp === hero.maxHp === 980` (unit test). Normal URL in Chrome: 980/980, HUD shows `980 / 980` | ✅ |
| HP growth | +60 / LV | LV1→20 table: `HP0+60·(LV−1)` | ✅ |
| LV3 HP | 1100 | Unit test and respawn-at-LV3 test | ✅ |
| Crimson minion → Guardian | 20 | Ticked minion attack, `raw === 20` | ✅ |
| Crimson tower → Guardian | 26 | Ticked tower attack, `raw === 26`, mitigated `26·100/(100+armor)` | ✅ |
| Crimson Keep damage | 17 | `red-base.damage === 17`; ticked Keep hits `raw === 17` every 24 ticks. Browser: `keep: 17` | ✅ |
| Unchanged | Armor formula, Fortitude, items, XP, Gold, waves, respawn, combat rules | Rest of the suite, unchanged assertions | ✅ |

Scope notes:
- The minion and tower increases apply to hits **on the Guardian only**, as before.
- The Keep's single damage value is replaced.
- Azure-side pressure (Crimson minions vs the Azure Keep or minions, towers vs minions) stays at 18.

### Comparison with the previous v0.4.1 baseline

Method:
- `node scripts/balance-v041.mjs all a,b --json=…` was run in the integration worktree.
- The same command was run on a read-only copy of the original gameplay worktree's files, built in a scratch directory (the source worktree was not built or modified).
- Both cover 10 scenarios; rush, shield, hammer, defend15 and dying run at bot reactions 1, 2 and 3.

Result: **the JSON outputs are byte-identical** for A and for B. The UI integration changed no simulation outcome, and B's integration numbers equal the v0.4.1 B results in `GAMEPLAY_V0_4_1.md` §3:

| Scenario (bots) | B result |
|---|---|
| Rush, no items | 3/3 Victory, 184–208 s, 4 deaths, Azure Keep 1074–3000, LV9 |
| Left flank (`flankWing`) | Defeat 83 s, 2 deaths, Crimson Keep 840 left |
| Right flank (`flankWingS`) | Defeat 106 s, 3 deaths, Crimson Keep 72 left |
| Guardian Shield | 3/3 Victory, 260–262 s, 2 deaths, Azure Keep 2100–2604 |
| Siege Hammer | 3/3 Victory, 259–263 s, 2 deaths, Azure Keep 3000 |
| Hammer flank | Victory 202 s, 1 death, Azure Keep 2100 |
| Defend 15 min | Holds, 0–1 deaths, Azure Keep 2280–3000, LV20 (max HP 2332) |
| Guardian absent | Defeat 112 s (identical to A) |
| Repeated deaths | 2 Victory / 1 Defeat, 257–358 s, 7–8 deaths |
| Survive 20 min | Holds, 1 death, Azure Keep 2370 |

Differences from A, unchanged from the v0.4.1 study:
- Matches are longer, with one or two more deaths.
- The right flank flips from Victory (A) to Defeat (by 72 Keep HP).
- Lane defense is barely affected.

Comparison with the human B playtests (Frontal Rush 180 s, 8 deaths, Azure Keep 1758; Left Flank 155 s, 3 deaths, Azure Keep 2046):
- The human rush time sits within the bot range (184–208 s) but with twice the deaths, consistent with the v0.4 human/bot death ratio.
- The human Left Flank **won**, where the bot (which never defends Azure) loses.

Bots are not human proxies. These remain reference observations.

## E. Azure Keep HP HUD behaviour

`src/ui/azureKeepHud.ts` defines the layout and state; `HUD.drawKeepPlate()` draws it.

- **Data:** the plate shows `AZURE KEEP` and `ceil(hp) / maxHp`. They are read every HUD frame from `simulation.state.bases['blue-base']`, with no UI counter and no tweening, so there is no fake healing.
- **States:**

  | HP | Bar |
  |---|---|
  | ≥ 50% | Blue |
  | Below 50% | Amber |
  | Below 30% | Red, with a slowly breathing red border |
  | 0 | Red, "destroyed" |

- **Size and position:** 170×30 CSS pixels at every size, right-aligned with the minimap panel, 4 CSS pixels below its shadow.
- **World Keep bars:** the plate is a local obstruction (`keep-hud-obstruction`). A world Keep bar that would sit under it drops just below it, and the global HUD clearance is unchanged.
- **Unchanged:** the existing in-world Keep bars and the "Azure Keep under attack" toast and wave-line warning.
- **Draw order:** the pause overlay (depth 1000) and the results (depth 2000) draw above the plate.

Browser verification: `scripts/verify-azure-keep-hud.mjs`, new, run with `npm run dev -- --port 5196`. Result: **55/55 in Chrome and 55/55 in Edge**, with no page or console errors. It covers:

- **Viewports:** 844×390, 960×540, 1280×720, and 844×390 and 960×540 with unequal safe insets (left 32, right 12, top 8, bottom 12).
- **Every viewport, in each state** (idle, inspector open, Shop grid, Equipment, Build expanded, Build collapsed with a card selected, Skills, and Guardian dead with the camera at the Crimson edge and the Keep at 720/3000):
  - the plate is visible, shows the authoritative text and measures 170×30 CSS;
  - it is inside the safe-area box;
  - it doesn't overlap any of: 5 ability buttons, 3 utility buttons, pause, Skills button, joystick, minimap, match plate, combat notice, toast, inspector, or the open Shop/Equipment/Build/Skills panel;
  - the moved inspector doesn't overlap any of those either.
- **Live waves with the Guardian absent:** the shown value equalled the simulation in all 60 samples and never rose (2244 → 2010, 13 drops).
- **Pause overlay and Defeat results:** both draw above the plate. On Defeat the plate reads `0 / 3000` (destroyed). After restart it reads `3000 / 3000` and the match is still Balance B.
- **Variant selection:** the normal URL is Balance B with no override warning; `?combat=a` on the dev server warns in the console.

## F. UI preservation results

No UI v0.4.2 source file was redesigned. `ShopPanel`, `BuildPanel`, `SkillsPanel` and their layout and model modules are byte-identical to `80a24df`. `HUD.ts` differs only by the plate additions and the one-line inspector move.

| Area | Evidence on the integration candidate |
|---|---|
| Shop: seven-item 4×2 grid, painted icons, details, authoritative purchase, Fusion, trade restrictions | `verify-shop-grid` **113/113**; unit tests `shop`, `shop-grid` and `equipment-ui` 18/18; `verify-flame-fusion` 24/24 |
| Equipment: six-slot 3×2 grid, exact-instance selection, refund quotes, sale confirmation, pending safeguards | `verify-equipment` **121/121** |
| Build: illustrated cards, live Wood/Iron costs, Builder's Crown discount, collapsible tray, select → cell → Confirm | `verify-build-ui` **60/60**; `verify-builders-crown` 27/27; `verify-building` 24/24; unit tests 19/19 |
| Skills: two-column standard view, compact five-skill focus, authoritative rank and points, locked/available/max states | `verify-skills-ui` **41/41** after the helper fix below; `verify-skills-input` 24/24, including Edge touch at DPR3; unit tests 96/96 |
| Other UI | `verify-popup-touch` 152/152 (Chrome/Edge popup input); UI-A1 58/58; UI-A2 70/70 |

**Helper fix in `scripts/browser-coordinates.mjs` (`clickSkillControl`):**
- Symptom: `verify-skills-ui` failed intermittently at "<skill> actual simulation upgrade", **equally on the unmodified UI baseline** (failing at Taunt on one server and at Charge on the other).
- Diagnosis: the Guardian was alive at full HP and the status read "Requires LV1 · 1 point". The upgrade tap landed while the compact panel was re-rendering after a focus change.
- Fix: the helper now waits two painted frames after focusing and before tapping. No assertion changed.
- Result: 41/41, twice on each server.

## G. Azure Tower combat status

**Resolved by approved Slice 6: decorative Azure Archer Tower removed.**

- The static tower at world (620,495) is no longer in `src/world/layout.ts` entities. Its visual, map marker, decorative health bar, collision, navigation, LOS and placement obstruction are removed together. The two map walls remain.
- A separate `towerVisual` template preserves rendering of actual built/enemy towers without map occupancy. `tests/azure-defense-hud.cjs` asserts decorative-tower absence and confirms that **player-built** Azure Archer Towers still attack: 18 damage per 24 ticks, range 240, nothing while under construction.
- No approved combat implementation exists in either source; there is only the gameplay branch's in-memory experiment (`docs/AZURE_DEFENSE_HUD.md` §3). Arming the decorative tower at full built-tower strength:
  - removed nearly all early Crimson pressure on Azure (rush: Azure 3000, 0 minions reaching it);
  - flipped the no-item left flank from Defeat to Victory under B, undoing much of B's intended difficulty.
- No stats were invented and the decorative tower was not armed. Removal is the approved resolution, not a new combat feature. See `ui-polish-slice6/REPORT.md`.

## H. Full test results

### Headless and build checks

| Gate | Result |
|---|---|
| Full headless suite (`npm test`) | **537 / 537 passed**, 0 failed, 0 skipped. Before integration: UI 522/522 |
| Gameplay v0.4.1, Azure HUD, v0.4 and v0.2 balance (`gameplay-v041`, `azure-defense-hud`, `gameplay-v04`, `balance-v02`) | 37 / 37 |
| Shop and Equipment (`shop`, `shop-grid`, `equipment-ui`) | 18 / 18 |
| Build (`build-ui`, `builders-crown`) | 19 / 19 |
| Skills (`skills-ui`, `guardian-skills`, `progression`) | 96 / 96 |
| Fusion and transactions (`flame-fusion`, `artifact-transactions`, `artifacts`) | 70 / 70 |
| TypeScript (`tsc --noEmit`) | Pass |
| Production build (`npm run build`) | Pass; existing >500 kB chunk advisory only |
| Production bundle check (`vite preview`) | Normal URL, `?combat=a` and `?combat=c` all run B (980 HP, Keep 17) |
| `git diff --check`, including new files | Clean |
| Deterministic balance, integration vs v0.4.1 source | Byte-identical (§D) |

### Functional regression coverage

All of the following are covered by deterministic simulation tests in the 537:
- Guardian HP and damage intake; level-up and Fortitude; Shield composition; Crimson tower, Keep and minion attacks (ticked);
- Azure minions and player-built towers; Gold and resources; purchases, sales and Fusion; construction, placement and completion; skill upgrades;
- respawn and death; Victory and Defeat; restart; listener cleanup.

### Browser checks

There are 35 scripts (`verify-shop.mjs` only imports `verify-shop-grid.mjs`). All ran headless in Chrome against the integration dev server:
- from a disposable scratch copy of `scripts/`, so tracked evidence under `docs/` was not overwritten;
- with each script's own default query string.

Every failure was rerun against an **unmodified export of the UI baseline `80a24df`**.

| Status | Scripts |
|---|---|
| **Pass (23)** | azure-keep-hud 55/55 (Chrome and Edge), build-ui 60/60, builders-crown 27, building 24/24, commander-banner 19, damage-feedback, dead-camera, equipment 121/121, extended (458 s autonomous match), flame-fusion 24, guardian-collision, match **16/16** (passes for the first time; previously historical), match-resize, popup-touch 152, ruby, shop-grid 113/113, siege-hammer 19, skills-input 24, skills-ui 41/41, tower-appearance, ui-a1 58, ui-a2 70 |
| **Fail on the integration candidate and identically on the baseline (12)** | See §J |
| **Fail only on integration** | **None** |

Balance-B fixture retargeting in browser scripts (same rule as §C3):

| Script | Assertion | A → B |
|---|---|---|
| `verify-match.mjs` | Restart HP | 1200 → 980 |
| `verify-skills.mjs` | LV2 max HP | ≥ 1260 → ≥ 1040 |
| `verify-skills.mjs` | Restart max HP | 1200 → 980 |
| `verify-progression.mjs` | LV3 respawn HP | 1320 → 1100 |
| `verify.mjs` | "Wait for damage" condition | `hp < 1200` → `hp < maxHp` |

Under B, `hp < 1200` would be true at once, so leaving it would silently weaken the check.

## I. Browser screenshots

Historical local-only archive: `integration-v041-v042/`. Measurements were recorded in `keep-hud-verification.json`; these generated artifacts are omitted from the minimal RC1 whitelist.

| Screenshot | Shows |
|---|---|
| `keep-hud-idle-{844x390,960x540,1280x720,844x390-safe}.png` | Plate under the minimap at full HP. The Guardian plate shows `980 / 980` (Balance B) |
| `keep-hud-inspector-960x540.png` | Inspector beside the plate (§C2) |
| `keep-hud-shop-{844x390,960x540,1280x720}.png` | Shop grid with the plate clear |
| `keep-hud-build-{844x390,960x540}.png` | Build tray with the plate clear |
| `keep-hud-skills-{844x390,960x540,1280x720}.png` | Compact and standard Skills with the plate clear |
| `keep-hud-dead-far-low-*.png` | Guardian dead, camera on the Crimson edge, Keep 720 / 3000 (red, low) |
| `keep-hud-paused-844x390.png` | Pause overlay above the plate |
| `keep-hud-defeat-844x390.png` | Defeat results above the plate, which reads `0 / 3000` |

In the paused and Defeat captures the Guardian plate reads "Revive 3333325". That is the probe's fixture, which parks the Guardian with `respawnTick=1e9`; it is not a game state.

## J. Known historical failures

These scripts fail at **the same first failing assertion on the unmodified UI v0.4.2 baseline** (`80a24df`, served from a scratch export). They are pre-existing fixture debt, not integration regressions. No assertion was weakened to make them pass.

| Script | First failure (integration = baseline) | Classification |
|---|---|---|
| `verify-combat-hud` | 25 checks pass. Then "No console or page errors" fails on Chrome's `touchcancel cancelable=false` intervention notice | Known test debt; current RC1 rerun reproduces it. No assertions filtered or weakened; see `RC1_AUDIT.md` |
| `verify-context-guidance` | "Moving with unspent initial point triggers explicit allocation advice" | Same failure on baseline; cause not investigated further |
| `verify-defense-feedback` | Expects a combined `Wave 0 / 12 · 0:00` string | The compact HUD splits wave and timer into two texts. Obsolete fixture |
| `verify-keep-health` | 960×540 pan 197 expects the world bar at y ≥ 144 | Stale Phase 2C constant; the current HUD ends at 113. Already documented in `AZURE_DEFENSE_HUD.md` |
| `verify-mobile-hud` | 22 pass; the 23rd fails strict 960×540 unequal-safe header geometry | Documented in UI v0.4.2 Skills §K |
| `verify-navigation` | Waits for prototype unit `red-0-0` | Documented in UI v0.4.2 Skills §K |
| `verify-progression` | Fresh HUD expects `XP 0 / 80` | The compact HUD label is `XP`. Obsolete fixture |
| `verify-skill-allocation` | Expects an LV1 text without "SP" shorthand from the pre-v0.4.2 panel | Same failure on baseline; cause not investigated further |
| `verify-skills` | 4 pass, then a joystick-drag timeout | Same on baseline. The B literals in it were retargeted (§H) |
| `verify-top-hud` | Reads a retired HUD text field (`undefined.text`) | Obsolete fixture |
| `verify-extended-lifecycle` | 1 check passes, then a 60 s wait times out (the script still exits 0) | Same on baseline |
| `verify.mjs` (legacy Phase 1C) | Several legacy expectations (Pause, Shop "invisible target", wave defeats) | Same on baseline |

`verify-match`, previously listed as historical, now passes 16/16 in the prototype encounter.

## K. Human playtest instructions

```
cd G:\work\ark\arkhero-integration-v041-v042
npm run dev
```

Open **http://127.0.0.1:5173/**. This is the normal URL: the extended encounter running Balance B. Do **not** add `?combat=`.

To confirm, the Guardian plate shows `980 / 980` at LV1, and the browser console has no `dev override` warning.

Scenarios. Note deaths, match time and final Azure Keep HP:

1. **Frontal Rush.** Push mid-lane with no items. Previous B playtest: 180 s, 8 deaths, Azure Keep 1758.
2. **Left Flank.** North lane, destroy `keep-north`, then the Keep. Previous: 155 s, 3 deaths, Azure Keep 2046.
3. **Guardian Shield.** Buy the Shield (500 G) near Azure, then push.
4. **Siege Hammer.** Buy the Hammer (550 G), then assault the towers.
5. **Azure Keep defense and building placement.** Build: select a card, choose/reselect a cell, Confirm. Check the 120px placement tray, Change/Cancel and live costs. Built Archer Towers should shoot; the old decorative tower and its obstruction must be absent (§G).
6. **Shop purchase and Equipment sale.** Buy, then sell from Equipment with confirmation; check the refund quote. Try Flame Blade fusion.
7. **Skill upgrades during combat.** Open Skills mid-fight. In the compact view, step through all five skills; check that rank and points update.
8. **Guardian death and respawn.** While dead, pan the camera away. The Azure Keep plate must stay visible and keep updating.

The previous results are reference observations, not deterministic targets. Human pacing differs from the bots.

## L. Remaining risks

1. **Azure Tower removal (§G).** Approved Slice 6 opens the old decorative footprint; validate physical-device placement and movement there during playtesting.
2. **B is harder for bots on the right flank** (Defeat by 72 Keep HP). Human feedback preferred B, and the human Left Flank won. Watch whether no-item flanks feel unwinnable.
3. **Test retargeting.** 41 headless assertions and 5 browser assertions now follow the active variant. If the active variant changes again, the `HP0`-based tests follow automatically; the browser literals (980/1040/1100) do not.
4. **Inspector move (§C2).** This is a small layout change the UI review hasn't seen. At 844×390 the inspector's fixed 11-logical-pixel font renders at about 8 CSS px. That size predates this integration.
5. **Static inspector string.** `src/world/layout.ts` still lists the Guardian as `'1,200 / 1,200'`. The HUD overwrites it with live HP on the next frame, so at most one frame can show it.
6. **Historical browser debt (§J):** 12 scripts with stale fixtures, all identical to the UI baseline.
7. **Not tested:** physical devices and real notches. Safe areas were tested with CSS insets only.
8. **Evidence size.** `docs/integration-v041-v042/` adds about 14 MB of PNGs, in line with the UI branch's evidence folders.

## M. Recommendation

**Historical integration recommendation; superseded for the RC1 commit decision by `RC1_AUDIT.md`. No merge or deployment approval is implied.**

- Balance B is active and verified at runtime in dev, in production and in the simulation.
- The UI v0.4.2 panels are preserved, and the Keep plate is clear of every control and panel.
- The full headless suite passes (537/537), with no integration-only browser failures.

Before approving a merge:
- (a) the human playtest scenarios in §K;
- (b) validate the approved Azure Tower removal (§G);
- (c) UI sign-off on the inspector placement (§C2);
- (d) explicit approval to commit this candidate on `integration/gameplay-v041-ui-v042`.
