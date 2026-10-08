# Kingdom Clash — Visual Prototype

A real Phaser + TypeScript battlefield for reviewing the **Stylized Fantasy RTS** art direction. This is a visual prototype, with no match simulation. All artwork and runtime dependencies are bundled locally. Original design specifications are preserved in `docs/README.md` and files 01–10.

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

- Drag the joystick or use WASD / arrow keys to move the Guardian inside the staged battlefield.
- Tap a unit, wall, tower or base to inspect its name, illustrative HP and footprint.
- The camera smoothly follows the Guardian in a close three-quarter battlefield view. Tap the portrait to restore following after surveying the map.
- Four circular fantasy abilities surround the larger Attack button. Hold to see the pressed state; release inside to preview an effect, or drag outside to cancel. Icons dim and show a temporary cooldown. These are presentation states; no damage or resource use occurs.
- Build, Shop and Army open secondary illustrative panels. Footprints inside Build toggles the independent 48-world-unit grid; no construction or purchasing is implemented.
- The minimap shows the full layout and current camera rectangle. Tap to survey a location briefly; movement restores following. A minimap tap does not move the hero.
- Pause button or Space freezes presentation motion. Backgrounding / losing focus / entering portrait pauses; tap Resume after returning.

## Deliverables

- [Art Direction](docs/ART_DIRECTION.md)
- [Asset Manifest](docs/ASSET_MANIFEST.md), including source prompts in `art/prompts.json`
- [Temporary Assets and Limitations](docs/LIMITATIONS.md)
- [Verification](docs/VERIFICATION.md)
- Actual browser captures in `docs/screenshots/`
- Source in `src/`; static production build in `dist/`

## Verification and asset preparation

`npm run verify` uses an installed Google Chrome through Playwright to open the game, check errors and controls, and capture screenshots. Start the dev server first. To test production, start the preview server and set `PROTOTYPE_URL=http://127.0.0.1:4173/` (PowerShell: `$env:PROTOTYPE_URL='http://127.0.0.1:4173/'`). Reports are saved separately for dev and production.

`scripts/prepare_assets.py` extracts the approved unit/building sprites. `scripts/prepare_refinement.py` prepares modular terrain, props and ability icons; `scripts/prepare_hud.py` extracts the resource and utility icons, preserving alpha. These optional regeneration steps need Python and Pillow; neither is needed to run/build the game. Original sources remain under `art/source/` and are excluded from the production asset bundle. Full prompts are recorded in `art/prompts.json`.

Stop here for visual approval. Full gameplay, campaign progression and Android packaging are outside this deliverable.
