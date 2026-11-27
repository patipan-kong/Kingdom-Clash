# Desktop UX — D2.1 reload investigation and D3 rendering-sharpness study

Status: findings for product-owner review.
- **Reload:** no code fix is needed (cause below).
- **D3:** a recommendation, not implemented. Rendering resolution is unchanged.

## 1. D2.1 — the intermittent page reload

### Finding

**The reloads are the Vite development server, not the game.** Vite fully reloads every open tab whenever a source file in its folder is saved. Phaser scenes can't be hot-swapped, so every save means a full reload.

During the playtest window, two sessions were saving files in the same working tree, `G:\work\ark\arkhero`:
- the desktop UX session: `HUD.ts`, `SkillsPanel.ts`, `PanelFocus.ts`;
- a gameplay session (Sol's B1/B1.1 edits): `campaignLevels.ts`, `Mission.ts`, `mission.ts`, `MissionBriefing.ts` and the campaign i18n files.

Three dev servers serve that same tree (ports 5461, 5601 and 5711). A playtest tab on any of them reloaded on every save from either session, which is why it seemed random and tied to no particular key.

### Evidence

| Check | Result |
|---|---|
| Vite log | a `page reload <file>` line for every save; about 30 between 11:37 and 12:04 |
| Observed directly | a verification page reloaded at 11:43:33, the moment `src/data/campaignLevels.ts` was saved by the gameplay session |
| Code | no `location.reload`, navigation, `history` or form submission anywhere |
| Page | no `<form>`, `<input>`, `<button>`, link or tabindex: the game is one canvas, so Enter cannot submit anything, Tab has no HTML to move to, and Esc only leaves fullscreen |
| Keyboard stress, production build (`vite preview`) | every popup flow (K/B/T, arrows, WASD, Tab, Shift+Tab, Enter, NumpadEnter, Esc); 1.5 s holds of Enter, Esc, Space, Tab and Backspace; 1,500 random keys with mouse clicks: **0 reloads, 0 navigations, 0 page errors** |
| Same stress on a dev server with no saves during the run | 800 random keys: **0 reloads**; the Vite log shows no reload in that window |

### Fixes

- **No keyboard change is needed.** Nothing was suppressed globally.
- **One real input defect, already fixed in D2.1:** Phaser's keyboard queue sometimes delivered one press to the HUD more than once. Shift+Tab stepped two or three times, and a single Enter press could act twice. Shortcuts now read the browser's own `keydown`, once per press.
- **Process:**
  1. Playtest on a production build served by `vite preview` (no file watching), or on a Vercel Preview, never on a dev server.
  2. Give each agent session its own git worktree, branch and dev server. The gameplay edits currently sit uncommitted in the same tree as the desktop work, on branch `feature/desktop-ux-d2`.

## 2. D3 — desktop rendering sharpness

### What the game does today

| Item | Value |
|---|---|
| Renderer | Phaser 3.90, WebGL1 (no WebGL2), `antialias: true`, `pixelArt: false`, no mipmaps |
| Backing canvas | always **960×540**, at every window size and every device pixel ratio (checked at DPR 1, 1.25 and 2); the browser stretches it with CSS |
| Stretch factor | 1280×720 → 1.33×, 1366×768 → 1.42×, 1920×1080 → 2×, 2560×1440 → 2.67× (times DPR on HiDPI screens) |
| Text | Phaser Text draws at resolution 1: a 12 px label at 1080p has 6 real pixels, then is stretched |

**Art resolution is not the problem.** Sprites are high-resolution sources drawn small:

| Texture | Source | Logical size on screen | Shrink |
|---|---|---|---|
| Trees | 512×484 | ~200 px | 2.4× |
| Rocks and bushes | 256 px | ~50 px | 5× |
| Bridge | 512 px | ~83 px | 6× |
| Wall | 256 px | ~73 px | 3.5× |

The battlefield ground is generated at one texel per logical pixel (1920×829).

So there are two effects:
1. **Pixelated:** large sources shrunk 2–6× without mipmaps alias. WebGL1 cannot mipmap the non-power-of-two art, so mipmaps are not a cheap alternative.
2. **Blurry:** the browser then stretches the whole 960×540 image 1.3–2.7×.

### What was tried

The same battle frame was rendered at the display's own resolution, at runtime on the production build, with no source change:
- backing canvas = display size;
- every camera zoomed by k = display height / 540, keeping the same framing;
- every Text at resolution k.

`docs/screenshots/desktop-d3/` holds full frames and matched close-ups (`*-before-*`, `*-after-*`) at 1280×720, 1366×768, 1920×1080 and 2560×1440.

Results:
- **Text and HUD:** a large improvement. Labels, plates, numbers and key badges go from smeared to crisp; at 2560×1440 the current skill labels are unreadable and become sharp.
- **Sprites:** trees, rocks, the Guardian, towers and icons gain real detail from their large sources, and the shrink aliasing drops because each sprite now has 2–2.7× more pixels.
- **Ground:** a little sharper at most, because it is authored at 1 texel per logical pixel. Making it crisper would need new ground art at 2×, which is not recommended without further evidence.
- **Framing, logical coordinates and HUD layout:** unchanged in the captures.

**Cost:** about k² more pixels per frame (1.8× at 720p, 4× at 1080p, about 7× at 1440p); draw calls and game logic are unchanged. Measured in headless software WebGL, the worst case (real GPUs are much faster at this):

| Window | Frame time, current | Frame time, display resolution |
|---|---|---|
| 1280×720 | 83 ms | 100 ms |
| 1920×1080 | 83 ms | 150 ms |
| 2560×1440 | 83 ms | 133 ms |

Real-hardware numbers are needed before shipping (see the plan).

### What it takes in code

The game's 960×540 logical coordinates stay. Only the backing resolution and the camera zoom change, using Phaser's own camera zoom:

1. **Boot:** the game size becomes `960k × 540k`, with k from the display.
   - Desktop: k = canvas CSS height × DPR / 540, capped (2 to start).
   - Touch: **k stays 1**, so mobile rendering cost and layout are unchanged.
   - When the window resizes, k is recomputed.
2. **Cameras:** every scene's main camera gets `setZoom(k)` with the default centred origin, which camera follow and bounds already assume.
   - The roughly 10 explicit scroll reads and writes (`Battle`, `getCameraWorld`, build pan, dead-state pan) go through one helper that converts "world at screen top-left" to Phaser's scroll.
   - Battle's camera bounds currently follow the game size and must use logical size.
3. **Text:** one shared place sets the Text resolution to k (the HUD's `text()` helper, the panels' `text()` helpers and menu text), instead of editing each label.
4. **Input:** about 120 places read raw `pointer.x/y`, which would then be in backing pixels:
   - Battle: 67
   - HUD: 17
   - HeroBar: 10
   - remaining scenes and UI files: about 26

   Each changes to the camera-space `pointer.worldX/worldY` (or one helper). Phaser's hit-testing of buttons already uses the camera, so it needs no change.
5. **Menus and briefing screens** get the same camera zoom; their layouts already use logical coordinates.

This is a medium change touching every scene. It is still not an architecture redesign: logical coordinates, layouts and assets all stay.

### Recommendation

**Proceed with a desktop-only "native resolution" mode, in stages:**

| Stage | Scope |
|---|---|
| D3-1 | Boot and camera zoom, Text resolution, the scroll helper. Behind `?res=native` (default off). Visual check plus real-hardware FPS on your PC and a low-end laptop. |
| D3-2 | Input conversion (the ~120 pointer reads) with the existing browser checks re-run at k=1 and k=2; touch keeps k=1. |
| D3-3 | Default on for desktop, with a cap (k ≤ 2, or the measured safe value) and a fallback to 1 if frame time stays high. |

**Not recommended:** regenerating or upscaling art, pixel-art filtering, or a different renderer. The evidence shows the source art is already detailed enough.

### Also noticed

At 2560×1440 the D2 controls (at most 150%) look small relative to the screen. A fourth size tier for very tall windows (for example 175% from 1300 px) could be considered after D3.
