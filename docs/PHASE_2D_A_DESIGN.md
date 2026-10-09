# Phase 2D-A — Combat HUD and skill allocation proposal

9 October 2026 · Design direction approved for incremental implementation · Baseline `3f75b7b`. [Slice 1 implementation review](PHASE_2D_A1.md).

[Annotated proposal](phase2d-a/hud-proposal.png) · [Editable vector](phase2d-a/hud-proposal.svg)

The proposal retains the fantasy icon artwork, dark teal panels, gold bevels, cream text, circular combat buttons, left joystick, right combat arc, minimap and faction symbols. The drawing is a layout study with illustrative values, not a gameplay screenshot or implemented UI.

## Findings from the current implementation

| Priority | Observed problem | First-time player consequence | Proposed change |
|---|---|---|---|
| 1 | `HUD.create()` opens allocation through an invisible rectangle over HP/XP; points appear as `SP 1`. LV1 already has one point. | A player can start fighting without learning any skills and never discover why the icons say LEARN. | Explicit **Upgrade skills · 1** action below hero status; one initial inline hint: “Spend your point to learn a skill.” |
| 1 | `AbilityButton` shows artwork and `R0`/`R1`, without skill names or key identifiers. Names also differ between HUD construction and progression data. | Icons do not explain what an unfamiliar skill does; rank notation competes with the R identifier. | Existing icon + small Q/W/E/R badge + short action name. Use rank pips, with numeric rank in the allocation sheet. Q Bash, W Taunt, E Charge, R Protect; full names come from progression data. |
| 1 | Allocation explains gates as `rank n at LV 2n-1`; rows provide no effect explanation. Disabled rows still send learn commands. | Players must decode a formula and can tap upgrades that will be rejected. | Show the next actual requirement and a one-line effect. Disable unavailable learn actions locally while keeping simulation validation authoritative. |
| 2 | 960×540 FIT becomes ~693×390 centered inside 844×390 (75 px side margins). HUD fonts of 10–14 logical px become ~7.2–10.1 CSS px. | HP, level, points and match objective require close inspection during combat. | Measure type and touch targets in actual CSS pixels; 14 px important labels, 12 px supporting information. Keep existing FIT/camera framing for this slice. |
| 2 | Resources receive 18 logical px bold numbers; HP is 11 and XP/SP 10. Two Keep health rows and wave/time occupy a separate large top panel. | Resource totals compete with immediate survival and what wins the match. | HP and level first; explicit upgrade availability second; compact match objective/Keep health and wave/time; resources secondary. |
| 2 | Shop and Army share active-looking controls with functional Build; only opening them reveals PREVIEW. | Players expect purchases or troop commands that do not exist. | Keep compact labeled placeholders in the approved utility column, visibly “Soon”; no active purchase/command affordance. Build remains a 48 px target. |
| 2 | Cooldown numbers disappear when a skill is disabled for another reason; CASTING, STUN, LEARN and MENU compete inside the same icon. | Temporary blocking can look like a lost or unlearned skill. | Separate persistent skill state (learned/rank/cooldown) from temporary hero blocking; preserve cooldown readout under a small status treatment. |

Sources inspected: `src/scenes/HUD.ts`, `src/ui/AbilityButton.ts`, `UtilityButton.ts`, `controlLayout.ts`, `src/style.css`, `src/main.ts`, `src/scenes/Battle.ts`, progression/Guardian data and skill validation. Original specifications: `01_GAME_DESIGN.md`, `02_HEROES_COMBAT.md`, `06_MOBILE_UI.md`, `09_ROADMAP_ACCEPTANCE.md`; approved visual reference: `ART_DIRECTION.md`; current behavior: Phase 2B and 2C reports and Guardian Option A approval.

The Phase 0 direction explicitly omitted Q/W/E/R labels and placed every utility in the right-thumb column. This proposal requests a narrow exception for small skill identifiers and action names, preserving the materials, silhouettes and column. Original specification 01 also calls for unavailable systems not to look usable. No general interface redesign is proposed.

## Proposed layout and interactions

Coordinates below are **CSS pixels within the 693×390 FIT canvas** at an 844×390 viewport, before device safe-area insets. The drawing includes the real side margins. At 960×540 keep edge anchors and readable CSS-sized controls; add space between groups rather than shrinking text. Recompute after safe-area or size changes. The 24 px bottom gesture strip remains reserved in addition to external device insets.

| Element | Proposed dimensions / position | Behavior |
|---|---|---|
| Hero status | x12 y12, 218×78 | Portrait recenters camera; HP number above readable green bar; LV beside name; thin XP bar with optional small numeric progress. No invisible allocation action over HP. |
| Upgrade action | x12 y98, 180×48 | “Upgrade skills · 1”; gold plus and count when points exist, calmer “Skills” at zero. The count remains visible even if all next ranks are gated; opening explains why. No repeating pulse during combat. |
| Match and resources | x245 y12, 264×100 | Smaller resource row; explicit “Destroy Crimson Keep”; Azure shield and Crimson diamond with HP; wave/time last. Threat replaces the secondary wave line while retaining elapsed time. Faction names and symbols supplement color. |
| Pause / minimap | Pause x529 y12, 48×48; map x581 y12, 100×64 | Preserve survey/recenter behavior. Map and Pause do not collide with match text. |
| Joystick | center75,323; target86 across | Existing left-thumb behavior and independent pointer ownership; bottom target ends at366, above the gesture strip. |
| Attack | center610,310; diameter72 | Existing attack intent: tap engages nearest legal enemy, selected target still applies. Label “Attack”; contextual “Attacking” feedback, without introducing hold-to-repeat behavior. |
| Q / W / E / R | centers (480,322), (480,260), (542,220), (610,220); diameter48 | Preserve tap/drag targeting and existing cancellation. Key badge + action label + learned rank pips. Label band is separate from the hit circle. Targets and pressed rims must remain disjoint. |
| Utilities | column center420; y198/260/322 | Army Soon / Build / Shop Soon; Build target48, utility art smaller than skill art. Future availability must not be inferred from resource balance. |

