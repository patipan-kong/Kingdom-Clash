#!/usr/bin/env python
"""Write art/soldier-anim/frames.json for scripts/pack-soldier-sheets.py and print each frame's extent around the feet pivot at cell scale.
Usage: py scripts/soldier-frames-manifest.py [idle-height-in-cell]
Every frame is an edit of art/soldier-anim/ref/canvas-template.png (1600 px wide, the approved Azure Vanguard standing on the ground line y=1180, his feet
midpoint at x=FEET[0]); the generator returns the same canvas shape at its own size, so one scale and one anchor per frame follow from the output width alone.
Standing frames (idle, walk, attack, hurt) are grounded: their anchor's y is the lowest sole (alpha 128+), so a frame the generator drew a few px above
the ground line is translated down onto it (a translation only). Read-only on the PNGs."""
import sys, json
from PIL import Image

TEMPLATE_W, FEET, REF_H = 1600, (866.5, 1180), 688   # template width, feet midpoint on the ground line, the reference's standing height (template px)
IDLE_H = float(sys.argv[1]) if len(sys.argv) > 1 else 120
NAMES = ['00-idle'] + ['%02d-walk%d' % (i, i) for i in range(1, 7)] + ['07-attack1', '08-attack2', '09-attack3', '10-hurt', '11-death1', '12-death2', '13-death3']
root = 'art/soldier-anim/'
STANDING = set(NAMES[:11])
frames = []; ext = [0, 0, 0, 0]
for n in NAMES:
    f = 'frames/%s.png' % n; im = Image.open(root + f); k = im.width / TEMPLATE_W
    scale = IDLE_H / (REF_H * k); anchor = [round(FEET[0] * k, 2), round(FEET[1] * k, 2)]
    bb = im.getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
    if n in STANDING: anchor[1] = bb[3]
    l, t, r, b = [(bb[0] - anchor[0]) * scale, (bb[1] - anchor[1]) * scale, (bb[2] - anchor[0]) * scale, (bb[3] - anchor[1]) * scale]
    ext = [min(ext[0], l), min(ext[1], t), max(ext[2], r), max(ext[3], b)]
    print('%-12s %dx%d  left %5.0f  up %5.0f  right %4.0f  below %3.0f  height %4.0f' % (n, im.width, im.height, -l, -t, r, b, b - t))
    frames.append(dict(file=f, scale=round(scale, 6), anchor=anchor))
json.dump(dict(idleHeight=IDLE_H, frames=frames), open(root + 'frames.json', 'w'), indent=1)
print('envelope around the pivot at cell scale: left %.0f up %.0f right %.0f below %.0f' % (-ext[0], -ext[1], ext[2], ext[3]))
