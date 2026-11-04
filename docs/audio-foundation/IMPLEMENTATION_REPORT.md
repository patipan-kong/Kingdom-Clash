# Audio Foundation Phase B

Implementation is complete in `G:/work/ark/arkhero-audio`, branch `feature/audio-foundation`, based on `83d87dfdb32ddc31bd0efbc3d7509018430ce005`. This report records pre-commit verification; PO subsequently approved a local commit. No push, merge or deployment was performed. The Chapter 5 worktree was not modified.

## Files

New runtime files:
- `src/audio/AudioManager.ts`
- `src/audio/BattleAudio.ts`
- `src/audio/audioPreferences.ts`
- `src/audio/audioAssets.ts`
- `src/ui/AudioSettingsPanel.ts`

Integration and verification:
- `src/scenes/Battle.ts`: preload, controller creation, existing-event adapter, pause/background/update and shutdown hooks.
- `src/scenes/HUD.ts`: Pause > Audio, subpanel lifecycle, responsive pause layout.
- `scripts/test.mjs`: transpile the new audio directory for the existing test runner.
- `tests/audio.cjs`: 11 focused tests.
- `scripts/verify-audio.mjs`: touch/browser and Phaser Web Audio lifecycle verification.
- `package.json`: `verify:audio` script only; dependencies unchanged.
- `public/assets/audio/README.md`: exact MP3 requirements and provenance instructions.
- `docs/audio-foundation/*`: report, machine-readable results and screenshots.

No Simulation, Movement, Economy, GameState, combat rules or balance changes.

## Architecture

One AudioManager per Battle lifetime owns all its Phaser sound instances. A small BattleAudio adapter consumes the existing drained GameEvents directly; no additional bus or state framework. Preferences use guarded localStorage under `kingdom-clash.audio.v1`, with versioned/clamped data and in-memory fallback. Defaults: music 50%, SFX 70%, unmuted.

The MP3 registry discovers shipped files at build/dev-server startup. Missing files are not requested, and missing cache keys or playback creation failures produce silence. A failed audio load does not trigger the game's blocking missing-image overlay. New approved files require a rebuild/server restart.

Phaser handles browser interaction unlock. The controller waits for its existing `unlocked` event, retains the latest desired BGM and drops transient effects while locked. Terminal outcome is latched once. Pausing suspends gameplay music and stops transient SFX; result cues override the HUD's terminal pause event. Background hides stop effects and suspend music; foreground does not bypass the existing user pause. Shutdown disposes owned sound instances and unlock/visibility listeners. It does not stop unrelated global sounds.

## Music rules

Priority: Victory/Defeat > Critical > Battle > Exploration.

- Exploration: default.
- Battle: two positive damage events within 2 seconds involving Guardian, or source/target within 420 world units of Crimson Keep. Hold 8 seconds after qualifying combat.
- Critical: Azure Keep <=30% HP, or two positive Azure Keep damage events within 3 seconds. Damage-triggered Critical holds 10 seconds; low-HP mode clears only above 40%.
- Evaluate state at most every 250 ms. Require 6 seconds between nonterminal changes, except immediate escalation to Critical.
- Victory/Defeat: existing match-end event immediately stops BGM and plays one corresponding terminal SFX. Later events cannot change that result.
- Music switches use a 250 ms fade-out followed by a 250 ms fade-in. Never crossfade or run two gameplay tracks concurrently.
- Timers stop with gameplay pause. Event windows are bounded; no per-frame unit scans or intensity calculation.

## Effects

- Guardian impact: positive physical damage sourced by Guardian, excluding skill cast IDs; 150 ms cooldown.
- Keep warning: positive damage to a living Azure Keep in a nonterminal match; 8 s cooldown.
- Construction completed: allied construction-complete, excluding Banner structures; 300 ms cooldown.
- Banner captured: post/captured ownership transition, including recapture; 500 ms cooldown. Does not also play on Banner construction or unrelated site captures.
- Victory/Defeat: one terminal cue per match.
- At most 4 concurrent effects globally, and 2 instances of any one cue. Pause, background and scene disposal clear owned transient effects.
- Chapter 5 Hero recruitment/death mappings remain deferred.

