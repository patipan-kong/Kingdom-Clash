# Phase 2D-B — Gameplay feedback and first-time guidance

11 October 2026 · Approved design proposal · Baseline `db544512e7516d27118145c3e0779cb566cb8611`. B1 implementation is documented in [its review report](PHASE_2D_B1.md); B2/B3 remain deferred. The investigation and mockup below record the approved proposal.

Recommend improving **damage attribution first**, then distinguishing Azure danger from actual damage, then adding a short contextual path into the existing game. Preserve the approved A3 HUD, A1 allocation sheet, A2 single-status skill circles, original fantasy materials and all gameplay rules. No implementation, commit or push accompanies this investigation.

[One annotated mobile mockup](phase2d-b/danger-feedback-proposal.png) ([editable vector](phase2d-b/danger-feedback-proposal.svg)). Its upper area represents 844×390; the numbered markers and notes below it are review annotations. Existing icons are reused; world positions and tower geometry are schematic, and values are illustrative. This is a proposed event presentation, not a captured runtime feature. PNG and SVG are two formats of the same single visual.

## Ranked UX audit

The implementation findings below are code-confirmed. Their impact on a first-time player is an inference, not a new novice usability test. “Defect” means misleading or ambiguous existing communication; “missing” identifies an absent presentation; “improvement” means existing feedback could be easier to notice.

| Impact | Existing feedback and evidence | Assessment | Recommendation |
|---|---|---|---|
| High: unexplained Guardian damage | Every `attack` draws a faction-colored, attacker-centered range ellipse for 200ms. Every `damage` displays a cream number for 450ms; Guardian HP updates. `attack.targetId` and `damage.sourceId` are available but not used to connect source and victim. | Attribution is **missing**; attacks and damage feedback already exist. Brief large ellipses and identical numbers make the cause **unclear**, especially among towers. | Brief source→victim trace for a hostile tower attacking the Guardian; a restrained Guardian hit accent and HP pulse for positive damage from any enemy. One contextual “Tower attacking you” notice per danger episode. |
| High: uncertain defense urgency | `KEEP THREATENED` replaces the wave line. The predicate means a living enemy minion within 420 world units **or** positive Azure damage within the last 150 ticks. Both Keep HP values, bars and minimap faction markers exist. | **Ambiguous existing communication**: it names neither faction nor whether damage occurred. Off-camera damage has no dedicated alert. | Keep proximity and actual attack wording distinct; briefly emphasize the existing Azure HP/minimap mark on confirmed damage, including off-camera. Do not change the threat predicate. |
| High: no next step at start | Persistent **Destroy Crimson Keep**, readable faction HP and **Upgrade skills · 1** are present. There is no match-start explanation of defending Azure or working with allies. First-use cast guidance appears after the first active skill is learned and the sheet closes. | Goal is partly taught; defense and a contextual next action are **missing**, not a missing controls screen. | One brief start line about both Keeps, then a conditional “Learn a skill” or allied-troop hint after the player acts. Avoid a tutorial overlay. |
| Medium: noisy and occasionally misleading notifications | Two existing text channels: general toast at logical `(300,235)`, 12px for 2.5s; combat notice from shared layout, at least 14 CSS px. Each call replaces its channel immediately. Basic Attack always says “Basic attack engaged - nearest enemy,” even without a legal target and despite selected-target support. Damage events with full shield absorption can display `-0`. | Attack wording and zero-damage hit numbers are **communication defects**; overwrite policy and general toast readability are **improvements** (12 logical px ≈ 8.7 CSS px at 844×390). | Truthful attack-intent wording, no health-loss cue for zero damage, readable short general notices, bounded priority/deduplication using the existing slots. |
| Medium: ally role and skill use are unfamiliar | Minions have separate blue/red art, ground rings, colored HP bars/faction glyphs and minimap dots. They fight and advance automatically. A1 shows names, effects, gates and Fortitude; A2 shows Learn/LV6/cooldown, rejection feedback, tap/drag guidance, zone and status effects. | Identity and skill allocation are **already implemented**. Small glyphs/crowd readability are a **potential improvement**, not a demonstrated wrong-faction defect. Support/XP and structure limitations are unexplained. | Contextual “Support your blue troops” hint near an actual allied engagement. Later, explain that active skills affect units, while basic attacks damage structures. No new minion label stack or guaranteed tower protection claim. |
| Low: end-of-match cause | Victory/Defeat, time, enemies defeated, both Keep HP and Restart are present. Simultaneous destruction follows existing defeat precedence. | Outcome feedback **exists**; a plain-language cause is an optional clarity improvement. | A short cause line within the existing results panel: “Crimson Keep destroyed” or “Azure Keep destroyed”; preserve simultaneous-result truth. No results redesign. |

### Important gameplay facts for truthful guidance

