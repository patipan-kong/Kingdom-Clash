# Desktop UX D3 — native desktop rendering by default

Status: implemented on `feature/desktop-d3-final`, awaiting the product owner's final test. Not deployed; no Playgama work.
It follows the experiment in [DESKTOP_UX_D3_1.md](DESKTOP_UX_D3_1.md), approved after hardware testing (60 FPS at 540p, 720p, 1080p and native; native preferred). The planned D3-2 coordinate refactor is dropped: pointer coordinates stay logical.

## What players get

| Device or address | Backing canvas |
|---|---|
| Desktop, no `res` | the canvas's on-screen size × devicePixelRatio, at least 960×540 and at most 1920×1080 |
| Phones and tablets | 960×540, unchanged |
| Canvas (non-WebGL) fallback | 960×540, unchanged |
| `?res=540` | 960×540, the original rendering |
| `?res=720` / `1080` / `1440` | 1280×720 / 1920×1080 / 2560×1440 |
| `?res=native` | the screen's pixels, up to 2880×1620 |

- The performance readout is hidden in normal play. `?res=…` or `?perf=1` shows it; F8 hides or shows it.
- Touch devices ignore `?res`.
- A device counts as a phone or tablet if its primary pointer is coarse, or its browser identifies as Android or iOS (including an iPad asking for the desktop site). The second rule covers stylus devices that report a fine pointer.
- No dynamic scaling, GPU detection or settings menu.

## Changes since D3-1

1. **Default on for desktop** with the 1080p cap (`src/ui/resolutionRequest.ts`, `src/ui/renderResolution.ts`).
2. **Text stays sharp after resizing.** Labels keep their own glyph canvas, so labels created in a small window stayed soft after enlarging it. 200 ms after the size settles, any on-screen label below the new resolution is redrawn. Shrinking redraws nothing.
3. **Menu title gradient.** Native rendering stretched the gold gradient, leaving the titles pale cream. The gradient is now sized as it was before (`src/ui/menuArt.ts`); mobile values are unchanged.
4. **A swallowed Enter in Shop, Build and Skills.** A mouse press dragged off a button left that button "held", so the next Enter on it did nothing. This dated from D2.1, not from rendering. A keyboard press now takes the button over. The duplicate keyboard-event fix is untouched.

The three failures seen once in a D3-1 native run were not dropped presses. A command applies on the next simulation tick; under slow software rendering (and Build's quarter speed) that came after the check had read the result. `verify-single-press.mjs` judges by ticks.

## Verification

All browser checks ran in headless Chrome with software WebGL.

| Check | What it covers |
|---|---|
| `verify-render-resolution.mjs` | 4 window sizes × 5 modes: backing size, unchanged cameras and pointer values, readout visibility, 2× screens, F8, phones, tablet, Android with a fine pointer |
| `verify-desktop-d3.mjs` | resizing in EN/TH/JA (all labels sharp, layout equal to a fresh load), fullscreen, mouse targeting and tower placement, skill click, Tavern hire and hero order, C6M5/C6M6, touch controls |
| `verify-single-press.mjs` | one Enter or one click buys or builds exactly once; drag-off cases |
| `verify-desktop-hud.mjs`, `verify-panel-keys.mjs` | D2 HUD and D2.1 keyboard navigation under the new default |

Results are in the hand-over message.

## Known limitations

- **At most 1920×1080.** Larger or higher-density screens upscale from 1080p. `?res=native` renders more.
- **Procedurally drawn textures** (generated ground, some icons) are still 1 texel per logical pixel, so they are no sharper than before.
- **Text shadows** are measured in canvas pixels by the browser, so at 2× they look half as deep as at 960×540.
- **Moving the window between screens** with different scaling is followed when the move changes the window's size, which is the usual case.
- **Headless fullscreen** cannot grow the page through the game's own button; the size change was checked with window fullscreen (the F11 route).
- **Software-rendering cost** is about double the original at 1080p. Real hardware held 60 FPS in D3-1 testing; low-end laptops are untested.

## Rollback

`?res=540` gives any player the original rendering. To turn the default off in code, make `requestedResolution` return only `parseResolution`'s result.
