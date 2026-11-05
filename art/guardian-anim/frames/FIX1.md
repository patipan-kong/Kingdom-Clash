# Correction round 1 (8 frames)

The lead developer rejected these frames. Regenerate ONLY them, following BRIEF.md exactly (same rules, same template edit, same file names), plus these corrections. The rejected versions are in `../rejected/round1/` for reference of what NOT to do.

Two hard rules that some frames broke:

A. NEVER mirror the character. His shield is ALWAYS strapped to his LEFT arm, which is on the VIEWER-RIGHT side of the image; his sword is ALWAYS in his RIGHT hand, on the VIEWER-LEFT side. Every frame in `00-idle.png`..`11-bash1.png` shows this. When a pose brings the shield toward viewer-left (Shield Bash), he swings his shield arm ACROSS the front of his body; the shield stays on that same arm and the sword stays in the other hand, held low and back.

B. The SAME BODY SIZE in every frame: his helmet, pauldrons, torso and shield are exactly as large as in `00-idle.png` (compare against it). A kneeling or crouching pose is therefore SHORTER than standing: kneeling about three quarters of the standing height. Do not enlarge the body to fill the space, and do not change his proportions (head about 22% of the standing height, stocky).

Frames to redo:
- `12-bash2.png`, `13-bash3.png`, `14-bash4.png`: Shield Bash coil, thrust and impact as described in BRIEF.md, obeying rule A (shield on the viewer-right arm, driven across and forward; sword low behind on the viewer-left side). Use `11-bash1.png` as the starting pose.
- `18-taunt1.png`, `20-taunt3.png`: as described in BRIEF.md, obeying rule B (exactly the body size and proportions of `00-idle.png` and `19-taunt2.png`).
- `25-death1.png`, `28-rise.png`: on one knee, obeying rule B (about three quarters of the standing height; helmet and shield exactly the size in `00-idle.png`). `26-death2.png`: falling, the same body size as `00-idle.png`.

Attach or reference `00-idle.png` (and the neighbouring accepted frames named above) as size and identity references in every generation, together with the template. Write `REPORT-fix1.md` with the exact prompts.
