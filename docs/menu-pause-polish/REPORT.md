# Main Menu & Pause Menu polish — PO visual review

Prepared 2026-11-04 in G:/work/ark/arkhero-audio, branch feature/audio-foundation, based on a8f5b12e8556b688010146500c05f84010a9ba29. Local changes only; no commit, push, merge or deployment.

## Visual result

Use [the before/after screenshot gallery](REVIEW.html). Screenshots are actual Chrome renders, not generated artwork. The PO mockup guides hierarchy, color and compact spacing; the original fantasy theme, fonts and background assets remain in use.

- Main Menu: gold Start/Continue/Up-to-date primary action; current Chapter/Mission is a separate subtitle. Campaign and Achievements are blue secondary actions side by side, with small vector marks. Existing navigation and progress-derived primary states are retained.
- Pause Menu: gold Resume Battle, compact blue secondary actions with decorative vector icons. Fullscreen text follows actual browser state. Campaign retains Missions/Chapter Select; Quick Play retains Restart Battle.
- At 780×360: Main panel is 416×236 CSS px (previously 360×253.3); Pause panel with five actions is 320×294 CSS px (previously 320×344). The Main panel is wider to fit the secondary row and shorter vertically.
- Below 300 CSS px canvas height, Pause secondary actions use two columns. All tested menu hit targets remain at least 48×48 CSS px; labels and hit areas do not overlap. The redundant Pause subtitle is hidden, and the existing discard notice remains visible on taller layouts.

## Files changed

- src/scenes/MainMenu.ts: compact layout, separate subtitle, primary/secondary treatment and button decoration.
- src/scenes/HUD.ts: Pause Menu icons and layout only; action callbacks, setPause, battle HUD and result panels unchanged.
- src/ui/menuIcon.ts: small noninteractive Phaser vector marks; no asset loading or dependencies.
- scripts/verify-menu-pause-polish.mjs: targeted layout and real mouse/touch navigation/pause/audio regression checks.
- docs/menu-pause-polish/: this report, screenshot gallery, before/after captures and browser evidence.

## Verification

| Check | Result |
| --- | --- |
| TypeScript, tsc --noEmit | PASS |
| Production build | PASS; existing large-bundle advisory only |
| Relevant automated tests | 56 PASS, 0 failures; audio, campaign UI, selection, progress and chapter view |
| Development targeted browser checks | 63 PASS, 0 page errors |
| Production targeted browser checks | 63 PASS, 0 page errors |
| Required viewport | 780×360, DPR 3 |
| Smaller landscape viewports | 740×360, 832×291, 740×270, 780×250, all DPR 3 |
| Desktop pointer interaction | 960×540, DPR 1 |
| git diff --check | PASS |
| Audio asset hashes | All nine unchanged |

Every Main Menu button and every Pause action was exercised using actual Playwright mouse and touchscreen input, including real browser fullscreen entry/exit. The suite verifies Start/Continue/Up-to-date destinations, Missions return, Quick Play restart, Main Menu cleanup, Audio sliders, Mute All, unmute, preference persistence, pause-state equality and blocked gameplay input while paused. Screenshots and bounds checks cover both menus at the required and shorter viewports. Campaign saves used in Continue/up-to-date tests are isolated browser-context fixtures.

Development evidence: [verification.json](after/verification.json). Production evidence: [verification.json](production/verification.json). These are browser emulation checks, not a new physical Galaxy S24 test. Full gameplay suite was not rerun for this presentation-only change.

### Older readability suite

The unmodified scripts/verify-menu-readability.mjs times out at its Chapter Select → first-war navigation step (line 40), before its assertions. The same timeout was reproduced against the unchanged approved main production build served read-only. This is an existing harness/navigation-fixture issue, not a claimed passing check. No neighboring menu code or old harness was changed to work around it. Raw logs/reports are under ignored test-results/menu-pause-polish/readability and readability-baseline. The new 63-check targeted suite verifies the affected menu layouts and all their actions directly on both builds.

## Scope and approval

No audio runtime, preferences, MP3s, Mission Briefing, Chapter Select, gameplay HUD layout, Simulation, Movement, balance, progression or dependency changes. Main and Chapter 5 worktrees and detached tooling checkout were not edited. Existing audio defaults (Music 30%, SFX 50%, Mute All OFF) and saved preferences remain unchanged.

Ready for PO visual review. Work remains uncommitted.
