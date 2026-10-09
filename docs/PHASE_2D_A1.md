# Phase 2D-A1 — Discoverable skill allocation

9 October 2026 · Slice 1 complete · Manual UX and final visual review approved · Baseline `3f75b7b`.

The [approved design direction](PHASE_2D_A_DESIGN.md) is implemented for Slice 1 only. The invisible HP/XP hotspot is replaced by a visible **Upgrade skills · N** button, available at zero points for inspecting skills. The initial point is discoverable; SP shorthand is removed. XP retains its numeric progress.

Allocation cards reuse the existing Q/W/E/R icons with bold canonical names, concise effects and secondary rank/level information. Distinct gold Learn/Upgrade buttons are the only interactive parts of the cards. Locked, No points and Max rank actions are muted and disabled. The handler rechecks eligibility before sending a learn command; authoritative simulation validation is unchanged.

Fortitude remains visible from LV1 as a passive, with LV18 / LV20 requirements and the next LV20 gate after rank1. The panel explicitly says combat continues. Closing restores hero input without changing time scale or pause behavior. The approved fantasy teal/gold materials and two-column layout are retained.

The explicit entry ends at logical y144, where the existing Keep faction marker clearance starts. HP/XP bar positions are retained; numeric XP moves up two pixels to clear the entry. The polished allocation panel fits above the 24 CSS px bottom gesture reserve. At 844×390, names are ~14.4 CSS px, effects/actions ~12.3 px and supporting rank/cost text ~11.6 px. This compact hierarchy passed manual visual review.

Only `src/scenes/HUD.ts` changes runtime behavior. The browser helper and existing progression/skills/extended checks now locate actual allocation controls instead of the removed hotspot; their assertions follow the new disabled-action presentation. The focused allocation command is `npm run verify:skill-allocation`.

## Final verification

| Check | Result |
|---|---|
| `npm test` — simulation, progression, skills and encounter tests | 204/204 passed; no failures or skips |
| Focused allocation checks against production preview | 38/38 passed; no console, page or asset errors |
| `npm run build` — strict TypeScript and Vite | Passed; inherited bundle-size advisory only |
| `git diff --check` | Passed |

Coverage: LV1 initial point and real UI learning; removed invisible hotspot; effects/ranks/gates; disabled actions and descriptive-card taps submitting no requests; continuing clock with hero input blocked; Close restoring movement; LV2 points and LV3 upgrade; LV6 ultimate and LV11 gate; No points and Max rank; Fortitude LV18/20; authoritative rejection; original icons; separated text and ≥48 CSS px action targets; panel/card bounds at 844×390 and 960×540; actual rendered Azure/Crimson Keep HP pixels; result-screen Restart with fresh progression and stable listeners.

High-level checks use supplemental fixtures through the existing `Progression.award` kernel. The terminal fixture uses the existing damage path followed by real UI Restart. These checks do not claim a normal extended match was played through to LV20. Finalization reran the automated tests, production build and focused checks with `CAPTURE_SCREENSHOT=0`, preserving the manually approved screenshot rather than regenerating it. No extensive browser suites were repeated.

Raw logs and reports remain local under ignored `test-results/phase2d-a1-finalize/`, including `tests.log`, `build.log`, `allocation.log` and `browser/verification.json`. Earlier raw evidence also remains local. The superseded initial screenshot is ignored and backed up with its SHA-256 verified; no evidence was deleted.

## Retained review artifacts and scope

- [Approved design proposal](PHASE_2D_A_DESIGN.md), with its PNG mockup and editable SVG.
- [One final representative allocation screenshot at 844×390](phase2d-a1/skill-allocation-polished-844x390.png).

Combat HUD, joystick, Q/W/E/R combat-button positions and states, Build/Shop/Army, minimap, match information, simulation, balance, XP economy, skill points, cooldowns and level gates are unchanged apart from the authorized allocation entry and panel. The Phase 2C Keep HP rendering implementation is untouched and passes rendered visibility checks. Phase 2D-A2 and A3 are not implemented or started.
