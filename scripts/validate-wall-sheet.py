#!/usr/bin/env python
"""Validate the Wall V1.0 sheet (art/wall-anim/wall-grid.png, made by scripts/pack-wall-sheet.py) against the still public/assets/wall.png.
Usage: py scripts/validate-wall-sheet.py   (exit 1 on any failure). Needs Pillow only."""
import json, sys
from PIL import Image, ImageChops, ImageFilter

CW, CH, N = 256, 232, 7
PIVOT = (128, 224); WALL = (PIVOT[0] - 88, PIVOT[1] - 192)
POST1, POST5 = (43, 77), (178, 215)        # the end stakes' columns in the cell (the gate posts)
GAP = (82, 172, 150, 224)                 # between the posts, below the swung-back leaf
ROW = round(48 * 0.72 * 192 / 60)         # frostGateRowOffset / cliffGateRowOffset
grid = Image.open('art/wall-anim/wall-grid.png').convert('RGBA'); cells = [grid.crop((i * CW, 0, (i + 1) * CW, CH)) for i in range(N)]
still = Image.open('public/assets/wall.png').convert('RGBA')
fails = []; rows = []
def check(name, ok, detail=''):
    rows.append(('PASS' if ok else 'FAIL', name, detail)); ok or fails.append(name)
def mask(im, t=128): return im.getchannel('A').point(lambda v: 255 if v >= t else 0)
def count(m, box=None):
    m = m.crop(box) if box else m; return m.histogram()[255]
def iou(a, b): return count(ImageChops.logical_and(a.convert('1'), b.convert('1')).convert('L')) / max(1, count(ImageChops.logical_or(a.convert('1'), b.convert('1')).convert('L')))
def bbox(im): return mask(im).getbbox()
def frost(l): return (min(255, l * .6 + 95), min(255, l * .72 + 125), min(255, l * .7 + 165))
def cliff(l): return (min(255, l * .85 + 42), min(255, l * .5 + 22), min(255, l * .45 + 24))
def recolour(im, fn):   # the stills' frostGatePixels / cliffGatePixels (Uint8ClampedArray rounds; truncation is close enough to compare like with like)
    out = im.copy(); px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a: l = .3 * r + .59 * g + .11 * b; px[x, y] = tuple(int(round(v)) for v in fn(l)) + (a,)
    return out
def stack(im, n):
    out = Image.new('RGBA', (im.width, im.height + (n - 1) * ROW), (0, 0, 0, 0))
    for i in range(n): out.alpha_composite(im, (0, i * ROW))
    return out

I = cells[0]; base = bbox(I)[3]
def halo(c): return count(ImageChops.subtract(c.getchannel('A').point(lambda v: 255 if 0 < v < 245 else 0), mask(c).filter(ImageFilter.MaxFilter(5))))
HALO = halo(I)   # the still's own soft edge (its 0.45 Lanczos): a painted shadow or dust would add thousands of soft pixels
# native alpha: the generator's own alpha, opaque interior, no colour key
for i, c in enumerate(cells):
    h = c.getchannel('A').histogram(); vis = sum(h[1:]); interior = sum(h[245:])
    check('frame %d native alpha (interior opaque)' % i, interior / vis > .8, '%.0f%% of visible pixels at alpha >= 245' % (100 * interior / vis))
    check('frame %d no haze, shadow or dust (soft pixels > 2 px outside the silhouette <= 2x the still)' % i, halo(c) <= 2 * HALO, '%d px (still %d)' % (halo(c), HALO))
    bb = c.getchannel('A').point(lambda v: 255 if v >= 8 else 0).getbbox()
    check('frame %d inside the cell (2 px gutter)' % i, bb[0] >= 2 and bb[1] >= 2 and bb[2] <= CW - 2 and bb[3] <= CH - 2, str(bb))
# intact is the still
d = ImageChops.difference(I.crop((WALL[0], WALL[1], WALL[0] + 176, WALL[1] + 192)), still); mx = max(v[1] for v in d.getextrema())
outside = count(I.getchannel('A').point(lambda v: 255 if v else 0)) - count(still.getchannel('A').point(lambda v: 255 if v else 0))
check('intact = wall.png pixel for pixel, at the still\'s place', mx == 0 and outside == 0, 'max channel diff %d, extra pixels %d' % (mx, outside))
check('intact bottom centre on the pivot', base == PIVOT[1] and WALL[0] + 88 == PIVOT[0], 'base row %d' % base)
for n, fn, name in ((2, frost, 'Frost Gate'), (3, cliff, 'Cliff / Throne Gate')):
    a, b = stack(recolour(I.crop((WALL[0], WALL[1], WALL[0] + 176, WALL[1] + 192)), fn), n), recolour(stack(still, n), fn)
    check('%s: %d intact rows, recoloured, = today\'s stacked texture' % (name, n), not ImageChops.difference(a, b).getbbox(), '%dx%d' % a.size)
