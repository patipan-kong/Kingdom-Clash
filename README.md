# Kingdom Clash - Phase 2B functional Guardian

Option A Guardian Balance v0.1 is approved for implementation/playtesting at `d0ef44c1c340f0ed53ced3b5c135b18f92cd9632` and pushed. Phase 2B adds real minion XP, level growth, Q/W/E/R combat, near-base armor and Fortitude. Tap the Guardian information panel to allocate Skill Points. See [implementation and gameplay evidence](docs/PHASE_2B.md). Phase 2B remains uncommitted for review.

A playable Phaser + TypeScript assault match with authoritative bases, Victory/Defeat/Restart, allied/enemy combat, dynamic navigation, wall breaching, resources and construction. All artwork and runtime dependencies are bundled locally. Original specifications are preserved in `docs/README.md` and files 01–10. See [Phase 1D report](docs/PHASE_1D.md) for normal-match evidence and limits, and [Phase 1C report](docs/PHASE_1C.md) for the committed baseline.

## Run and build

Requires Node.js 22.15+ and npm. From this folder:

```sh
npm ci
npm run dev
```

Open http://127.0.0.1:5173. The server is bound to localhost by default.

```sh
npm run build
npm run preview
```

Open http://127.0.0.1:4173 to review the production build. `npm run build` generates the ignored `dist/` folder, which can be served by any local HTTP server. The production build uses relative paths and requires no internet to run. Use an HTTP origin rather than double-clicking `index.html` with `file://`.

## Review controls

- Drag the joystick or use WASD / arrow keys to move the Guardian using the 30 Hz authoritative simulation.
- Tap a unit, wall, tower or base to inspect its name, HP and footprint. Guardian, minions, bases and constructed buildings are authoritative; preplaced small towers/walls remain illustrative obstacles.
- The camera smoothly follows the Guardian in a close three-quarter battlefield view. Tap the portrait to restore following after surveying the map.
- Tap Attack to engage basic attacks against eligible enemies and objectives; tapping an enemy prefers that target. Advance across the bridge to destroy Crimson Keep while defending Azure Keep. Both base HP values appear below the resources. Base destruction ends the match; simultaneous destruction means Defeat. Use Restart Match on the results card to play again. Learn Q/W/E/R in the Guardian panel: Q stuns one enemy, W taunts without preventing attacks, E charges until the first unit/obstacle, and R creates a stationary shield/armor zone. Tap or drag Q/E to aim; release in the red cancel ring or cancel the pointer to abort. Cooldowns and statuses use simulation time. R unlocks at LV6; the unchanged six-enemy match normally reaches at most LV4. Fortitude is allocated at LV18/LV20.
- Build opens Wall/Tower selection. Select a building, tap a cell and review its preview/reason, then Confirm or Cancel. Wall costs 25 Wood; Tower costs 80 Wood and 10 Iron. Drag empty world space or use the minimap to survey in Build mode. Allied minions fight automatically; Shop and Army commands remain preview panels.
- The minimap shows the full layout and current camera rectangle. Tap to survey a location briefly; movement restores following. A minimap tap does not move the hero.
- Pause button or Space freezes the simulation and clears active controls. Backgrounding / losing focus / entering portrait pauses; tap Resume after returning.

## Deliverables

- [Art Direction](docs/ART_DIRECTION.md)
- [Asset Manifest](docs/ASSET_MANIFEST.md), including source prompts in `art/prompts.json`
- [Temporary Assets and Limitations](docs/LIMITATIONS.md)
- [Verification](docs/VERIFICATION.md)
- Actual browser captures in `docs/screenshots/`
- Source in `src/`; static production build in `dist/`

## Verification and asset preparation

`npm run verify` uses installed Google Chrome through Playwright for control/combat regression checks. `npm run verify:building` demonstrates construction and economy. Start the dev server first. To test production, start the preview server and set `PROTOTYPE_URL` to its reported port (PowerShell: `$env:PROTOTYPE_URL='http://127.0.0.1:4173/'`). Run `npm run verify:navigation` for allied combat, rerouting and breaching. Set `VERIFICATION_VARIANT` to `development` or `production`. Reports use `docs/phase1c-verification-*.json` and `docs/phase1c/legacy/{development,production}/`; captures are in `docs/screenshots/phase1c/`. Run browser suites sequentially; this host needs an unrestricted Chrome process lifecycle for long runs. The original visual and Phase 1A captures are retained. Build and Shop slow simulation to 0.25 while open, without stacking.

`npm run verify:skills` plays an unchanged normal match for XP/Q/W/E and then explicitly labeled R/LV20/collision/input/lifecycle fixtures. Set `EVIDENCE_ROOT=docs/phase2b` for skills, `docs/phase2b/progression` for `verify:progression`, and `docs/phase2b/legacy` for existing suites to preserve historical evidence. See [Phase 2B](docs/PHASE_2B.md) for the complete results and captures.

`scripts/prepare_assets.py` extracts the approved unit/building sprites. `scripts/prepare_refinement.py` prepares modular terrain, props and ability icons; `scripts/prepare_hud.py` extracts the resource and utility icons, preserving alpha. These optional regeneration steps need Python and Pillow; neither is needed to run/build the game. Original sources remain under `art/source/` and are excluded from the production asset bundle. Full prompts are recorded in `art/prompts.json`.

Phase 1C is committed/pushed as `49f0c4b84915af2614b046eea97a1a6cecedba17`. Phase 1D was committed and pushed as `5e7af9732e2b80d7e547da5e036a3893d5504b28` on 9 October 2026. Run `npm test` and `npm run verify:match` for normal Victory → Restart → Defeat → Restart → Victory browser gameplay. The original waves/stats are unchanged; this suite can take several minutes. Set `EVIDENCE_ROOT=docs/phase1d` for preserved collision/navigation/construction/regression checks so historical evidence stays untouched. Hero Skills, Artifacts, Campaign, Free Play and Android remain outside this slice.