- Tower strikes have **zero windup** and damage resolves in the same simulation tick as `attack`. A trace depicts an attack that occurred, not an incoming projectile or a new chance to dodge. Do not delay damage to fit an animation.
- Towers choose the nearest legal enemy, re-evaluating targets. Allies can draw attacks, but “stay behind troops and you are safe” is false. Teach support and observation, not guaranteed aggro protection.
- Minions seek opposing units/structures and ultimately the opposing Keep; they do not wait for army orders. Shop/Army remain unavailable. Basic Attack enables ongoing attack intent; walking does not necessarily switch it off.
- XP can come from recent participation or nearby eligible kills with line of sight. Teach “Support your troops to gain XP,” not last-hit requirements, guaranteed XP merely standing anywhere nearby, or an invented economy reward.
- Guardian active skills affect eligible units; they do not damage towers or Keeps. Existing A1 descriptions and A2 rejection vocabulary stay intact; precise skill recommendations depend on what the player actually learned.

## Proposed slices and acceptance criteria

### B1 — Explain danger and Guardian damage

Consume existing `attack`, `damage`, `sourceId`, `targetId`, team, kind and HP data in presentation only. On an actual enemy tower attack targeting the Guardian, render a short 150–250ms source→victim trace and a small impact accent. Treat the trace as an attack connection, with no traveling arrow animation. Other enemy hits use the local accent/HP pulse, avoiding lines for every minion swing. Preserve existing faction art and symbols. If a source disappeared, use a generic hit cue rather than guessing its identity from proximity.

Use “Tower attacking you” in the **existing combat notice slot**, once at the start of a tower-danger episode; further tower attackers join that episode rather than generating a notice each. Suggested presentation reset: no tower attacks to the Guardian for 3s, with at least 5s between notices. These are UI throttles, not combat timing. A player's cast rejection/cancellation takes priority over optional danger text; the world/HP cue remains available. Cap simultaneous traces at two and coalesce Guardian hit accents within 150ms. Only positive `damage.amount` causes health-loss feedback; do not treat fully absorbed damage as HP loss. Keep shield/status feedback separate and suppress `-0` text.

Add a single range boundary only when the player inspects/selects a living tower, using authoritative `range` and the existing world projection. This addresses the original selected-tower range specification without displaying every tower's circle. It communicates **attack reach**, not guaranteed fire through blockers or a new targeting rule. Give it no new hit target. Retain existing attack effects unless a reviewed tower-specific trace replaces the redundant tower attack ellipse.

Acceptance:

- Real tower→Guardian, tower→allied minion, allied tower→enemy and minion→Guardian events produce the appropriate, distinct feedback. Never warn that a tower attacked the Guardian when it targeted an ally.
- Shield absorption with zero HP loss produces no damage pulse/`-0`; positive remaining damage still does. Multiple hits, source death, Guardian death/respawn, Pause, Restart and encounter switching leave no stale marks or notices.
- The selected range boundary follows its actual tower and camera, clears on selection change/destruction, and does not imply line-of-sight clearance. No damage, target selection, range or timing changes.
- At 844×390 and 960×540, effects remain world attached, non-interactive and below protected Keep HP/HUD; notices occupy the existing slot and cover no buttons, captions, aim-cancel or gesture reserve. No fullscreen damage wash, strobe or extra floating text stack.
- A novice can identify the source of a Guardian hit during a tower engagement; confirm this in short manual playtesting, alongside focused event/lifecycle checks.

### B2 — Make Azure defense status specific and notices reliable

Reuse the existing wave/time line and Azure HP/minimap marker. Display “Enemies near Azure Keep” when the existing threat predicate indicates nearby minions without recent confirmed damage, and “Azure Keep under attack” only following positive damage to `blue-base` (using the existing recent-hit information). Keep elapsed time, faction HP and the destruction objective visible. Return to wave/time when the predicate clears; do not alter its radius or recent-damage interval.

On the first positive hit in a defense episode, show a brief **general-slot** alert and a single accent on the existing Azure HP/marker, even when the Keep is off camera. Repeat only after the existing threat episode clears and at least 8s have passed; persistent status already communicates continuing danger. Minimap tapping retains its current survey behavior, with no camera jump or automatic movement.

Introduce small presentation-only channel priorities: defense danger above ordinary wave/build/inspection notices; within the combat slot, direct rejection/cancellation above routine cast confirmation and optional danger/teaching text. Show at most one notice per existing slot; do not replay a stale FIFO backlog. Drop interrupted teaching and retry it only if its condition remains true. Repeated identical notices must not extend visibility indefinitely. Use 12–14 CSS px for the general slot and keep short text within a measured clear area near its existing anchor; no new HUD row. UI expiry respects existing Pause behavior and cleanup on results/Restart.

Acceptance:

- Nearby enemy with no Keep damage, confirmed positive damage, fully absorbed/zero damage, clear danger, off-camera attack and ended match show truthful distinct states. A generic “KEEP THREATENED” is not relabeled as a confirmed hit.
- Wave, inspection, construction and cast events cannot immediately overwrite a defense alert or bury cast rejection. No repeated alert per hit and no queued advice appears after its situation ends.
- Both viewport sizes/safe areas preserve top-panel bounds, Keep HP clearance, objective/time readability, 48px targets and 24px bottom reserve. Notifications are non-interactive and do not cover combat controls or meaningful world hit feedback.
- Test the priority/deduplication policy with focused synthetic event sequences, then verify one actual off-camera Azure attack and existing minimap survey manually. No extensive match suite required.