The drawing intentionally shows different states together at an illustrative LV3: Q rank1 on cooldown, W unlearned, E rank1 ready, R gated until LV6, one unspent point. These values are internally consistent with three total points earned at LV3. They are not a suggested forced skill build.

Allocate in a compact centered sheet, ~480×300 CSS px including its footer, above a shaded world. Title “Upgrade skills · 1 point”, four rows and a reachable Close action. Each row contains key/icon, full name, plain effect, rank, next level requirement and a 64×48 Learn/Upgrade action. A visible “Battle continues” line describes existing behavior: skill-menu clears hero movement/attack input and blocks casts, but **does not pause or slow simulation**. Do not change that timing policy here. While open, condense the top HUD to a 48 px match/Keep threat strip at y12; anchor the sheet at y66 so it ends at y366 above the gesture reserve. Close remains available under threat. No point is spent on opening, selecting, or inspecting a row.

Row examples: Q “Stun one nearby enemy”; W “Draw nearby enemies toward you”; E “Charge forward; stops at blockers”; R “Shield nearby allies; leaves a protective zone”. Add “Skills affect units, not Keeps or towers” below the list so attacking structures is not confused with casting. Fortitude remains a passive allocation entry, available at LV18/20, revealed through a labeled “Passive · LV18” detail entry with a 48 px target; at those levels make that same footer entry an upgrade action with its current rank and next gate. Explain “More health and armor”, not a fifth active skill.

## State vocabulary

| State | Combat button | Allocation action |
|---|---|---|
| Learned and ready | Original full-color icon, cream action label, rank pips | Upgrade if points and next gate allow |
| Unlearned, eligible | Muted icon + “Learn”; global upgrade count remains primary invitation | “Learn · 1 point” |
| Level gate | Lock symbol + “LV6”; no cooldown shown for unlearned R | “Unlocks LV6” / “Next rank LV3” etc. using `skillLevel()` |
| Cooldown | Existing swept sector/rim + large remaining seconds + retained pips | Upgrading follows existing eligibility; no cooldown reset promised |
| No points / max rank | Learned combat button remains usable | “No points” / “Max rank”, distinct from level gating |
| Stun / cast lock / dead / menu / paused | Muted treatment, concise reason; retain learned identity and existing cooldown when applicable | Existing life/menu rules respected; global respawn timer replaces HP text |

Rejected casts receive short contextual feedback near the combat group (“Move closer”, “No target”, “Path blocked”), mapped from existing rejection reasons without changing validation. Show tap-to-use / drag-to-aim guidance once when first learned; do not add a long-press gesture that conflicts with aiming. The aim Cancel position is currently hardcoded at logical (650,345) in `Battle.ts`; any layout slice must derive its rendered and hit-tested position from one shared presentation layout so cancellation remains reachable. No targeting or cast rules change.

## Small implementation slices, after review

1. **Discoverable allocation:** explicit point-count action, replace SP shorthand, unify names, explain battle timing and effects, next-gate text, disabled unavailable actions. Keep current button placement. Verify initial LV1 point, level-up, zero points, LV6 R, LV18/20 Fortitude, max rank, rejection and Restart.
2. **Combat identity and states:** key badges, short names, rank pips, persistent cooldown, local feedback and brief gesture guidance. Retain art and pointer ownership. Check one cooldown, stun/cast lock, no target, death/respawn, simultaneous joystick/aim, cancel and outside release.
3. **Compact mobile hierarchy:** CSS-sized type and edge anchors from this proposal; resource/match consolidation; same joystick/arc/utility column; shared aim Cancel coordinates. Keep Shop/Army visibly unavailable. Preserve Build placement, confirmation, cancellation and existing 0.25 time scale. Verify 844×390 and 960×540, unequal safe areas, resize, threat and camera movement. Recalculate Keep HP presentation avoidance from the actual top HUD bounds so the Phase 2C fix remains effective; no Keep positions/HP/depth policy changes in simulation.

Each slice should be independently reviewable. Run existing focused HUD/progression/skills checks and production build as appropriate; adapt assertions only for the approved new presentation. One representative visual per review is enough. Require manual thumb-reach review on a physical landscape phone: desktop geometry cannot establish comfort or finger occlusion. Maintain ≥48 CSS px interactive targets and the bottom gesture strip; check that enlarged text does not overlap hit areas or world-space Keep HP bars.

## This investigation's validation and limits

Baseline HEAD verified as `3f75b7b`; working tree was clean. Source/spec inspection and one static mockup render were performed. No gameplay browser suite, production build, balance tuning or UI implementation was needed or performed. Only this proposal and its vector/PNG review artifact were added. No commit or push. Physical thumb reach, font comfort and the final implementation remain review items.
