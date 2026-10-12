# Phase 2D-B2 — Azure Keep defense alerts

12 October 2026 · B1 baseline `c326a659174123b836d06988c8cefba1ddb2a45c` · Technical verification and screenshot-based visual review passed; approved for finalization. Approved scope: [Phase 2D-B design](PHASE_2D_B_DESIGN.md).

## B1 finalization

Committed and pushed `feat: clarify guardian damage attribution` as `c326a659174123b836d06988c8cefba1ddb2a45c`. Eight focused policy tests, 27 browser checks, production build and staged whitespace check passed before commit. `main` matched `origin/main` (0 ahead/0 behind) and the working tree was clean before B2 began. Twelve files included only B1 source/tests, approved design documentation and its single mockup in PNG/SVG formats, and one representative B1 screenshot. Raw browser evidence remains ignored locally.

## B2 changes

- The existing wave/time area now says **Enemies near Azure Keep** for proximity without recent confirmed damage, or **Azure Keep under attack** when the simulation's positive-damage timestamp remains within its existing recent-hit interval. When threat clears, normal wave/time returns. The authoritative predicate remains exactly **420 world units / 150 ticks**; no simulation or encounter data changed.
- The first positive `damage` event for living `blue-base` in a defense episode accents the existing Azure HP line and blue minimap marker for **650ms**, fading once. The Azure-only text overlay occupies the same existing line; Crimson HP, panel bounds and faction colors remain intact. This works off-camera and never moves the camera.
- **Azure Keep under attack** uses the existing general notification slot for **2.5s**. Repeated damage cannot refresh the alert or accent. A new alert requires both the unchanged threat predicate to have cleared and at least **8s** since the preceding alert. Rate-limited episodes are consumed rather than queued. Persistent wave/time status communicates ongoing danger.
- General-slot defense alerts preempt ordinary wave/construction/inspection notices. The combat slot preserves direct rejection/cancellation above confirmation and optional guidance/tower notices. Each channel holds one message, with no backlog; duplicate calls do not extend expiry and identical repeat traffic gets a short quiet interval after expiry. General notifications now render at least **12 CSS px**, in their existing area.
- Pause clears both transient notice channels and Azure accents while retaining defense-episode throttles. Fresh player feedback works after resume. Results, Restart and encounter switching discard stale presentation; a fresh match allows its first positive hit to alert again. Existing minimap survey interaction is unchanged.
- Zero or fully absorbed damage creates no Azure damage alert/accent. Proximity alone never claims confirmed damage. A notification is hidden if its confirmed-damage state ceases to be current; no old notice is replayed.

## Verification

- `npm test -- damage-feedback.cjs defense-feedback.cjs notice-slot.cjs`: **21/21** focused tests, including B1's eight unchanged attribution checks, actual simulation damage/shield behavior, exact predicate thresholds, episode throttles, lifecycle resets, priority and deduplication.
- `npm run verify:defense-feedback`: **29/29** production-browser checks. Covers nearby enemies, actual shield absorption/zero damage, a real minion AI strike/windup/hit against off-camera Azure, repeated hits, notification priority, accent/notice expiry, threat clearing, Pause/resume, actual defeat, UI Restart, encounter reload and unchanged minimap survey. Checks **844×390 / 960×540**, each with normal and explicit safe-area insets, readable text, top bounds, controls/captions, aim-cancel and 24px bottom reserve.
- B1 `verify:damage-feedback` with `CAPTURE_SCREENSHOT=0`: **27/27** on B2. Its 200ms connections, positive-damage Guardian feedback, selected range and cleanup remain intact; no B1 effect durations or graphics were changed.
- Production TypeScript/Vite build passes; existing large-bundle warning remains. `git diff --check` passes. No full match simulation or screenshot collection was run.

Finalization initially exposed a nondeterministic verification assertion: prototype's tick-1 wave can display a fresh `Enemy wave 1` notice before the fixture freezes advancement. A three-reload probe confirmed that Azure damage timestamp and accents were cleared; the assertion incorrectly required all notifications to be absent. The focused check now rejects stale defense feedback explicitly and allows the legitimate new wave notice. Runtime behavior and approved visuals were not changed. B3 was not started because the requested finalization stop condition was triggered.

The browser checks isolate existing units and hold simulation advancement between actions. One check executes real minion AI, attack timing and damage; other cases use actual `hit`/shield logic and presentation-only clock fixtures. Pause/Restart, minimap and result flow use existing UI. This is focused automated evidence, not a new first-time-player gameplay study. Raw JSON stays in ignored `test-results/phase2d-b2/`.

## One review screenshot

[844×390 defense alert](phase2d-b2/azure-defense-844x390.png) shows positive Azure damage while the camera remains near Crimson: updated Azure HP, a brief minimap accent, confirmed wave/time status and the general alert. The completed rendering frame is held solely for capture; gameplay is not paused by the implementation. No 960×540 screenshot was generated.

Technical verification and screenshot-based visual review approved this implementation for finalization. Further gameplay review can assess the single fading accent in crowded play. General and combat notices coexist in their existing separate slots. No B3 guidance, new sound/haptics, HUD rows, gameplay/balance changes, artwork changes or input changes are included.
