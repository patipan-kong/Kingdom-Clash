# Crimson Elite Soldier V1.0 animation frames: production brief (14 images)

Inputs (do not edit them):
- `../ref/canvas-template.png` (1536x1536, transparent): the approved Crimson Elite Soldier painting at his game scale, standing with his boot soles on the ground line (y=1240) and his feet midpoint at x=900. Every frame is an edit of this template.
- `../ref/elite-still.png`: the same painting at its native size (identity reference).
- After Run 0 only: `00-idle.png`, the approved idle master, is a second reference for every later run.

## The character (identical in every frame)

A tall, heavy, imposing armoured knight, much bulkier than an ordinary soldier. Dark gunmetal plate armour with red trim. Steel great-helm with a dark visor slit and a tall red horsehair plume. Fur-trimmed collar and pauldrons. Dark red tabard and cape panels. Brown leather belt, bracers and gauntlets. A LONG spear: the shaft is dark wood wrapped with red cloth, topped with a broad steel leaf blade. A very large dark steel kite shield with a red heart-shaped field and a black eagle crest. Painted soft-shaded style, dark outline, top lighting, same palette as the template.

## Rules for every frame

1. One generation per frame with the built-in image tool, editing the template, with a genuinely transparent background (`transparent_background: true`). Keep the tool alpha. Never a white, coloured or chroma-key backdrop; never any background removal, chroma key, matting or alpha repair, and no scripts on the pixels. Save each output exactly as returned.
2. Keep the output canvas the template shape (square). Keep the knight at EXACTLY the template size: standing, the spear tip to the boot soles is about 760 px of the 1536 px height (the helmet about 150 px wide). Keep the ground line: the weight-bearing foot (or, when he is down, the body contact with the ground) stays on y=1240, with the feet centred near x=900. Never scale him to fill the canvas. Nothing, spear tip and shield edge included, may touch or leave the canvas: keep every part at least 80 px inside the edges.
3. The same character in every detail, with the same proportions: heavy, broad shoulders, big shield. A kneeling pose is about three quarters of the standing body height (not counting the spear); lying down is at most half.
4. Handedness, never mirrored: the spear is ALWAYS in his RIGHT hand, on the VIEWER-LEFT side of the image; the shield is ALWAYS strapped to his LEFT arm, on the VIEWER-RIGHT side. Every frame keeps this, even when he thrusts or falls.
5. He always faces viewer-left (the game mirrors him for the right): body turned three-quarter toward viewer-left, same camera as the template, a little above.
6. Heavy feel: wide braced stance, planted feet, slow weighty movement; the shield stays large and the feet and shield stay in about the same place from frame to frame.
7. No ground shadow, no motion blur, no speed lines, no glow, no sparks, no dust, no blood, no text, no border.
8. Never a sheet: exactly one character and one pose per image.

## Run 0: the master

### `00-idle.png`
The template pose turned slightly so the body and head face three-quarter toward viewer-left: braced guard stance, the spear held upright (vertical, tip high) in the viewer-left hand with its butt near the front boot, the shield up at the viewer-right. Keep the armour, plume, spear and shield exactly as in the template. This is the master for every other frame.

## Run A: walk (six images)

Walk: a heavy marching stride toward viewer-left, the spear carried upright, angled a little forward (its tip leaning toward viewer-left no more than 15 degrees from vertical, its butt swinging a little), the shield up at the viewer-right. Slow and weighty: the body bobs only a little. Feet closer together than the guard stance during contacts.

| File | Pose |
|---|---|
| `01-walk1.png` | Contact: the viewer-left (front) foot just planted a short step ahead, heel down; the other foot behind on its toes. Body slightly lower. |
| `02-walk2.png` | Down: weight settling onto the front foot, knees bent, body at its lowest; the rear foot starting to lift. |
| `03-walk3.png` | Passing: the rear foot swinging forward under the body, the supporting leg straight, body at its highest. |
| `04-walk4.png` | Contact with the OTHER leg: the viewer-right foot planted ahead, the viewer-left foot behind on its toes. Body slightly lower. |
| `05-walk5.png` | Down on the other leg: knees bent, body lowest, the rear foot starting to lift. |
| `06-walk6.png` | Passing on the other leg: the rear foot swinging forward under the body, body highest. Must lead back smoothly into 01. |

## Run B: spear thrust and hurt (four images)

The spear thrust is a straight stab, NOT a sword swing: the spear is held horizontal, its tip toward viewer-left, driven forward along its own axis at chest height.

| File | Pose |
|---|---|
| `07-attack1.png` | Thrust, wind-up: weight on the rear foot, shoulders turned, the spear pulled back at hip height and levelled horizontal, its blade pointing toward viewer-left over his front hand, the butt behind him; the shield pulled in to the chest. Keep every part of the spear well inside the canvas. |
| `08-attack2.png` | Thrust, drive: the spear shooting forward horizontal at chest height toward viewer-left, the arm half extended, the front foot stepping forward, body turning into it; the shield guarding the chest at the viewer-right. |
| `09-attack3.png` | Thrust, contact: a deep lunge toward viewer-left, the front knee bent over the front foot, the torso leaning forward, the spear arm fully extended with the spear horizontal and the blade at its farthest reach (the blade at most 650 px from the feet midpoint), the shield tucked in at the viewer-right and the rear foot braced. |
| `10-hurt.png` | Hurt: a flinch, head ducked, shoulders hunched, body recoiling a little backward (toward viewer-right); the shield lifted slightly, the spear tilting. Feet as in idle. |

## Run C: death (three images)

| File | Pose |
|---|---|
| `11-death1.png` | Death, stagger: dropped to one knee (about three quarters of the standing body height), the spear point dropping to the ground ahead and propping him, the shield sagging, head bowed. |
| `12-death2.png` | Death, collapse: falling sideways and forward toward viewer-left, the helmet tilting, the spear slipping from the hand and angling down to the ground, the shield sliding off the arm. Same body size as idle. |
| `13-death3.png` | Death, down: lying on the ground on his side, at most half his standing body height, the spear lying flat on the ground beside him pointing toward viewer-left (blade at most 650 px from the feet midpoint), the shield on the ground, the plume down. |

## Report

Write the report file named in your task: for each file, the exact prompt, the tool name, the output pixel size and mode. Do not edit any file outside this `frames` folder.

## Note after Run 0

The approved idle master is now `../ref/idle-template.png` (1536x1536, the master at game scale on the same ground line y=1240, feet midpoint x=900, spear tip to soles about 760 px). For Runs A, B and C edit THAT file (not canvas-template.png); keep the character exactly as in it (same helmet, plume, armour, spear, shield proportions and colours). All other rules are unchanged.
