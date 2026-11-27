# Desktop UX D3-1 — opt-in rendering-resolution experiment

Status: historical. Approved after hardware testing; the default and the follow-up fixes are in [DESKTOP_UX_D3.md](DESKTOP_UX_D3.md).

## What it does

The game still runs as a 960×540 logical game: the same game size, cameras, scrolling, HUD layout, pointer coordinates and gameplay. Only the canvas's backing store gets more pixels:

| URL | Backing canvas | Notes |
|---|---|---|
| *(no `res`)* | 960×540 | today's rendering, unchanged code path |
| `?res=540` | 960×540 | today's rendering, with the frame-time readout |
| `?res=720` | 1280×720 | k = 1.33 |
| `?res=1080` | 1920×1080 | k = 2 |
| `?res=1440` | 2560×1440 | k = 2.67 |
| `?res=native` | the canvas's on-screen size × devicePixelRatio | follows window resizes; capped at k = 3 |

- Any value from 540 to 2160 is accepted.
- **Touch devices ignore `?res`** and keep 960×540, so mobile rendering is unchanged.
- The Canvas (non-WebGL) fallback also ignores it.
- With any `res` value, or `?perf=1`, a small readout at the bottom centre shows:
  - the mode, backing size and on-screen size;
  - FPS, average, 95th-percentile and worst frame time over the last 2 seconds.

  It's a page element outside the game canvas, so it doesn't add to the frames it measures. **F8** hides or shows it.

## Coordinate conversion: the smallest reliable approach

The D3 study assumed every scene camera would be zoomed by k. That approach would have needed:
- about 120 `pointer.x/y` reads converted;
- about 10 scroll call sites rewritten;
- Battle's camera bounds changed.

Investigating Phaser 3.90 first showed none of that is needed:

- Phaser derives `pointer.x/y` from the **game size**, not the canvas's pixel count. Keeping the game size at 960×540 keeps every pointer coordinate, hit-test and camera conversion logical and unchanged.
- The only place that must know about the larger canvas is the WebGL context. A small shim (`src/ui/renderResolution.ts`) does three things:
  - backs the canvas at k× while Phaser still reads 960×540 from it;
  - while drawing to the canvas (not to an offscreen framebuffer), scales GL `viewport` and `scissor` rectangles by k, and reports the drawing buffer at logical size;
  - Phaser's 960×540 projection then fills the larger canvas.
- Phaser forces Text glyph canvases to resolution 1. The shim sets new Text styles to resolution k and keeps any higher explicit value (menu titles already use devicePixelRatio).

**Result:** no call-site changes, no camera or input changes, no new conversion helper. The experiment is two new UI modules, a pure helper module and a three-line hook in `main.ts`. Removing the switch restores the exact current path.

**Scope of the shim:**
- It covers every Phaser viewport and scissor call that draws to the canvas.
- Offscreen framebuffers (post-FX, render textures) keep their own sizes. The game uses none of them today; if one is added later it would render at logical resolution, which is still correct, just not sharper.

## Comparing on your PC

Use the production preview build (no live reloading). The URLs are in the hand-over message. For each window size you care about:

1. Open the game without `res`, then with `?res=540`, `?res=720`, `?res=1080` and `?res=native`. Start the same mission each time.
2. Compare text, HUD and sprites.
3. Read the frame times from the readout after about 10 seconds of play.

`?unlock=all` opens every mission. `?debug=1&level=N` jumps straight to mission N.

## Interactions in experiment mode

Because pointer coordinates are unchanged, every interaction uses exactly the same code as today. The checks below were run in the experiment modes. Nothing is known to be unreliable.

**Intermittent check timing.** One of two runs of the D2.1 popup checks in native mode failed three checks: a Shop purchase and a Build confirm landed after the check had already read the result. The rerun passed 53/53, and the same checks pass at `res=1080`, which draws more pixels. This points to slow software frames, not a logic difference. Worth watching during hardware testing: a Buy or Confirm that seems to need a second press.

The one visible limit: **in `native` mode, labels created before a window resize keep the sharpness of the old size** until they are recreated (for example by starting the next mission). The backing canvas itself follows the resize immediately.

