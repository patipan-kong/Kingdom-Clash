# Crimson Hero (Frost Warlord, Crimson Lord, Iron Marshal) V1.0 animation frames: production brief (14 images)

Inputs (do not edit them):
- `../ref/canvas-template.png` (1536x1536, transparent): the approved Crimson Hero painting at his game scale, standing with his boot soles on the ground line (y=1240) and his feet midpoint near x=900. Every frame is an edit of this template.
- `../ref/hero-still.png`: the same painting at its native size (identity reference).
- After Run 0 only: `00-idle.png`, the approved idle master, is a second reference for every later run.

## The character (identical in every frame)

A huge, heavy, brutal armoured warlord, far bulkier than any soldier. A dark steel great-helm with a red face plate and THREE curved horns (one on each side and a central crest horn). A big white-grey fur mantle over both shoulders. Dark gunmetal plate armour with red inlay, riveted pauldrons and bracers, black gauntlets, a brown leather belt with a large hexagonal buckle, a red tabard panel hanging to the knee, plated greaves and boots. A long tattered dark-red cape. His weapon is a huge double-bit battle axe: a dark wooden haft wrapped with red cloth near the head, and two broad crescent steel blades with red rune marks. He has NO shield. Painted soft-shaded style, dark outline, top lighting, same palette as the template.

## Rules for every frame

1. One generation per frame with the built-in image tool, editing the template, with a genuinely transparent background (`transparent_background: true`). Keep the tool alpha. Never a white, coloured or chroma-key backdrop; never any background removal, chroma key, matting or alpha repair, and no scripts on the pixels. Save each output exactly as returned.
2. Keep the output canvas the template shape (square). Keep the warlord at EXACTLY the template size: standing, horn tips to boot soles is about 760 px of the 1536 px height. Keep the ground line: the weight-bearing foot (or, when he is down, the body contact with the ground) stays on y=1240, with the feet centred near x=900. Never scale him to fill the canvas. Nothing, axe and cape included, may touch or leave the canvas: keep every part at least 80 px inside the edges.
3. The same character in every detail with the same proportions: broad, heavy, big fur mantle, big axe. A kneeling pose is about three quarters of the standing body height; lying down is at most half.
4. Handedness, never mirrored: the axe is held in his RIGHT hand on the VIEWER-LEFT side of the image (in the chop he grips it with both hands, the axe stays on the viewer-left side). His free LEFT arm is on the VIEWER-RIGHT side.
5. He always faces viewer-left (the game mirrors him for the right): body turned three-quarter toward viewer-left, same camera as the template, a little above.
6. Heavy feel: wide braced stance, planted feet, slow weighty movement; the axe is enormous and heavy; the cape lags and sweeps.
7. No ground shadow, no motion blur, no speed lines, no glow, no sparks, no dust, no blood, no text, no border. Do not copy the dark ground smudge of the template.
8. Never a sheet: exactly one character and one pose per image.

## Run 0: the master

### `00-idle.png`
The template pose turned slightly so the body and head face three-quarter toward viewer-left: braced heavy guard stance, the axe held low in the viewer-left hand with its blades resting just above the ground ahead of his front foot, his free fist clenched at the viewer-right. Keep the helm, horns, mantle, armour, cape and axe exactly as in the template. This is the master for every other frame.

## Run A: march (six images)

A heavy marching stomp toward viewer-left, the axe carried low in his right hand (its blades just clear of the ground, trailing a little behind the front foot), the free arm swinging a little, the cape swaying behind. Slow and weighty: the body bobs only a little; feet closer together than the guard stance during contacts.

| File | Pose |
|---|---|
| `01-walk1.png` | Contact: the viewer-left (front) foot just planted a short step ahead, heel down; the other foot behind on its toes. Body slightly lower. |
| `02-walk2.png` | Down: weight settling onto the front foot, knees bent, body at its lowest; the rear foot starting to lift. |
| `03-walk3.png` | Passing: the rear foot swinging forward under the body, the supporting leg straight, body at its highest. |
| `04-walk4.png` | Contact with the OTHER leg: the viewer-right foot planted ahead, the viewer-left foot behind on its toes. Body slightly lower. |
| `05-walk5.png` | Down on the other leg: knees bent, body lowest, the rear foot starting to lift. |
| `06-walk6.png` | Passing on the other leg: the rear foot swinging forward under the body, body highest. Must lead back smoothly into 01. |

## Run B: axe chop and hurt (four images)

The attack is a HEAVY TWO-HANDED OVERHEAD CHOP: both hands on the haft, the axe raised high and slammed down in a big arc toward viewer-left. It must look far heavier and slower than a sword swing: the whole body commits.

| File | Pose |
|---|---|
| `07-attack1.png` | Chop, wind-up: weight on the rear foot, torso leaning back and twisted, both hands gripping the haft, the axe raised high above and behind his head, blades at the top, the cape flaring. Keep every part of the axe well inside the canvas. |
| `08-attack2.png` | Chop, drive: the axe at the top of its arc, sweeping forward and down over his head toward viewer-left, both arms driving, the torso pitching forward, the front foot stepping forward. |
| `09-attack3.png` | Chop, contact: a deep committed lunge toward viewer-left, the front knee bent deep over the front foot, the torso bowed forward, both arms fully extended, the axe slammed down and forward with its lower blade near the ground ahead of the front foot (the blade at most 560 px from the feet midpoint), the cape thrown forward. |
| `10-hurt.png` | Hurt: a flinch, head ducked, shoulders hunched, body recoiling a little backward (toward viewer-right); the axe lowered, one hand raised toward the face. Feet as in idle. |

## Run C: death (three images)

| File | Pose |
|---|---|
| `11-death1.png` | Death, stagger: dropped to one knee (about three quarters of the standing body height), the axe head planted on the ground ahead propping him up, the other fist on the ground, head bowed. |
| `12-death2.png` | Death, collapse: falling forward and sideways toward viewer-left, the helmet tilting, the axe slipping from the hand and dropping to the ground, the cape billowing. Same body size as idle. |
| `13-death3.png` | Death, down: lying on the ground on his side, at most half his standing body height, the axe lying flat on the ground beside him pointing toward viewer-left (blade at most 560 px from the feet midpoint), the cape spread over him. |

## Report

Write the report file named in your task: for each file, the exact prompt, the tool name, the output pixel size and mode. Do not edit any file outside this `frames` folder.

## Note after Run 0

The approved idle master is now `../ref/idle-template.png` (1536x1536, the master at game scale: horn tips to the lowest point of the axe about 760 px, the lowest point (axe blade tip and boot soles) on y=1240, the feet midpoint at x=950). For Runs A, B and C edit THAT file (not canvas-template.png) and keep the character exactly as in it (same helm and horns, mantle, armour, cape, axe and proportions and colours). The ground line is y=1240 and the feet midpoint x=950 in every frame; keep every part at least 80 px inside the canvas edges. All other rules are unchanged.
