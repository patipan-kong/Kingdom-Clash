# Phase 1A verification

Verified on 8 October 2026 in desktop Chrome with Playwright, WebGL and software GPU rendering. Captures come from the actual game. Physical mobile devices and Android WebView were not tested.

| Check | Result |
|---|---|
| `npm test` | 22/22 headless tests passed |
| `npm run build` | Strict TypeScript and Vite build passed |
| Development browser, localhost:5175 | 52/52 checks passed |
| Production browser, localhost:4175 | 52/52 checks passed |
| Gameplay | Two three-minion waves defeated; six kills; Gold 250 -> 340 |
| Removal | Zero enemy units and zero enemy sprites after combat |
| Rendering | Real Guardian/enemy HP bars, logical positions and minimap marks |
| Lifecycle | Blur/portrait pause, cleared movement/attack intents, fresh input after resume |
| Scene restarts | Two restarts retain one command listener and reset HUD/simulation |
| Slow motion | Build -> Shop remains 0.25; closing restores 1 |
| Existing controls | Camera follow/bounds, minimap survey, footprints, skill previews and cancellation passed |
| Mobile emulation | 844x390, 667x320 and 568x320 layout/touch checks passed |
| Safe areas | Unequal simulated insets keep the canvas/HUD inside bounds |
| Runtime | No missing assets, console errors or external runtime requests |

The full browser suite passed 51 checks per origin; a targeted startup check additionally verified portrait boot, frozen ticks after rotation, and explicit Resume on both origins (52 total). The repeatable script includes that startup check.

The simulation tests cover render-rate determinism (including combat/death/respawn), delta clamp/catch-up cap, pause and zero/quarter time scale, normalized movement, swept collision, terrain/structure/scenery line of sight, invalid commands, windup/cooldown, target selection, attack cancellation, damage types/armor clamp, death/reward deduplication, enemy attacks, respawn, wave schedule, preview cooldowns, and headless operation without Phaser/browser imports or mutation of presentation definitions.

Reports: [development](phase1a-verification.json), [production](phase1a-verification-production.json). Repeat with `npm run verify` after starting the server; set `PROTOTYPE_URL` to the selected origin. Ports 5173/4173 were occupied, so this review used 5175/4175. Default run commands still use the original ports or the next available port.

Screenshots: `screenshots/phase1a/`. Original approved visual prototype captures and reports are retained separately.

![Core combat](screenshots/phase1a/combat-960x540.png)

![Both waves cleared](screenshots/phase1a/wave-cleared-960x540.png)

![Mobile landscape](screenshots/phase1a/mobile-844x390.png)

![Short landscape](screenshots/phase1a/mobile-568x320.png)

Manual gameplay procedure, changed files, balance assumptions and current limitations: [Phase 1A report](PHASE_1A.md).

The Vite large-chunk advisory remains (bundled Phaser approximately 1.5 MB before compression). No performance, physical device reach, actual gesture navigation or Canvas fallback claim is made. Unit separation, arbitrary obstacle routing and production animations are deferred.

Implementation lifecycle handling follows the official [Phaser 3.90 scene events reference](https://docs.phaser.io/api-documentation/3.90.0/namespace/scenes-events). Approved scale/input/camera behavior and dependency versions were preserved.
