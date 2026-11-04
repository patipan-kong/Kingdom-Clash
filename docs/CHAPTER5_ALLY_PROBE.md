# Chapter 5 Phase 0: Allied Hero Scratch Probe

Status: scratch probe only. Uncommitted, not pushed, not deployed. Worktree `G:/work/ark/arkhero-c5-probe`, branch `scratch/c5-allied-hero`, based on `main` `83d87df`. Nothing here is Tavern, recruitment, roster, economy or permanent UI.

## Verdict

**GO for Tavern + M1, with four conditions** (see the last section). All three Simple Commands work on every Chapter 4 map without navigation deadlocks. Attack and Defend run independently of the Guardian (kills at 585 to 979 px from him). An Allied Hero can capture but cannot repair. Faction rules are unchanged, every run replays exactly, and the stress load stays within 3.3 % of the simulation tick budget. The real Galaxy S24 FPS figure is still open: the test scene for it is ready (see "S24 playtest").

## 1. Existing architecture (what the probe found)

| System | How it works today | Reuse for an Allied Hero |
|---|---|---|
| Guardian | Player-driven: joystick `move` commands, auto-attack loop in `Simulation.step`. Special-cased as `this.hero` everywhere (skills, XP, respawn, shop, capture, repair). | Not reusable as an AI. Only his respawn timer pattern. |
| Crimson Hero (Warden/Raider/Commander) | A red minion with archetype `crimson-hero`. Its AI is one `if/else` block in `Movement.ts` that overrides the target (Warden: anchor + guard radius; Raider: Banner → camp towers → Keep; Commander: lane + target). Hard-wired to the red side (`state.guard`, `state.posts`, blue targets). Respawn is the `heroes` schedule map in `Simulation`. | The *patterns* are reused: Warden became Defend, Raider's target chain became Attack, and the `heroes` respawn map is the model for a Tavern revive. The code was not shared, which avoided a refactor. |
| Azure soldiers | Blue minions whose id starts with `blue-s-`, run by `SoldierProto` hybrid mode with a 400 px tether to the Guardian. | The tether is keyed to the `blue-s-` id prefix, so an Allied Hero (`blue-h-`) is never tethered. No change was needed. |
| Minion pipeline | Target selection → `Navigation.route` (48 px grid A*, attack cells, breach plan, 2 plans per tick shared) → steer/step → separation → strike with wind-up and line of sight. | Fully reused. The Allied Hero only replaces target selection; movement, routing, collision, combat, line of sight and strike timing are the stock code. |
| Capture | Banner raise (`updatePost`) and site capture (`updateFortress`, gates and Elite Barracks) both test "Guardian alive and in the ring". | Widened to "Guardian **or** a living Allied Hero in the ring" (`Simulation.capturer`). |
| Repair | Walk-in jobs (`payJob`: cart wreck, captured gate/Barracks) need the Guardian in the ring. Ruin repair through the Build panel has **no** proximity rule (it is a player action anywhere in territory). | Unchanged: the Guardian is the only one who repairs. |
| Faction gates | `structuresFor(state, team)` hides a gate from the team that owns it; Azure must breach a Crimson gate. | The Allied Hero uses the blue view like every Azure unit. |

## 2. Files and entry points

New files: `src/simulation/AllyProbe.ts` (the AI and constants), `src/data/allyTest.ts` (dev launch), `tests/ally-probe.cjs`, `tests/support/allyBot.cjs`, `scripts/probe-ally-stress.cjs`, `scripts/verify-ally-probe.mjs`, and this report.

Small edits, all inert unless a unit carries `Unit.ally` (only `spawnAlly` creates one):

