# Kingdom Clash V1.2 — release summary

Status: **gameplay, desktop UX and rendering approved by the product owner; awaiting final production release approval.** Not pushed, not merged to `main`, not deployed. No Playgama integration.
Base: V1.1 (`b67cbd3`). Release candidate: `integration/b5-desktop`, version 1.2.0 (game code and version at `2fb8045`; later commits add verification notes and the walk-through script).

## What's new

### Campaign (B1–B5, approved and frozen)

Eight missions change; the other 28 campaign configurations match V1.1.

| Mission | Victory in V1.2 |
|---|---|
| C1M1 Hold the Ford | Defeat five waves or destroy the Keep |
| C1M2 Fortify the Crossing | Build two Archer Towers, then defeat six waves or destroy the Keep |
| C1M3 Against the Tide | Destroy the three front towers or the Keep; a new optional defender, the Captain of the Ford |
| C1M4 The Twin Batteries | Destroy all five battery towers or the Keep |
| C1M5 The Crimson Muster | Destroy the War Camp or the Keep |
| C2M1 The Dust Riders | Defeat six waves or destroy the Keep |
| C2M3 The Sandstone Line | Destroy both gate towers or the Keep |
| C2M4 Break the Siege | Destroy the Barracks or the Keep |

Tower positions, Keep hit points and wave timing for these missions are in [CAMPAIGN_GAMEPLAY_FREEZE.md](CAMPAIGN_GAMEPLAY_FREEZE.md). The new text is in English, Thai and Japanese.

### Desktop

- **HUD for mouse and keyboard:** skill bar bottom right, Build and Shop bottom left, movement hint, key badges, larger controls and labels by screen size.
- **Keys:** WASD or arrows to move; 1–4 skills; B Build, T Shop, K Skills; Space pause.
- **Popups by keyboard:** arrows, WASD, Tab and Enter in Skills, Build and Shop.
- **Sharper picture:** the game renders at the screen's own pixels, up to 1920×1080, and follows window resizing and fullscreen. `?res=540` restores the original rendering.

### Phones and tablets

The touch HUD, touch controls and 960×540 rendering are unchanged. The campaign changes above apply to them too.

## Verification

| Check | Result |
|---|---|
| Product-owner playtest, production-build preview of `db4d556` | 8 of 8 passed |
| Release walk-through on the 1.2.0 release package (`verify-v12-walkthrough.mjs`) | 227/227 |
| Unit suite (`db4d556`; only the version number changed in code since) | 1,726 tests, 21 failures: 18 inherited from V1.1, 3 deferred ([KNOWN_FAILURES_V1_2.md](KNOWN_FAILURES_V1_2.md)) |
| Rendering resolution, production preview | 200/200 |
| Desktop HUD, development server | 254/254 |
| Popup keyboard navigation, development server | 53/53 |
| Single Enter / single click in Shop, Build, Skills | 19/19 |
| Resizing (EN/TH/JA) and fullscreen | passed |
| Mouse targeting and placement, Tavern and hero order, touch controls | passed |
| C6M5 and C6M6 with a full field | no errors |
| 1.2.0 release package startup: desktop, phone, `?debug=1` | boots, correct backing size, no readout, no mission launch |

Browser checks other than the playtest ran in headless Chrome with software graphics.

### Release walk-through (the gate in the gameplay freeze note)

| Area | Covered |
|---|---|
| Victory routes | Both routes of all eight changed missions, entered from the main menu; mouse and keyboard, and touch |
| Mandatory objectives | C1M2 does not win by six waves or by razing the Keep until two Archer Towers are built through the Build panel; wave and multi-target routes do not win one short |
| Retry and progression | Defeat, Retry, win, Replay and Next Mission on C1M1, C1M2, C1M3 and C2M4; after a reload the next mission is unlocked and the one after stays locked |
| Save and unlock | Fresh player; locked missions take no input and cannot be started; each clear is saved once |
| Captain of the Ford | Announcement in EN, TH and JA on desktop and touch; defeating the Captain is optional |
| Objective text | Eight missions, three languages, desktop and phone: on screen; panel stills reviewed |
| Protected Keeps and finale | C2M2 protected Keep and three phases; C1M6 armed Keep; C4M1 shielded Keep until the camp is captured; C6M6 line, forward post, arena, Warlord, Campaign Complete |

How it was played: menus, building and result buttons used real mouse or touch input. To keep it short, targets were destroyed with the simulation's own damage function, the Guardian was kept alive and construction resources were granted. It proves the victory rules and flow, not difficulty or balance.

Two older browser scripts could not be reused because they expect pre-V1.1 screens: `verify-campaign-progress.mjs` (old main-menu text) and `verify-victory-navigation.mjs` (Chapter 5 as the finale; its 26 checks before that point passed). The walk-through covers the flows they would have checked.

## Known limitations

- Three deferred starvation-test failures. In Mission C1M2, a Guardian who dies on one Crimson spawn slot can release up to three held enemies at once.
- Rendering is capped at 1920×1080; larger screens upscale.
- Generated ground and some icons are no sharper than in V1.1.
- Text shadows look shallower at higher resolution.
- Two older browser scripts (campaign progress, victory navigation) are out of date and were not updated.
- Low-end laptops have not been tested at native resolution. The product owner's PC held 60 FPS.

## Steps left, each needing approval

1. **Merge to `main`.** `main` is at `b67cbd3`, so it can fast-forward.
2. **Push and deploy.** Pushing `main` publishes to Vercel Production.
3. **Playgama** is a separate branch (`platform/playgama`) and does not contain V1.2.

**Saves:** the save and progress code is unchanged from V1.1.

**Rollback:** redeploy `b67cbd3`.