### B3 — Offer the next useful action, without a tutorial mission

Reuse the readable general notification slot. A new match gets one short orientation: “Destroy Crimson Keep. Defend Azure Keep.” Once the player moves, if the LV1 point remains unused, offer “Learn a skill with Upgrade skills.” If they already allocated it, skip that hint. A1 still owns allocation and A2 still owns first-use tap/drag guidance; do not duplicate those lessons.

When a living ally is actually engaging a nearby enemy and the Guardian is alive, offer “Support your blue troops” once, after prior guidance expires and outside immediate danger. After the player has learned a skill and fought alongside allies, a quiet contextual structure encounter may teach “Use Attack on towers and Keeps.” Do not show this while a cast rejection is explaining something else. Teaching expires in about 4s and never requires dismissal, pauses combat, spends a point or locks input. Deliver at most three post-start hints per match, at least 8s apart, with danger always pre-empting. Reset on Restart; no persistent tutorial/settings system in this slice.

Replace the unsupported “nearest enemy” basic-attack promise with a short truthful “Attack enabled” once attack intent is authoritative. Repeated Attack taps need no repeated toast. Actual strikes are communicated by world feedback; do not announce a hit merely because the button was pressed. Add the result cause, if it fits the existing panel, with simultaneous defeat accurately naming Azure destruction. Existing results, totals, Restart and A1/A2 artwork/layout remain unchanged.

Acceptance:

- LV1 initial point, early allocation, immediate enemy contact, ally engagement, no allies, Guardian death, level gating, skills against structures, repeated Attack taps and fast victory/defeat all skip or trigger only relevant hints.
- “Follow/support troops” never appears without eligible allies; no claim of immunity, forced skill order, extra XP, army commands or tower-target manipulation. Show no message requiring an unavailable Shop/Army action.
- Previously delivered A2 gesture guidance remains single-use per match. Restart starts a fresh bounded guidance sequence; paused/ended matches have no pending instruction flashes. No persistence or simulation timing changes.
- Within a brief first-time playtest, players can state both Keep objectives, learn a skill, identify allies, engage with Attack and choose a next action. Validate text/priority triggers with focused checks; confirm 844×390 legibility without new panels or permanent rows.

## Deferred

- Separate tutorial mission, quest checklist, large panels, forced steps, recurring arrows, persistent coaching, localization/settings framework and cross-session onboarding progress.
- Tower projectile travel, pre-shot delays, new aggro mechanics, larger ranges, damage/armor changes, altered waves/AI, skills damaging structures, XP/economy tuning or different victory conditions.
- Full minion artwork/nameplate redesign, permanent danger zones, arrows for every attack, per-hit source labels, screen shake and fullscreen red flashes. Reassess crowd identity only if novice testing identifies an actual failure.
- Audio/haptic warnings: the original specification asks for a distinct base alert, but the current implementation has no sound pipeline; assets, gesture unlock, mute and Android behavior warrant a separate review.
- Expanded results/rewards screens, Army/Shop implementation, minimap redesign and additional permanent HUD elements.

## Sources and investigation limits

Reviewed [Battle rendering/event handling](../src/scenes/Battle.ts), [HUD notifications/guidance/results](../src/scenes/HUD.ts), [shared control layout](../src/ui/controlLayout.ts), [ability presentation](../src/ui/AbilityButton.ts), [combat event types](../src/simulation/GameState.ts), [attack/damage flow](../src/simulation/Simulation.ts), [attack legality](../src/simulation/Combat.ts), [minion movement/targeting](../src/simulation/Movement.ts), [XP eligibility](../src/simulation/XPRewards.ts), [skills](../src/simulation/GuardianSkills.ts), [threat/encounter data](../src/data/encounters.ts) and [tower data](../src/data/buildings.ts).

Specifications: [game rules/visual feedback](01_GAME_DESIGN.md), [combat/XP](02_HEROES_COMBAT.md), [mobile UI/accessibility](06_MOBILE_UI.md), [architecture](07_PHASER_ARCHITECTURE.md), [acceptance](09_ROADMAP_ACCEPTANCE.md), [fantasy art direction](ART_DIRECTION.md), [approved A3 report](PHASE_2D_A3.md) and [A2 feedback](PHASE_2D_A2.md). The approved final A3 screenshot is the visual baseline. Original specifications describe future systems too; this proposal uses only currently implemented gameplay.

Clean baseline verified. This investigation uses source/specification inspection and one code-native mockup; it does not claim a new live match, novice playtest or performance result. No browser gameplay suite, production build, asset collection, runtime/test implementation or simulation edit was needed. Proposed priorities, durations and effect caps are review choices to verify during implementation, not new combat rules. Stop here for design review.