- `GameState.ts`: `Unit.ally`, `AllyOrder`.
- `Movement.ts`: one hook after target selection; steer for allies; no fallback to the Crimson Keep for allies.
- `Simulation.ts`: `spawnAlly`, `orderAlly`, `capturer`; Allied Heroes excluded from the soldier cap.
- `AzureBarracks.ts`: same cap exclusion.
- `Navigation.ts`: allies plan attack cells 6 px inside their reach.
- `SoldierProto.ts`: allies measure a wall from its footprint edge, like soldiers.
- `Battle.ts`: the `?allyTest` hook, and a placeholder sprite (the Guardian's at 1.5× soldier size) labelled "Allied Knight (order)".

API (harness and debug only): `sim.spawnAlly(x, y)` returns `blue-h-N`. `sim.orderAlly(id, {type:'follow'} | {type:'attack', targetId} | {type:'defend', x, y})` returns false for a shielded Keep, an open captured gate, a friendly or unknown target, or blocked ground.

Browser: `?debug=1&level=<31..36>&allyTest=1` (3 Knights) or `&allyTest=stress` (also an Azure War Cart, an Azure Ballista and funded Barracks pads). Both are dev-only (`import.meta.env.DEV`); Production ignores them. Orders are scripted because the probe has no command UI: Knight 1 follows, Knight 2 attacks the Crimson tower nearest the Azure Keep, Knight 3 defends the road 360 px east of the Azure Keep.

## 3. The probe AI (Knight, melee)

Stats: the Crimson Hero's (833 HP, armour 20, 80 damage every 23 ticks), speed 120 (keeps up with soldiers), 60 px reach (routes planned at 54).

| Command | Behaviour |
|---|---|
| Follow (default) | Fights, in order: the Guardian's own target within 320 px of him; a unit within 120 px of itself; a unit within 320 px of him (never chased away from him). Otherwise walks to its slot beside him once more than 150 px away, and stops at the slot or 96 px from him. While he is dead it holds where it stood (Defend rules) until he respawns. |
| Attack | Walks to the ordered target and fights it, breaching a wall in the way like any Azure unit. On the way it fights back only a unit that is attacking it. When the target is gone it switches to Defend at its last position. |
| Defend | Fights anything within 280 px of its point, then walks back to it. |

No retreat at low HP. Death is final in the probe; revive belongs to Tavern rules in Phase 1.

## 4. Automated results

`node scripts/test.mjs ally-probe.cjs`: **12/12 pass**. Allies in these tests have 1e6 HP so navigation is measured apart from balance.

| Scenario | Result |
|---|---|
| Follow, a walk round Forest Edge | Max gap 202 px while walking, settles at 95 px, 0 stalls. |
| Follow assist | The Knight hits the tower the Guardian is attacking. |
| Follow, Guardian dies | Drift 0 px while he is dead; rejoins him (94 px) after the respawn. |
| Attack chain, Fortress Approach (Guardian parked at home) | Forward tower 31 s at 585 px, Main tower 38 s at 879 px, both gatehouses breached on the way, **Crimson Keep destroyed by the Knight alone at 979 px**. 0 stalls. |
| Attack → Defend | The order becomes Defend at (1080,552); drift 0 px over 10 s. |
| Order validation | Shielded Keep, friendly, unknown and off-map orders are refused. |
| Defend vs live waves (Forest Edge) | 18 kills in 90 s, max excursion 183 px, back at its post (28 px), 0 stalls. |
| Capture by Knight alone | Forest Camp Banner raised (captured at tick 191) with the Guardian 588 px away; Keep shield falls. |
| Capture without Repair | The Knight captures the Forward Gatehouse but cannot repair it (funded, 13 s); the Guardian starts the repair at once. Knight in the wreck ring: no cart repair. |
| Faction gate (Cliff Pass) | The Knight breaks the 3,000 HP gate (all damage its own) to reach the tower behind; never crosses it while it stands. |
| Cell-edge towers | River & Island gate towers (x on a cell edge) 17.0 / 14.6 s, Gatehouse 30.5 s, Forest camp towers (y on a cell edge) 9.0 / 8.9 s. 0 stalls. |
| 3 Knights round the Crimson Fortress ridge | Max gap 422 px, settle 95 / 95 / 110 px, 0 stalls. |
| Determinism | Two runs, identical state hash. |

Full suite: **1192/1192** (the 1180 baseline on `83d87df` plus 12 new). The golden-simulation replays are unchanged. tsc and production build are green. Browser: `verify-ally-probe.mjs` all pass (M1 `allyTest=1`, M4 and M6 `allyTest=stress`, no page errors); `verify-crimson-fortress.mjs` all pass on the probe build.

### Engine traps found and fixed (probe-local)

1. **Strike jitter at the edge of reach.** Navigation parks a melee unit exactly at max range, so any crowd push cancels the strike wind-up (the Knight stood 6 s beside a tower without landing a hit). Fix: routes are planned 6 px inside the reach.
2. **Attack chase.** "Clear the path" let a respawned Crimson Hero drag the Knight from the tower back to the Azure Keep. Fix: on Attack it fights back only units attacking it, and Follow self-defence ignores foes beyond 320 px of the Guardian.
3. **Raw-point goal (anchor-snap family).** A hold point of (862.6, 868.1) was more than 24 px from every cell centre, so Navigation had no goal cell, the cost was Infinity and the Knight froze. Fix: every Defend, hold and attack-complete point snaps to the nearest open cell centre.
4. **Guardian body in the way.** Navigation and the straight-line steer ignore unit bodies, so the Knight shuffled behind a Guardian standing on its line to the tower. Fix: the stand-off point turns round the target until the approach clears him.
5. **Far-side Follow slot.** The Knight pushed against the Guardian's body to reach a slot on his far side. Fix: Follow also stops 96 px from him.
6. **Unit inside a faction gate.** Crimson soldiers walking through their own gate stand inside a footprint that is solid for Azure, so they cannot be reached or seen. Fix: such a unit is not a target.

There is also a safety net: a target the Knight neither struck nor moved toward for 2.5 s is ignored for 5 s (exempt: the ordered Attack target and a breach). **It never fired**: 0 give-ups in every test and stress run.

## 5. Performance

`node scripts/probe-ally-stress.cjs 360`: 6 minutes of live waves, Barracks soldiers and (M6) both Commanders; the Guardian is kept alive and fights at the front. Each configuration runs twice; all replay to the same hash.

| Level | Mode | Peak units (blue/red) | ms/tick avg | p95 | p99 | max | Stalls / give-ups | Knight deaths |
|---|---|---|---|---|---|---|---|---|
| M4 | none (Chapter 4) | 25 (10/15) | 0.65 | 1.54 | 8.1 | 37.6 | – | – |
| M4 | real stats | 23 (13/13) | 0.94 | 2.10 | 10.3 | 21.2 | 0 / 0 | 2 of 3 |
| M4 | held (1e6 HP) | 28 (14/14) | 1.11 | 2.19 | 10.5 | 20.3 | 0 / 0 | 0 |
| M6 | none (Chapter 4) | 26 (8/24) | 0.49 | 1.23 | 2.3 | 11.3 | – | – |
| M6 | real stats | 20 (11/16) | 0.54 | 1.57 | 3.4 | 14.9 | 0 / 0 | 3 of 3 |
| M6 | held (1e6 HP) | 21 (11/13) | 0.69 | 1.93 | 7.6 | 15.5 | 0 / 0 | 0 |

The tick budget is 33.3 ms, and the worst average is 1.1 ms (3.3 %). The Navigation budget of 2 plans per tick is reached in every run, including the Chapter 4 baseline; allies add about 20 % more plans. Node on this PC uses one core; the browser adds rendering on top.

Headless Chrome (SwiftShader software rendering, 960×540) with and without allies:

| Scene | FPS | Frame ms |
|---|---|---|
| M4 plain / `allyTest=stress` | 26 / 25 | 38.9 / 40.4 |
| M6 plain / `allyTest=stress` | 24 / 23–24 | 42.2 / 43.6 |
| M1 plain | 16–17 | 61–64 |

The software renderer is the bottleneck: M1 runs 17 FPS with only 2 to 9 units, because of its forest art. Allies cost about 1 FPS (1.5 ms per frame) here. **These are not phone figures.**

### S24 playtest (to do; not done by the probe)

1. In `G:/work/ark/arkhero-c5-probe`: `node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5371`. Windows Firewall may ask to allow Node on the private network.
2. On the S24, on the same Wi-Fi, open `http://<PC LAN IP>:5371/?debug=1&level=36&allyTest=stress`, then `level=34`. Compare with the same URLs without `&allyTest=stress`.
3. Read the green/yellow/red line at top right (FPS · frame ms · units). Play about 3 minutes in landscape; the Knights act on their own and the Guardian moves normally.

No Preview deploy was made (out of scope).

## 6. Known limitations and open risks

- **No command UI.** Joystick movement plus "tap a red unit = Guardian target" already use the touch input, so issuing commands needs an explicit command mode (select hero → Attack/Defend → tap). This is the largest Phase 1 item and must fit the mobile landscape HUD.
- **Balance untested.** With real stats Knights die in 6 minutes of stress (2 of 3 on M4, 3 of 3 on M6). Tavern cost and revive rules decide whether this feels fair. Kills by Knights still pay Gold, Banner aura buffs them, and Guardian XP from their kills was not examined.
- **Capture is not limited to Banners.** A Knight can capture a Gatehouse and an Elite Barracks alone. This is a design decision for the PO: it enables M3 "Divided Road", but it also removes Guardian-only moments.
- **Navigation stays unit-blind.** The stand-off rotation handles the Guardian; crowds of soldiers and allies rely on separation pushes. Not seen to deadlock here, but 3+ heroes in a narrow neck (M2) were not stressed.
- **Navigation plan budget** (2 per tick) is already saturated in Chapter 4. More AI units mean longer reaction latency, not stalls; watch it if the hero cap rises above 3.
- **Attack on a moving unit** is accepted and chased without a leash. The UI may want to allow only structures as Attack targets.
- **Probe code is PROTOTYPE quality**: commands bypass `Simulation.send`, there are no events for order changes, and the Knight uses the Guardian's sprite. Rebuild it properly in Phase 1 (typed command, events, HUD, art) and keep these rules and tests.
- **War Cart and Ballista placement** were injected directly for the stress test. "Build them from the Build panel" (Chapter 5 support) is not probed.

## 7. Recommendation

**GO for Tavern + M1** under these conditions:

1. Run the S24 check above before M1 implementation starts. The bar is the Chapter 4 release experience: M6 `allyTest=stress` should stay within a few FPS of plain M6.
2. PO decides: can an Allied Hero capture gates and Barracks, or only Banners?
3. PO approves a command input design (command mode on the mobile HUD) before M1, since M1 teaches Follow/Attack.
4. M1 ships with one Knight (cap 1) and keeps the probe rules (reach slack, cell-centre points, stand-off rotation, gate-footprint filter) and the probe tests as its regression net.

Do not commit, push, deploy or start Phase 1 without approval.
