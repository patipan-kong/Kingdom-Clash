# Kingdom Clash - Phase 1B

A Phaser + TypeScript battlefield with authoritative Guardian/minion combat, resources, Wooden Wall construction and Archer Tower combat. All artwork and runtime dependencies are bundled locally. Original design specifications are preserved in `docs/README.md` and files 01–10. See [Phase 1B report](docs/PHASE_1B.md) for implementation, validation and limitations.

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
- Tap a unit, wall, tower or base to inspect its name, HP (authoritative for Guardian/enemies and constructed buildings; illustrative for staged structures/allies) and footprint.
- The camera smoothly follows the Guardian in a close three-quarter battlefield view. Tap the portrait to restore following after surveying the map.
- Tap Attack to engage basic attacks against nearby enemy minions; tapping an enemy prefers that target. Four circular fantasy abilities surround the larger Attack button. Hold to see the pressed state; release inside to preview an effect, or drag outside to cancel. Icons dim and show a temporary cooldown. The four skills remain previews; Attack deals damage. All cooldowns use simulation time.
- Build opens Wall/Tower selection. Select a building, tap a cell and review its preview/reason, then Confirm or Cancel. Wall costs 25 Wood; Tower costs 80 Wood and 10 Iron. Drag empty world space or use the minimap to survey in Build mode. Shop and Army remain illustrative panels.
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

`npm run verify` uses installed Google Chrome through Playwright for control/combat regression checks. `npm run verify:building` demonstrates construction and economy. Start the dev server first. To test production, start the preview server and set `PROTOTYPE_URL` to its reported port (PowerShell: `$env:PROTOTYPE_URL='http://127.0.0.1:4173/'`). Reports use `docs/phase1b-regression*.json` and `docs/phase1b-verification*.json`; screenshots are in `docs/screenshots/phase1b/`. The original visual and Phase 1A captures are retained. Build and Shop slow simulation to 0.25 while open, without stacking.

`scripts/prepare_assets.py` extracts the approved unit/building sprites. `scripts/prepare_refinement.py` prepares modular terrain, props and ability icons; `scripts/prepare_hud.py` extracts the resource and utility icons, preserving alpha. These optional regeneration steps need Python and Pillow; neither is needed to run/build the game. Original sources remain under `art/source/` and are excluded from the production asset bundle. Full prompts are recorded in `art/prompts.json`.

Phase 1B stops here for review. Run `npm test` for headless simulation tests and `npm run verify:building` for the construction browser demonstration. Current captures and reports use `docs/screenshots/phase1b/` and `docs/phase1b-*.json`; the Phase 1A baseline captures remain archived. Full gameplay, dynamic rerouting, campaign progression and Android packaging remain outside this slice.