## UI

Pause > Audio opens Mute All, Music volume, SFX volume and Back. The sliders use 10% steps and show percentages. Settings persist on change. At 780x360, Phaser's FIT canvas is 640x360, with at least 44 CSS-pixel hit heights and 14px label text. The shade and controls stop input propagation, while simulation stays paused. Back returns to the existing pause menu. Compact pause layout accommodates Fullscreen plus Audio; larger layouts retain subtitle/discard notice.

## Verification

- Full automated suite: **1,191 passed, zero failures/skips**, including 11 audio tests; approximately 529 seconds. Raw TAP is retained locally under ignored `test-results/audio/full-suite.tap`.
- TypeScript and production build: PASS (`npm run build`). Vite reports the existing large application bundle warning; no build failure.
- Browser: **24 checks pass** at 780x360 in touch-enabled Chrome, against both development and production builds.
- Verified preferences across reload; targets and readable labels; input isolation; missing-file silence with zero MP3 requests; touch unlock; nonoverlapping music; pause/resume; music/SFX gains and mute; background pause gating; terminal priority; eight repeated scene restarts with stable listeners; replay and navigation cleanup; zero page errors.
- Production background integration uses synthetic document visibilitychange events. GameEvents for Critical/terminal adapter checks are injected presentation fixtures, not newly implemented gameplay mechanics.
- Playback tests use small runtime-only silent AudioBuffers in Phaser's actual Web Audio manager. Unit playback tests use fake sound objects. No audio file or placeholder library was generated or downloaded.
- **Not verified:** decoding/listening quality of real MP3s, loop seams, perceptual mixing, or a physical Galaxy S24/browser session. All nine approved MP3 assets are absent.

Evidence:
- `browser-results.json`, `pause-780x360.png`, `audio-settings-780x360.png`: development.
- `production/browser-results.json` and matching screenshots: production.

Reproduce with `npm test`, `npm run build`, and `npm run verify:audio` while Vite serves port 5217. `PROTOTYPE_URL` and `AUDIO_EVIDENCE_ROOT` select another server/output directory. The browser verifier uses Chrome and private scene fields as test inspection fixtures.

## Missing assets

All files belong in `public/assets/audio/`:

| MP3 | Duration | Loop |
| --- | --- | --- |
| bgm-exploration.mp3 | 60-90 s | Yes |
| bgm-battle.mp3 | 45-75 s | Yes |
| bgm-critical.mp3 | 30-60 s | Yes |
| sfx-guardian-impact.mp3 | 0.15-0.4 s | No |
| sfx-keep-warning.mp3 | 0.5-1 s | No |
| sfx-build-complete.mp3 | 0.5-1.2 s | No |
| sfx-banner-captured.mp3 | 1-2 s | No |
| sfx-victory.mp3 | 4-7 s | No |
| sfx-defeat.mp3 | 3-6 s | No |

Use original or clearly licensed assets with author/source/license/attribution recorded. The game intentionally remains silent until approved assets are supplied.

## Merge and recommendation

**GO for PO code review and subsequent integration approval.** Audible-release sign-off remains pending asset delivery and device listening verification. PO approved a local commit; pushing, merging and deployment remain unauthorized.

Battle.ts and HUD.ts are the main Chapter 5 conflict risks; most implementation is in isolated new files. Preserve Chapter 5 changes and add only the small lifecycle/event/pause hooks. Merge audio into Chapter 5 at an agreed checkpoint, then rerun tests and browser checks. Add recruitment/death mappings afterward using the merged Hero event contracts. Do not change simulation to match this adapter.

Tooling note: the app's worktree tool first created an empty detached checkout at `C:/Users/patip/.codex/worktrees/audio-foundation/arkhero`. Moving it across drives was denied, so the requested worktree was created through Git with authorization. The app refused to archive its detached checkout because it considers it the chat's primary checkout. It remains unmodified; all implementation and evidence are exclusively in the requested G: worktree. Existing node_modules are reused through an ignored junction; no packages were installed.
