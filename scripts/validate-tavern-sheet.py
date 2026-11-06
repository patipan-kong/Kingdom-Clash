#!/usr/bin/env python
"""Validate the Tavern V1.0 sheet (art/tavern-anim/tavern-grid.png, made by scripts/pack-tavern-sheet.py) against the still public/assets/tavern.png.
Frames: 0 intact (the still at 0.75x), 1 hire door, 2 revive bell and glow, 3 damaged, 4 badly damaged, 5-7 collapse. Checks that compare pictures run at the size the
player sees (the Tavern is drawn 91 px tall: 94 x 91).
Usage: py scripts/validate-tavern-sheet.py   (exit 1 on any failure). Needs Pillow only."""
import json, sys
from PIL import Image, ImageChops, ImageFilter

CW, CH, N = 288, 278, 8
DISPLAY = (94, 91)
DOOR_D = (61, 52, 85, 82)             # the arched door and the steps' top, in displayed-size pixels (hire light may change them)
grid = Image.open('art/tavern-anim/tavern-grid.png').convert('RGBA'); cells = [grid.crop((i * CW, 0, (i + 1) * CW, CH)) for i in range(N)]
still = Image.open('public/assets/tavern.png').convert('RGBA')
meta = json.load(open('public/assets/tavern-sheet.json')); sheet = Image.open('public/assets/tavern-sheet.png').convert('RGBA')
fails = []; rows = []
def check(name, ok, detail=''):
    rows.append(('PASS' if ok else 'FAIL', name, detail)); ok or fails.append(name)
def mask(im, t=128): return im.getchannel('A').point(lambda v: 255 if v >= t else 0)
def count(m): return m.histogram()[255]
def bbox(im): return mask(im).getbbox()
def iou(a, b, box=None):
    if box: a, b = a.crop(box), b.crop(box)
    a, b = a.convert('1'), b.convert('1')
    return count(ImageChops.logical_and(a, b).convert('L')) / max(1, count(ImageChops.logical_or(a, b).convert('L')))
def halo(c): return count(ImageChops.subtract(c.getchannel('A').point(lambda v: 255 if 0 < v < 245 else 0), mask(c).filter(ImageFilter.MaxFilter(5))))
def small(im): return im.convert('RGBa').resize(DISPLAY, Image.LANCZOS).convert('RGBA')
def changed(a, b, box=None, t=40, blank=None):
    """share of a's opaque displayed-size pixels (outside `blank`) whose colour moved by more than t."""
    a, b = small(a), small(b)
    if blank:
        for im in (a, b): im.paste((0, 0, 0, 0), blank)
    pa, pb = a.load(), b.load(); n = d = 0
    for y in range(a.height):
        for x in range(a.width):
            if pa[x, y][3] >= 128:
                n += 1; q, r = pa[x, y], pb[x, y]
                if r[3] < 128 or abs(q[0] - r[0]) + abs(q[1] - r[1]) + abs(q[2] - r[2]) > t: d += 1
    return d / max(1, n)
H = lambda im: bbox(im)[3] - bbox(im)[1]
I = cells[0]; HALO = halo(I)
check('eight frames, one 288 x 278 cell each', len(cells) == 8 and grid.size == (CW * 8, CH))
for i, c in enumerate(cells):
    h = c.getchannel('A').histogram(); vis = sum(h[1:]); interior = sum(h[245:])
    check('frame %d native alpha (interior opaque)' % i, interior / vis > .8, '%.0f%% at alpha >= 245' % (100 * interior / vis))
    check('frame %d no haze, shadow, smoke or dust (soft pixels outside the silhouette <= 2x the still + 40)' % i, halo(c) <= 2 * HALO + 40, '%d px (still %d)' % (halo(c), HALO))
    bb = bbox(c); check('frame %d inside the cell' % i, bb[0] >= 0 and bb[1] >= 0 and bb[2] <= CW and bb[3] <= CH, str(bb))
