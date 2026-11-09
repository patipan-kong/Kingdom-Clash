# Borin (Azure Dwarf, Tavern mercenary) V1.0 animation frames: production brief (14 images)

Inputs (do not edit them):
- `../ref/canvas-template.png` (1536x1536, transparent): the approved Borin painting at his game scale, standing with his boot soles on the ground line (y=1240) and his feet midpoint near x=950. Every frame is an edit of this template.
- `../ref/borin-still.png`: the same painting at its native size (identity reference).
- After Run 0 only: `00-idle.png`, the approved idle master, is a second reference for every later run.

## The character (identical in every frame)

A short, very broad, powerful dwarf, almost as wide as he is tall, a big barrel chest, thick arms, short thick legs. A big bushy orange-red beard with a long braid down the front and a heavy brow, a bare head with a short tuft of orange hair. A white-cream fur mantle over both shoulders with small animal heads at the shoulders, blue steel pauldrons edged in gold, blue and gold plate armour with a gold-trimmed blue tabard panel hanging in front of the belt, a brown leather belt, thick plated gauntlets and bracers, heavy brown leather boots with gold trim. A long blue cape with a gold border hangs behind him on the viewer-right side. His weapon is a huge two-handed warhammer: a steel head with a blue and gold painted face (gold bands, a gold diamond emblem), a dark steel haft with a gold pommel. He has NO shield and NO helmet. Painted soft-shaded style, dark outline, top lighting, same palette as the template.

## Rules for every frame

1. One generation per frame with the built-in image tool, editing the template, with a genuinely transparent background (`transparent_background: true`). Keep the tool alpha. Never a white, coloured or chroma-key backdrop; never any background removal, chroma key, matting or alpha repair, and no scripts on the pixels. Save each output exactly as returned.
2. Keep the output canvas the template shape (square). Keep Borin at EXACTLY the template size: standing, top of the head to boot soles is about 590 px of the 1536 px height. Keep the ground line: the weight-bearing foot (or, when he is down, the body contact with the ground) stays on y=1240, with the feet centred near x=950. Never scale him to fill the canvas. Nothing, hammer and cape included, may touch or leave the canvas: keep every part at least 80 px inside the edges.
3. The same character in every detail with the same DWARF proportions (short, wide, heavy; never slimmer or taller). A kneeling pose is about three quarters of the standing body height; lying down is at most half.
4. Handedness, never mirrored: the hammer head is on the VIEWER-LEFT side of the image; he grips the haft with both gauntleted fists. The cape is on the viewer-right.
5. He always faces viewer-left (the game mirrors him for the right): body turned three-quarter toward viewer-left, same camera as the template, a little above.
6. Heavy, low, planted: a wide braced stance, the weight low and slow; the hammer is enormous and heavy; the cape lags and sweeps.
7. No ground shadow, no motion blur, no impact lines, no speed lines, no glow, no sparks, no dust, no cracks, no blood, no text, no border.
8. Never a sheet: exactly one character and one pose per image.

## Run 0: the master

### `00-idle.png`
The template pose, as in the still, standing in a braced guard: the hammer held across his body at belt height in both fists with its head on the viewer-left held low above the ground, the body and head turned three-quarter toward viewer-left, feet wide apart and planted. Keep the beard and braid, fur mantle, armour, cape and hammer exactly as in the template. This is the master for every other frame.

## Run A: march (six images)

A heavy, rolling dwarf march toward viewer-left: short quick-looking but weighty steps, the hammer carried across his body in both fists (head low on the viewer-left, clear of the ground), the body rolling slightly side to side, the cape swaying behind.

| File | Pose |
|---|---|
| `01-walk1.png` | Contact: the viewer-left (front) foot just planted a short step ahead, heel down; the other foot behind on its toes. Body slightly lower. |
| `02-walk2.png` | Down: weight settling onto the front foot, knee bent, body at its lowest; the rear foot starting to lift. |
| `03-walk3.png` | Passing: the rear foot swinging forward under the body, the supporting leg straight, body at its highest. |
| `04-walk4.png` | Contact with the OTHER leg: the viewer-right foot planted ahead, the viewer-left foot behind on its toes. Body slightly lower. |
| `05-walk5.png` | Down on the other leg: knee bent, body lowest, the rear foot starting to lift. |
| `06-walk6.png` | Passing on the other leg: the rear foot swinging forward under the body, body highest. Must lead back smoothly into 01. |

## Run B: hammer smash and hurt (four images)

The attack is a HEAVY TWO-HANDED OVERHEAD HAMMER SMASH: both fists on the haft, the hammer raised high and brought down in one crushing arc toward viewer-left. It must feel far heavier and slower than a sword slash: the whole body commits and the hammer head is enormous.

| File | Pose |
|---|---|
| `07-attack1.png` | Smash, wind-up: weight on the rear foot, torso arched back, both fists gripping the haft, the hammer lifted high above and behind his head with its head at the top, the cape flaring. Keep every part of the hammer well inside the canvas (at least 80 px). |
| `08-attack2.png` | Smash, drive: the hammer at the top of its arc directly over his head, tilting forward and starting down toward viewer-left, both arms straight overhead and driving, the torso beginning to pitch forward, the front foot stepping forward. It must differ clearly from 07: the hammer is NOT behind him any more. |
| `09-attack3.png` | Smash, contact: a deep committed crouching lunge toward viewer-left, the front knee bent deep, the torso bowed far forward, both arms fully extended, the hammer slammed down and forward with its head on the ground ahead of the front foot (the hammer head at most 600 px from the feet midpoint), the cape thrown forward. |
| `10-hurt.png` | Hurt: a flinch, head ducked into the shoulders, shoulders hunched, body recoiling a little backward (toward viewer-right); the hammer lowered across the body, one fist off the haft raised toward the face. Feet as in idle. |

## Run C: death (three images)

| File | Pose |
|---|---|
| `11-death1.png` | Death, stagger: dropped to one knee (about three quarters of the standing body height), the hammer head planted on the ground ahead propping him up with the haft upright, the other fist on the ground, head bowed. |
| `12-death2.png` | Death, collapse: toppling forward and sideways toward viewer-left, the hammer slipping from his hands and dropping to the ground, the cape billowing. Same body size as idle. |
| `13-death3.png` | Death, down: lying on the ground on his side, at most half his standing body height, the hammer lying flat on the ground beside him with its head toward viewer-left (the head at most 600 px from the feet midpoint), the cape spread over him. |

## Report

Write the report file named in your task: for each file, the exact prompt, the tool name, the output pixel size and mode. Do not edit any file outside this `frames` folder.

## Note after Run 0

The approved idle master is now `../ref/idle-template.png` (1536x1536, the master at game scale; the lowest point of the boots and hammer on y=1240, the feet midpoint at x=950). For Runs A, B and C edit THAT file (not canvas-template.png) and keep the character exactly as in it. The ground line is y=1240 and the feet midpoint x=950 in every frame; keep every part at least 80 px inside the canvas edges. All other rules are unchanged.
