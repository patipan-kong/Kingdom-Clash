# Kingdom Clash V1.2 — release summary

Status: **awaiting final release approval.** Not pushed, not merged to `main`, not deployed. No Playgama integration.
Base: V1.1 (`b67cbd3`). Release candidate: `integration/b5-desktop` (game code at `db4d556`; later commits are documentation).

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
| Product-owner playtest, final production-build preview | 8 of 8 passed |
| Unit suite | 1,726 tests, 21 failures: 18 inherited from V1.1, 3 deferred ([KNOWN_FAILURES_V1_2.md](KNOWN_FAILURES_V1_2.md)) |
| Rendering resolution, production preview | 200/200 |
| Desktop HUD, development server | 254/254 |
| Popup keyboard navigation, development server | 53/53 |
| Single Enter / single click in Shop, Build, Skills | 19/19 |
| Resizing (EN/TH/JA) and fullscreen | passed |
| Mouse targeting and placement, Tavern and hero order, touch controls | passed |
| C6M5 and C6M6 with a full field | no errors |
| Release-variant build (without playtest switches): desktop, phone, `?debug=1` | boots, correct backing size, no readout, no mission launch |

Browser checks other than the playtest ran in headless Chrome with software graphics.

**Not run as dedicated checks:** the browser walk-through listed as the "integrated regression gate" in the gameplay freeze note (both victory routes of each changed mission through the normal campaign entry, retry and progression, the C1M2 construction gate, the Captain announcement in three languages, the C2M2 and C6M6 exceptions, one territory siege).

## Known limitations

- Three deferred starvation-test failures. In Mission C1M2, a Guardian who dies on one Crimson spawn slot can release up to three held enemies at once.
- Rendering is capped at 1920×1080; larger screens upscale.
- Generated ground and some icons are no sharper than in V1.1.
- Text shadows look shallower at higher resolution.
- Low-end laptops have not been tested at native resolution. The product owner's PC held 60 FPS.

## Steps left, each needing approval

1. **Version number.** `package.json` still says `1.1.0`, so the menu shows "V1.1", including in the playtested build. Set it to `1.2.0` before release.
2. **Merge to `main`.** `main` is at `b67cbd3`, so it can fast-forward.
3. **Push and deploy.** Pushing `main` publishes to Vercel Production.
4. **Playgama** is a separate branch (`platform/playgama`) and does not contain V1.2.

**Saves:** the save and progress code is unchanged from V1.1.

**Rollback:** redeploy `b67cbd3`.
