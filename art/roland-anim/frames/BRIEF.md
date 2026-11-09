# Roland (Azure Knight, Tavern mercenary) V1.0 animation frames: production brief (14 images)

Inputs (do not edit them):
- `../ref/canvas-template.png` (1536x1536, transparent): the approved Roland painting at his game scale, standing with his boot soles on the ground line (y=1240) and his feet midpoint near x=950. Every frame is an edit of this template.
- `../ref/roland-still.png`: the same painting at its native size (identity reference).
- After Run 0 only: `00-idle.png`, the approved idle master, is a second reference for every later run.

## The character (identical in every frame)

A human knight in blue and steel. Short swept-back brown hair, a short brown beard, a stern face. Steel plate pauldrons with gold trim (the one on the viewer-right shoulder is large and rounded), a steel chest plate with a gold-edged blue surcoat and a blue tabard panel hanging to the knee over black cloth, steel bracers with gold trim, steel gauntlets, a brown leather belt with a round gold buckle, plated greaves with gold knee guards and steel boots. A long blue cape with a gold border and a gold emblem hangs behind him on the viewer-right side. His weapon is a steel longsword with a gold cross-guard and a brown grip. He has NO shield and NO helmet. Painted soft-shaded style, dark outline, top lighting, same palette as the template.

## Rules for every frame

1. One generation per frame with the built-in image tool, editing the template, with a genuinely transparent background (`transparent_background: true`). Keep the tool alpha. Never a white, coloured or chroma-key backdrop; never any background removal, chroma key, matting or alpha repair, and no scripts on the pixels. Save each output exactly as returned.
2. Keep the output canvas the template shape (square). Keep Roland at EXACTLY the template size: standing, hair top to boot soles is about 740 px of the 1536 px height. Keep the ground line: the weight-bearing foot (or, when he is down, the body contact with the ground) stays on y=1240, with the feet centred near x=950. Never scale him to fill the canvas. Nothing, sword and cape included, may touch or leave the canvas: keep every part at least 80 px inside the edges.
3. The same character in every detail with the same proportions. A kneeling pose is about three quarters of the standing body height; lying down is at most half.
4. Handedness, never mirrored: the sword is held by the hand on the VIEWER-RIGHT side of his body (grip near his belt), its blade pointing forward toward viewer-left; his free hand (a gauntleted fist) is on the VIEWER-LEFT side. The cape is on the viewer-right.
5. He always faces viewer-left (the game mirrors him for the right): body turned three-quarter toward viewer-left, same camera as the template, a little above.
6. A balanced, agile, disciplined knight: a medium-wide stance, the weight on the balls of the feet.
7. No ground shadow, no motion blur, no slash arcs, no speed lines, no glow, no sparks, no dust, no blood, no text, no border.
8. Never a sheet: exactly one character and one pose per image.

## Run 0: the master

### `00-idle.png`
The template pose, as in the still, standing in a ready guard: the longsword held low in front of him, its blade angled down toward viewer-left with the tip just above the ground, the free gauntleted fist at his side on the viewer-left, the head turned three-quarter toward viewer-left. Keep the hair, face, armour, tabard, cape and sword exactly as in the template. This is the master for every other frame.

## Run A: march (six images)

A brisk, disciplined marching step toward viewer-left, the longsword carried low and angled forward in his hand on the viewer-right (tip clear of the ground), the free arm swinging a little, the cape swaying behind.

| File | Pose |
|---|---|
| `01-walk1.png` | Contact: the viewer-left (front) foot just planted a short step ahead, heel down; the other foot behind on its toes. Body slightly lower. |
| `02-walk2.png` | Down: weight settling onto the front foot, knee bent, body at its lowest; the rear foot starting to lift. |
| `03-walk3.png` | Passing: the rear foot swinging forward under the body, the supporting leg straight, body at its highest. |
| `04-walk4.png` | Contact with the OTHER leg: the viewer-right foot planted ahead, the viewer-left foot behind on its toes. Body slightly lower. |
| `05-walk5.png` | Down on the other leg: knee bent, body lowest, the rear foot starting to lift. |
| `06-walk6.png` | Passing on the other leg: the rear foot swinging forward under the body, body highest. Must lead back smoothly into 01. |

## Run B: sword slash and hurt (four images)

The attack is a DIAGONAL SWORD SLASH: one fluid cut from the high viewer-right across the body to low on the viewer-left. It must be clearly more athletic and quicker than a plain stab, a knight's disciplined cut with the whole body behind it.

| File | Pose |
|---|---|
| `07-attack1.png` | Slash, wind-up: weight on the rear foot, torso twisted back toward viewer-right, the sword raised high behind his viewer-right shoulder with the blade pointing up and back, the free arm thrown out for balance, the cape flaring. |
| `08-attack2.png` | Slash, drive: the sword sweeping diagonally down and forward from above his head toward viewer-left, the blade at about 45 degrees in front of his face, the front foot stepping forward, the torso turning into the cut. It must differ clearly from 07: the blade is NOT behind him any more. |
| `09-attack3.png` | Slash, contact: a deep lunge toward viewer-left, the front knee bent deep over the front foot, the torso bowed forward, the arm fully extended, the sword at the end of the cut low and forward with its blade pointing down toward viewer-left at about 20 degrees below horizontal (the tip at most 560 px from the feet midpoint), the cape thrown forward. |
| `10-hurt.png` | Hurt: a flinch, head turned and ducked, shoulders hunched, body recoiling a little backward (toward viewer-right); the sword lowered, the free hand raised toward the face. Feet as in idle. |

## Run C: death (three images)

| File | Pose |
|---|---|
| `11-death1.png` | Death, stagger: dropped to one knee (about three quarters of the standing body height), the sword point planted on the ground ahead propping him up, the other fist on the ground, head bowed. |
| `12-death2.png` | Death, collapse: falling forward and sideways toward viewer-left, the sword slipping from the hand and dropping toward the ground, the cape billowing. Same body size as idle. |
| `13-death3.png` | Death, down: lying on the ground on his side, at most half his standing body height, the sword lying flat on the ground beside him pointing toward viewer-left (tip at most 560 px from the feet midpoint), the cape spread over him. |

## Report

Write the report file named in your task: for each file, the exact prompt, the tool name, the output pixel size and mode. Do not edit any file outside this `frames` folder.

## Note after Run 0

The approved idle master is now `../ref/idle-template.png` (1536x1536, the master at game scale; the lowest point of the boots and sword on y=1240, the feet midpoint at x=950). For Runs A, B and C edit THAT file (not canvas-template.png) and keep the character exactly as in it. The ground line is y=1240 and the feet midpoint x=950 in every frame; keep every part at least 80 px inside the canvas edges. All other rules are unchanged.
