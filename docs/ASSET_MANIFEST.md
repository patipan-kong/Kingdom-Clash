# Asset Manifest

All thirty-two runtime PNGs are stored in `public/assets/` and copied to `dist/assets/` by Vite. All raster artwork was created for this project using the **built-in image_gen tool**. Approved battlefield, unit/building and ability artwork is preserved. The HUD polish adds six resource/utility icons, and Shop Slice 1B adds seven painted item icons. No runtime CDN, external art URL, web font or online API is used.

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

## Shop item artwork — v0.4.2 Slice 1B

All seven are 256 × 256 RGBA PNGs with transparent backgrounds, loaded through HUD preload and explicit item-ID mappings in `src/ui/shopItems.ts`.

| File | Identity |
|---|---|
| `item-iron-sword.png` | Steel sword with antique gold hilt |
| `item-guardian-shield.png` | Royal blue and gold defensive shield |
| `item-ruby-gem.png` | Faceted crimson gemstone |
| `item-flame-blade.png` | Enchanted sword with painted flame |
| `item-builders-crown.png` | Royal construction crown |
| `item-siege-hammer.png` | Heavy blue-steel war hammer |
| `item-commander-banner.png` | Blue and gold military banner |

Generated on 2026-10-15 using the built-in image generation tool. Full prompts and original generated filenames are recorded in `art/item-art-generation.json`; originals are preserved in `art/source/items/`. `scripts/prepare_item_art.py` reproduces alpha-bound cropping, aspect-preserving Lanczos reduction to fit 224 × 224, and centering on transparent 256 × 256 canvases. It also generates the two review contact sheets. No procedural repainting is used. `public/assets/item-art-metadata.json` records dimensions, preparation and SHA-256 provenance. Runtime total: 403,667 bytes.

Under the [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/), as between the user and OpenAI, the user owns Output to the extent permitted by applicable law. Generated outputs may not be unique; this is not a guarantee of exclusive copyright or noninfringement. No third-party game icons or additional game-art licenses were imported. The missing-texture procedural fallback remains explicitly temporary in development builds; it is not final artwork.

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