ref = still.convert('RGBa').resize((CW, CH), Image.LANCZOS).convert('RGBA')
check('intact = tavern.png at 0.75x, pixel for pixel', not ImageChops.difference(I, ref).getbbox())
# ground: every frame rests on the plinth line (the building frames) or lies on it (the rubble)
for i in range(8): check('frame %d lowest row within 3 px of the still' % i, abs(bbox(cells[i])[3] - bbox(I)[3]) <= 3, 'lowest %d vs %d' % (bbox(cells[i])[3], bbox(I)[3]))
# standing frames keep the silhouette
for i, lo in ((1, .96), (2, .96), (3, .93), (4, .85)): check('frame %d silhouette IoU with intact >= %.2f' % (i, lo), iou(mask(I), mask(cells[i])) >= lo, '%.3f' % iou(mask(I), mask(cells[i])))
# plinth, barrels, bench and steps stay put while the building stands (the lower band)
for i in (1, 2, 3, 4, 5): check('frame %d plinth band (y >= 200) silhouette IoU >= 0.92 (the generator draws the plinth edge about 2 cell px = 0.7 px displayed off the still)' % i, iou(mask(I), mask(cells[i]), (0, 200, CW, CH)) >= .92, '%.3f' % iou(mask(I), mask(cells[i]), (0, 200, CW, CH)))
# hire: only the door region differs; revive: a different change elsewhere, door closed
hire_out = changed(I, cells[1], blank=DOOR_D); hire_in = changed(I, cells[1], box=None)
check('hire: outside the doorway the building is the intact one (<= 20%: the generator re-renders the whole picture, the Barracks recruiting frame is 17.9%)', hire_out <= .20, '%.3f' % hire_out)
check('hire: the doorway visibly changes (open door, warm light)', hire_in - hire_out >= .01 or hire_in >= .04, 'total %.3f, outside %.3f' % (hire_in, hire_out))
rev_door = changed(I, cells[2], blank=(0, 0, 94, 91)) ; rev_all = changed(I, cells[2])
check('revive: the glow and bell change a visible share of the building (>= 4%) but not all of it (<= 35%)', .04 <= rev_all <= .35, '%.3f' % rev_all)
check('hire and revive frames are clearly different pictures (>= 3% of pixels differ)', changed(cells[1], cells[2]) >= .03, '%.3f' % changed(cells[1], cells[2]))
dh, dr = [changed(I, cells[1], box=None, blank=None)] , [changed(I, cells[2])]
door_hire = changed(I, cells[1], blank=(0, 0, 94, 40)); door_rev_cl = changed(I, cells[2], blank=(0, 0, 94, 40))
# damage ordering
c3, c4 = changed(I, cells[3]), changed(I, cells[4])
check('damaged changes the surface visibly (>= 4%) but stays the same inn (<= 40%)', .04 <= c3 <= .40, '%.3f' % c3)
check('badly damaged changes more than damaged (and <= 80%)', c3 < c4 <= .80, 'damaged %.3f, badly %.3f' % (c3, c4))
# collapse
h = [H(c) for c in cells]
check('collapse 1 is lower than intact but still most of it (75 - 99%)', .75 * h[0] <= h[5] < .99 * h[0], '%d of %d px' % (h[5], h[0]))
check('collapse 2 is a heap (35 - 70% of the intact height, lower than collapse 1)', .35 * h[0] <= h[6] <= .70 * h[0] and h[6] < h[5], '%d px' % h[6])
check('rubble is the lowest (<= 55% of the intact height, lower than collapse 2)', h[7] <= .55 * h[0] and h[7] < h[6], '%d px' % h[7])
check('rubble stays inside the still footprint (left and right within 4 px)', bbox(cells[7])[0] >= bbox(I)[0] - 4 and bbox(cells[7])[2] <= bbox(I)[2] + 4)
# the atlas rebuilds the grid
ok = len(meta['frames']) == 8
for k, f in meta['frames'].items():
    s, fr = f['spriteSourceSize'], f['frame']; cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); cell.paste(sheet.crop((fr['x'], fr['y'], fr['x'] + fr['w'], fr['y'] + fr['h'])), (s['x'], s['y']))
    ok = ok and f['sourceSize'] == {'w': CW, 'h': CH} and not ImageChops.difference(cell, cells[int(k)]).getbbox()
check('the atlas rebuilds its grid exactly (8 frames, 288x278 cells, pivot %s)' % meta['meta'].get('pivot'), ok, '%dx%d' % sheet.size)
check('the atlas pivot is bottom-centre (144, 278)', meta['meta']['pivot'] == {'x': 144, 'y': 278})
for r in rows: print('%-4s  %-105s %s' % r)
print('%s %d/%d' % ('ALL PASS' if not fails else 'FAILED', len([r for r in rows if r[0] == 'PASS']), len(rows)))
sys.exit(1 if fails else 0)
