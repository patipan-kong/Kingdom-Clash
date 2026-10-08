# Asset Manifest

All twenty-five runtime PNGs are stored in `public/assets/` and copied to `dist/assets/` by Vite. All raster artwork was created for this project using the **built-in image_gen tool**. Approved battlefield, unit/building and ability artwork is preserved. The HUD polish adds six resource/utility icons. No runtime CDN, external art URL, web font or online API is used.

| File | Runtime size | Role | Source / preparation |
|---|---|---|---|
| `guardian.png` | 384 × 339, alpha | Blue shield-bearing Guardian; also HUD portrait | Extracted from units atlas; alpha preserved; downsized |
| `minion-blue.png` | 192 × 187, alpha | Three friendly minions | Extracted from units atlas; alpha preserved; downsized |
| `minion-red.png` | 186 × 192, alpha | Three enemy minions | Extracted from units atlas; alpha preserved; downsized |
| `base-blue.png` | 447 × 512, alpha | Azure Keep | Extracted from structures atlas; alpha preserved; downsized |
| `base-red.png` | 443 × 512, alpha | Crimson Keep | Extracted from structures atlas; alpha preserved; downsized |
| `tower.png` | 188 × 384, alpha | Archer Tower with elevated archer | Extracted from structures atlas; alpha preserved; downsized |
| `wall.png` | 176 × 192, alpha | Two adjacent Wooden Wall sections | Extracted from structures atlas; alpha preserved; downsized |

`public/assets/sprite-metadata.json`, `refinement-metadata.json` and `hud-metadata.json` record sprite dimensions and extraction provenance. `art/prompts.json` contains all ten complete prompts, generation mode, date and generated filenames. Source atlases and original texture images are preserved in `art/source/` and excluded from the production build. The former painted background is archived as `art/source/battlefield-original.png` (1672 × 941); it is no longer loaded or used as the minimap.

`scripts/prepare_assets.py` reproduces the mechanical extraction pipeline: per-subject crop region, meaningful-alpha bounds, preserved transparent edges and Lanczos thumbnailing. It does not repaint or recolor the generated artwork.

## Camera/HUD refinement assets

| File | Runtime size | Role | Source |
|---|---|---|---|
| `grass.png` | 512 × 512 | Repeated painted ground texture | `grass-source.png` |
| `path.png` | 512 × 512 | Lane material clipped to shared geometry | `path-source.png` |
| `water.png` | 512 × 512 | River material clipped to shared geometry | `water-source.png` |
| `bridge.png` | 512 × 196, alpha | Independent stone bridge prop | `bridge-source.png` |
| `trees.png` | 512 × 484, alpha | Independently placed pine cluster | `environment-source.png` |
| `rocks.png` | 256 × 149, alpha | Independent mossy rocks | `environment-source.png` |
| `bush.png` | 256 × 146, alpha | Independent flower bush | `environment-source.png` |
| `ability-bash.png` | 256 × 253, alpha | Shield impact | `abilities-source.png` |
| `ability-taunt.png` | 256 × 253, alpha | Golden lion challenge | `abilities-source.png` |
| `ability-charge.png` | 256 × 253, alpha | Charging knight | `abilities-source.png` |
| `ability-zone.png` | 256 × 255, alpha | Emerald guardian sanctuary | `abilities-source.png` |
| `ability-attack.png` | 255 × 256, alpha | Dominant sword attack | `abilities-source.png` |
| `hud-gold.png` | 256 × 244, alpha | Embossed gold coin | `hud-icons-source.png` |
| `hud-wood.png` | 256 × 209, alpha | Rope-bound wooden logs | `hud-icons-source.png` |
| `hud-iron.png` | 256 × 199, alpha | Silver-blue iron ingot | `hud-icons-source.png` |
| `hud-build.png` | 256 × 250, alpha | Construction hammer / timber | `hud-icons-source.png` |
| `hud-shop.png` | 256 × 251, alpha | Merchant coin bag | `hud-icons-source.png` |
| `hud-army.png` | 239 × 256, alpha | Blue banner / helmets | `hud-icons-source.png` |

`scripts/prepare_refinement.py` extracts terrain/ability cells; `scripts/prepare_hud.py` extracts the six HUD cells, preserving alpha and mechanically thumbnailing them. Ability and utility images are clipped to circles with Phaser geometry masks; borders, pressed highlights, disabled tint, cooldown sectors and numerals are code-drawn. The approved ability icon served only as a style reference for the original HUD atlas. Textures remain a small repeatable prototype library, not a production autotile set.

## Procedural and temporary graphics

| Graphic | Source | Status |
|---|---|---|
| HUD panels, bars and button frames | `src/scenes/HUD.ts` | Original code-drawn interface |
| Compact Pause bars and frame | `src/ui/UtilityButton.ts` | Original procedural gold bevels; no external artwork |
| Utility frames and interaction states | `src/ui/UtilityButton.ts` | Match approved ability materials around new generated icons |
| Circular ability frames and states | `src/ui/AbilityButton.ts` | Original procedural HUD styling around generated icons |
| Ground shadows and team rings | `src/scenes/Battle.ts` | Original procedural graphics |
| Grid and collision footprint overlay | `src/scenes/Battle.ts`, `src/world/layout.ts` | Debug art-review view, independent of sprite dimensions |
| Minimap | Shared `terrain`, `scenery`, `entities` and inverse camera projection | Original full-map presentation UI; no retired background image |
| Skill preview effects | `src/scenes/Battle.ts` | Temporary expanding/fading rings |
| Favicon | Inline original shield geometry in `index.html` | Locally embedded vector |
| Text | Installed Arial / generic sans-serif | System font; no font downloads |

## Bundled software

Phaser 3.90.0 is included in the JavaScript bundle; Phaser is MIT-licensed. TypeScript 5.9.3, Vite 6.4.4 and Playwright 1.56.1 are pinned authoring/verification dependencies in `package-lock.json`. Third-party software license notices are collected in `THIRD_PARTY_NOTICES.txt`; npm package license files remain in installed dependencies. Generated game artwork and code-drawn graphics have no third-party game-art source.
