# Phase 2D-A2 — Combat skill identity and feedback

11 October 2026 · Implemented against `8c0848f` · Approved by manual visual review; finalized for commit and push.

This implements Slice 2 of the [approved design](PHASE_2D_A_DESIGN.md), with the final mobile-first direction superseding its combat shortcut badges and rank pips on every platform. Combat control centers, hit areas, original icons, touch ownership and the approved A1 allocation panel remain intact. No A3 layout, utility, resource, minimap, simulation or balance changes are included.

## Presentation

- Skills retain their original circular artwork with Bash / Taunt / Charge / Protect captions below the icons. Combat shortcut badges and rank pips are removed entirely. There are no platform-specific display modes. Keyboard input code is untouched; the approved A1 allocation panel is preserved.
- Ready skills retain full-color artwork; Learn and LV6 distinguish unlearned and gated skills. Each circle shows one centered status: remaining cooldown seconds take priority over temporary restrictions; STUN, CAST, DEAD or MENU appears only when there is no cooldown to show. Disabled tint still communicates temporary blocking. Attack retains its original icon/status presentation.
- A short teal/cream feedback line above the combat group reports cast acceptance, rejection and cancellation. Known rejection strings map to concise wording; unrelated construction/allocation feedback keeps its existing destination. The duplicate general rejection listener was removed so it cannot also show raw cast failures.
- The existing combined range/line-of-sight rejection becomes **No target in reach**. It cannot authoritatively distinguish **Move closer** from obstruction, so the UI does not invent that distinction. Actual Charge obstruction becomes **Path blocked**.
- After the first active skill is learned and allocation closes, **Tap to cast · Drag to aim** appears briefly. It is offered once per encounter and resets on Restart. Feedback expires using the existing HUD presentation clock; gameplay timing and pause behavior are unchanged.

## Verification

| Check | Result |
|---|---|
| `npm test` | 204/204 passed during finalization |
| `npm run verify:combat-hud` | 26/26 passed during finalization |
| A1 `verify-skill-allocation.mjs` with screenshot capture disabled | 38/38 passed during finalization |
| `npm run build` | Passed TypeScript and production build; existing bundle-size advisory remains |
| `git diff --check` / focused script syntax | Passed |

Focused browser checks exercise real allocation, accepted/rejected casts, persistent cooldown during stun/cast lock/menu, pause, death and actual respawn, simultaneous joystick/aim touch ownership, touch cancellation, the existing cancel ring, outside Attack release, actual keyboard movement and actual UI Restart with stable listeners. The revised checks confirm absence of shortcut/rank objects, names outside artwork and all hit areas, a single centered status and label separation at 844×390 and 960×540. The A1 regression also samples both Keep HP fills at both sizes; the Phase 2C visibility fix remains intact.

XP, isolated units, statuses, lock and screenshot cooldown values use explicitly supplemental fixtures. These checks do not claim ordinary extended-match progression or physical phone thumb comfort. No extensive match/screenshot suite was run.

## Review evidence and limits

[One representative 844×390 screenshot](phase2d-a2/combat-skills-844x390.png) shows ready E, cooldown Q, unlearned W and LV6-gated R together. The earlier badge/pip screenshot is backed up locally under `test-results/phase2d-a2/previous-direction/`. Raw JSON is local under ignored `test-results/phase2d-a2/`; the A1 approved screenshot is unchanged.

Names are about 12 CSS pixels at 844×390 and use the existing lower caption space. Charge is slightly offset to the right below its circle, with tighter letter spacing, to fit between the unchanged neighboring controls. All captions stay within the visible canvas and remain non-interactive. Button centers and hit areas keep their existing bottom clearance. Manual visual review is approved; headless geometry checks do not establish physical thumb comfort. No new gestures or interactive label regions were introduced.

Finalization retains this report and one approved screenshot. Browser reports, logs and the superseded screenshot stay locally in ignored `test-results/`; no generated evidence is staged. Verification reruns disable screenshot capture. No A3 work is included.
