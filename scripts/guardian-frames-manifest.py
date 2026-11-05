#!/usr/bin/env python
"""Write art/guardian-anim/frames.json for scripts/pack-guardian-sheet.py and print each frame's extent around the feet pivot at cell scale.
Usage: py scripts/guardian-frames-manifest.py [idle-height-in-cell]
Every frame is an edit of art/guardian-anim/ref/canvas-template.png (1600 px wide, the approved Guardian standing on the ground line y=1180, his feet midpoint at x=866.5); the
generator returns the same canvas shape at its own size, so one scale and one anchor per frame follow from the output width alone. Read-only on the PNGs."""
import sys, json, os
from PIL import Image

TEMPLATE_W, FEET, REF_H = 1600, (866.5, 1180), 688   # template width, feet midpoint on the ground line (x measured on the generated idle: its outer sole edges centre 6.5 px right of the reference), the reference's standing height (template px)
IDLE_H = float(sys.argv[1]) if len(sys.argv) > 1 else 210
NAMES = ['00-idle'] + ['%02d-walk%d' % (i, i) for i in range(1, 7)] + ['%02d-attack%d' % (6 + i, i) for i in range(1, 5)] + ['%02d-bash%d' % (10 + i, i) for i in range(1, 5)] + \
        ['15-charge1', '16-charge2', '17-charge3', '18-taunt1', '19-taunt2', '20-taunt3', '21-protect1', '22-protect2', '23-protect3', '24-hurt', '25-death1', '26-death2', '27-death3', '28-rise']
root = 'art/guardian-anim/'
frames = []; ext = [0, 0, 0, 0]
for n in NAMES:
    f = 'frames/%s.png' % n; im = Image.open(root + f); k = im.width / TEMPLATE_W
    scale = IDLE_H / (REF_H * k); anchor = [round(FEET[0] * k, 2), round(FEET[1] * k, 2)]
    bb = im.getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox()
    l, t, r, b = [(bb[0] - anchor[0]) * scale, (bb[1] - anchor[1]) * scale, (bb[2] - anchor[0]) * scale, (bb[3] - anchor[1]) * scale]
    ext = [min(ext[0], l), min(ext[1], t), max(ext[2], r), max(ext[3], b)]
    print('%-12s %dx%d  left %5.0f  up %5.0f  right %4.0f  below %3.0f' % (n, im.width, im.height, -l, -t, r, b))
    frames.append(dict(file=f, scale=round(scale, 6), anchor=anchor))
json.dump(dict(idleHeight=IDLE_H, frames=frames), open(root + 'frames.json', 'w'), indent=1)
print('envelope around the pivot at cell scale: left %.0f up %.0f right %.0f below %.0f' % (-ext[0], -ext[1], ext[2], ext[3]))
