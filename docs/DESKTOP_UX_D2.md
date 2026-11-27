# Desktop UX — D2 (desktop HUD) and D2.1 (popup keyboard navigation)

Status: **implemented on branch `feature/desktop-ux-d2` (uncommitted), ready for product-owner playtesting.** Not merged or deployed.
Design and approval: `docs/DESKTOP_UX_D1_ASSESSMENT.md` and the D2 / D2.1 approvals.
Evidence:
- `docs/screenshots/desktop-d2/` (HUD at every size and locale, plus `report.json`);
- `docs/screenshots/desktop-d2-1/` (popups with keyboard focus, plus `report.json`).

## What changed for desktop players

**Desktop or touch.**
- A mouse-and-keyboard browser gets the desktop HUD; a phone or tablet keeps the approved touch HUD.
- The game decides from the primary pointer, the same test fullscreen already uses, never from screen width.
- A real touch switches to the touch HUD; a movement or shortcut key switches back.
- Testing override: `?input=touch` or `?input=keyboard`.

**Desktop HUD.**
- Skills form a horizontal bar in the bottom-right corner: **1 Bash, 2 Charge, 3 Taunt, 4 Protect**, each name under its icon.
- Build and Shop sit in the bottom-left corner, above a **WASD / arrow-key movement hint** that replaces the joystick.
- Sizes follow the game's on-screen height:

  | Game height | Skills, Build, Shop |
  |---|---|
  | 700 px or more | 150% |
  | 500–699 px | 125% |
  | below 500 px | 100% |

- Labels are 125%. The top plates and the Azure Keep bar are 120%. The minimap is unchanged.
- Compact gold-bordered key badges, one size per tier, sit on each icon's upper-left edge: 1–4, B, T, and K on the Skills entry.

**Keys.**

| Key | Action |
|---|---|
| WASD / arrows | move |
| 1 / 2 / 3 / 4 | Bash / Charge / Taunt / Protect, exactly like a tap: selected or nearest target; Charge goes along the last movement |
| B | Build |
| T | Shop |
| K | Skills |
| Space | Pause, as before |
| Esc | cancel an aimed skill, otherwise close the open popup, otherwise Pause |
| Right click | cancel an aimed skill, as before |

- A locked, unlearned or cooling-down skill casts nothing, and its key shows the game's existing message.
- While a popup is open or the game is paused, skill keys do nothing.

**Popups (D2.1).** In Skills, Build and Shop:
- Arrows or WASD move a gold focus outline along the popup's own layout.
- Tab and Shift+Tab step through the controls.
- Enter presses the focused control with its own click action.
- Esc, or the popup's own key (K, B or T), closes the popup.

Initial focus:

| Popup | Focus starts on |
|---|---|
| Skills | the first skill that can be learned now |
| Build | the Wall card |
| Shop | the selected item |

Behaviour details:
- Focus may rest on an unavailable control. Its outline is dimmed and Enter does nothing there, so the focus never jumps onto Close after the last point or coin is spent.
- A mouse press moves the focus to the pressed control.
- A held Enter acts once.
- The Guardian never moves while a popup is open.
- Build placement stays mouse-based. Expected flow: B → Enter on a card → click a cell → move to Confirm → Enter.

**Tutorial text.**
- The out-of-date hint "Use Attack on towers and Keeps." now reads "Stay near towers and Keeps: your Guardian attacks them automatically." in EN, TH and JA, on desktop and mobile (approved).
- On desktop only, the Skills hint and the cast hint name the keys:
  - "Press K or click Skills to learn a skill."
  - "Press 1–4 or click to cast · Drag to aim"
- The Skills popup titles name the keys that actually cast: 1–4 on desktop. Touch keeps the approved Q/W/E/R text.

## Not changed

- **Mobile and touch:** layout, sizes, joystick, labels and behaviour are unchanged. The touch HUD's measured geometry is identical to the D1 baseline in EN, TH and JA. The only mobile change is the approved hint correction.
- **Excluded from this work:**
  - gameplay, balance, AI, campaign data and Auto Attack;
  - ads;
  - the Playgama branch;
  - rendering resolution (that is D3);
  - new art and dependencies.

## Implementation

Small additions, reusing the existing HUD and popups, with no second HUD:

| File | Role |
|---|---|
| `src/ui/inputMode.ts` | touch or keyboard mode, and its switching |
| `src/ui/controlLayout.ts` | `desktopControlLayout`, `desktopTier`, label and badge sizes; `controlLayout` itself unchanged |
| `src/ui/KeyBadge.ts` | one key-cap look for badges and hint caps |
| `src/ui/panelNavigation.ts` | pure layout-following navigation, Tab order, nearest-after-change |
| `src/ui/PanelFocus.ts` | the focus outline; Enter replays the control's own press, so every availability rule stays the popup's |
| `src/scenes/HUD.ts` | picks the layout per mode, top plates at 120%, badges, hint, shortcuts, Esc chain, popup keys |
| `AbilityButton` / `UtilityButton` | `pressKey()` under the tap's own checks; optional label scale |
| `SkillsPanel` | exposes its controls; key names in keyboard mode |

The shortcuts read the browser's own `keydown`. Phaser's keyboard queue was seen delivering one press more than once, which stepped Shift+Tab several times and could have pressed Enter twice. Space moved to the same listener and keeps its meaning.

## Verification

| Check | Result |
|---|---|
| `scripts/verify-desktop-hud.mjs` | 5 desktop sizes × EN/TH/JA, plus the Hero Bar, Warlord and four-objective missions: overlap and off-screen checks, sizes, states, every key rule, mode switching, touch HUD identical to the D1 baseline |
| `scripts/verify-panel-keys.mjs` | Skills, Build and Shop by keyboard only and mixed with the mouse; unavailable, locked and insufficient-resource actions; held Enter; repeated opening, switching and closing; return to play; touch mode; EN/TH/JA |
| `tests/desktop-layout.cjs`, `tests/panel-navigation.cjs` | layout and navigation unit tests |
| Full unit suite | no new failures against untouched `main`; the remaining failures fail on `main` too |

Known limits:
- At 1920×1080 the larger controls still render soft text, because the canvas is 960×540 stretched. This is the D3 study.
- The Warlord-bar check clears his opening invulnerability in the test fixture so the bar is on screen.

## Playtest notes

- Try a 1080p window, a 1280×720 window, and the game embedded around 960×540.
- After a touch on a touchscreen laptop the joystick returns; any movement key brings the desktop HUD back.
- The Tavern popup has no keyboard navigation yet. It wasn't in the D2.1 request.