## Verification

| Check | Result |
|---|---|
| `scripts/verify-render-resolution.mjs`<br>(4 window sizes × 5 modes, touch, matched stills in `docs/screenshots/desktop-d3-1/`) | 190/190 |
| D2 desktop HUD checks, `DESKTOP_QUERY=res=1080` / `res=native` | 254/254 in each mode (and 254/254 at today's rendering) |
| D2.1 popup keyboard checks, `DESKTOP_QUERY=res=1080` / `res=native` | 53/53 in each mode; one earlier native run had 3 timing failures that did not reproduce on rerun (see below) |
| `tests/render-resolution.cjs` | 4/4 |

`scripts/verify-render-resolution.mjs` confirms, in every mode:
- Phaser sees a 960×540 canvas, game and renderer;
- the backing store is 960k×540k;
- CSS size, camera size and zoom are identical to today;
- a real mouse at the same screen point produces identical `pointer.x/y`;
- HUD text uses resolution k;
- there are no page errors;
- touch with `?res=1080` stays at 960×540.

### On the integrated build (B1–B5 gameplay, D2/D2.1 and D3-1; `integration/b5-desktop`)

| Check | Result |
|---|---|
| `verify-render-resolution.mjs` on the production preview build | 190/190 |
| D2 HUD checks, dev server, today's rendering / `res=native` | 254/254 / 254/254 |
| D2.1 popup checks, dev server, today's rendering / `res=native` (twice) | 53/53 / 53/53, 53/53 |
| D2 HUD checks on the production preview build | 240/254 in both modes. The 14 misses are the Mission 44 hero fixture (`?allyTest=1`), which is deliberately dev-only, so the build ignores it. |
| D2.1 popup checks on the production preview build | stop after 15 checks in both modes: the check imports `/src/world/layout.ts`, which only a dev server serves |

### Full regression (unit suite), compared with V1.1 (`b67cbd3`)

| Build | Tests | Failed |
|---|---|---|
| V1.1 | 1,707 | 19 |
| Integration | 1,713 | 22 |

- 18 of the 19 V1.1 failures still fail. Each is a long-standing simulation, balance or golden-replay test.
- `campaign-13 active Guardian` now passes; it was fixed by the gameplay test corrections.
- **Three new failures**, all in `tests/wave-spawn-starvation.cjs`. They reproduce on the gameplay-only commit (`gameplay/b1-b5-final`) and pass on the Desktop-only branch, so the desktop work did not cause them.
  - The test drives Mission 2 (Fortify the Crossing) with a hard-coded Crimson spawn slot and timings.
  - The approved B-series changed that mission's battlefield and pacing.
  - This looks like a gameplay-side test fixture that was not updated. It is left for the gameplay owner, because gameplay is frozen.
- `campaign-level-24.cjs` failed at file level once in the full run, under heavy machine load. It passes on its own on both branches.

## Performance (headless software WebGL: a worst case, not a prediction)

Average frame time in ms (95th percentile in brackets), measured with no other load. Battle: Mission 3, a few seconds in.

| Window | Today (960×540) | `res=720` | `res=1080` | `res=native` |
|---|---|---|---|---|
| 1280×720 | 76 (100) | 112 (133) | 156 (167) | 91 (100), 1280×720 backing |
| 1366×768 | 76 (83) | 103 (133) | 163 (200) | 109 (133), 1366×768 |
| 1920×1080 | 73 (83) | 96 (117) | 176 (217) | 186 (267), 1920×1080 |
| 2560×1440 | 94 (100) | 111 (117) | 174 (183) | 263 (283), 2560×1440 |

The cost follows the backing pixel count, not the window: `res=1080` costs about the same in every window.

Real GPUs are much faster at filling pixels than this software renderer. The cost to watch on your PC is the jump from today's mode to `native` at your usual window size. A low-end laptop is the useful second data point.

## Next steps (not started)

- **D3-2:** only if hardware testing shows a need: sharper procedurally drawn canvas textures (generated ground and icons stay 1 texel per logical pixel today), and native-mode label refresh on resize.
- **D3-3:** default on for desktop with a measured cap and a fallback to 960×540 when frame time stays high.