# damage states keep the outline and the base
for i, need, name in ((1, .95, 'damaged'), (2, .90, 'badly damaged')):
    c = cells[i]; best = max(((iou(mask(I), ImageChops.offset(mask(c), dx, dy)), dx, dy) for dx in range(-3, 4) for dy in range(-3, 4)))
    v = iou(mask(I), mask(c)); bb = bbox(c)
    check('%s silhouette IoU >= %.2f' % (name, need), v >= need, 'IoU %.3f' % v)
    check('%s registered (best IoU at no shift)' % name, best[1:] == (0, 0) or best[0] - v < .005, 'best %.3f at %+d,%+d' % best)
    ends = min(iou(mask(I).crop((x0, 0, x1, CH)), mask(c).crop((x0, 0, x1, CH))) for x0, x1 in (POST1, POST5))
    check('%s same base, end stakes in place (IoU >= 0.9 in their columns)' % name, abs(bb[3] - base) <= 1 and ends >= .9, 'base %d, end stakes IoU %.3f (outline incl. arrows %s)' % (bb[3], ends, bb))
# collapse: on the ground line, lower than the wall
for i, name in ((3, 'breaking'), (4, 'rubble')):
    bb = bbox(cells[i]); check('%s on the ground line' % name, abs(bb[3] - base) <= 1, 'lowest row %d' % bb[3])
    check('%s top lower than the intact wall' % name, bb[1] > bbox(I)[1], 'top %d vs %d' % (bb[1], bbox(I)[1]))
check('rubble is a low heap (<= 45% of the wall height)', (bbox(cells[4])[3] - bbox(cells[4])[1]) <= .45 * (base - bbox(I)[1]), 'height %d' % (bbox(cells[4])[3] - bbox(cells[4])[1]))
# gate: the end posts stay, the passage opens
for i, name in ((5, 'ajar'), (6, 'open')):
    c = cells[i]; bb = bbox(c)
    check('%s same base' % name, abs(bb[3] - base) <= 1, 'lowest row %d' % bb[3])
    p1 = iou(mask(I).crop((POST1[0], 0, POST1[1], CH)), mask(c).crop((POST1[0], 0, POST1[1], CH)))
    check('%s left post unchanged (IoU >= 0.9 in its columns)' % name, p1 >= .9, 'IoU %.3f' % p1)
    keep = ImageChops.logical_and(mask(I).crop((POST5[0], 0, POST5[1], CH)).convert('1'), mask(c).crop((POST5[0], 0, POST5[1], CH)).convert('1')).convert('L')
    cover = count(keep) / count(mask(I).crop((POST5[0], 0, POST5[1], CH)))
    check('%s right post (the hinge) still covered >= 90%%' % name, cover >= .9, '%.0f%%' % (100 * cover))
    clear = 1 - count(mask(c, 64), GAP) / ((GAP[2] - GAP[0]) * (GAP[3] - GAP[1]))
    rows.append(('INFO', '%s passage clear' % name, '%.0f%% transparent between the posts' % (100 * clear)))
    if i == 6: check('open: the passage between the posts is >= 70% transparent', clear >= .7, '%.0f%%' % (100 * clear))
    if i == 5: check('ajar: the passage is partly open (more than closed, less than open)', count(mask(c, 64), GAP) < count(mask(I, 64), GAP), '')
# the atlas matches the grid
atlas = json.load(open('public/assets/wall-wood.json')); sheet = Image.open('public/assets/wall-wood.png').convert('RGBA')
ok = len(atlas['frames']) == N
for k, f in atlas['frames'].items():
    s, fr = f['spriteSourceSize'], f['frame']; cell = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); cell.paste(sheet.crop((fr['x'], fr['y'], fr['x'] + fr['w'], fr['y'] + fr['h'])), (s['x'], s['y']))
    ok = ok and f['sourceSize'] == {'w': CW, 'h': CH} and not ImageChops.difference(cell, cells[int(k)]).getbbox()
check('atlas frames rebuild the grid exactly (7 frames, 256x232 cells)', ok, '%dx%d' % sheet.size)
for r in rows: print('%-4s  %-70s %s' % r)
print('%s %d/%d' % ('ALL PASS' if not fails else 'FAILED', len([r for r in rows if r[0] == 'PASS']), len([r for r in rows if r[0] != 'INFO'])))
sys.exit(1 if fails else 0)
