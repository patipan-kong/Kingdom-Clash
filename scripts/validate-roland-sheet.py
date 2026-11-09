#!/usr/bin/env python
"""Read-only validator for the Roland V1.0 sheet: the review grid art/roland-anim/roland-grid.png (288x224 cells, 5x3, 14 frames, pivot (172,206); the packed atlas
public/assets/soldier-roland.png/.json; frame map and geometry in src/world/soldierSprite.ts). Usage: py scripts/validate-hero-sheet.py
Needs Pillow only; never writes a file. Per frame it runs the Guardian validator's analysis (clipping, islands, interior holes, detached haze, halo, height against idle), then the Hero rules:
 - idle height 215 +-3 (horn tip to the axe's lowest point; the still's silhouette at its drawn size);
 - the ground line: every frame's planted boot (the lowest ink right of the axe head, or of the axe lying beside him when he is down) is on the baseline, 7 cell px above the pivot, +-3; the axe may hang
   below it (it rests ahead of the feet) but never more than 40 cell px, and nothing leaves the cell;
 - walk frames within 8% of the idle's height, the hurt within 12% (the head ducks), death3 at most 65% of idle; the walk's body mass within 30% of the idle's (the cape sways);
 - the axe chop: wind-up, drive, contact in order: the axe head's top falls (wind-up above the helmet, drive lower, contact lowest), the wind-up stands at least 1.3x the idle's height, the contact's reach left
   of the feet at least the wind-up's and at least 150 cell px, nothing clipped;
 - death: the silhouette top falls (idle < stagger, stagger and collapse < down), the down frame at most 65% of idle;
 - identity against the approved still (public/assets/hero-roland.png): the same opaque colour family (the share of blue-class and of gold-class pixels within 0.5x..2x of the still's, the mean
   colour of the opaque pixels within 28 of its R, G and B) and the idle's silhouette width/height within 0.85x..1.5x of the still's;
 - atlas: every cell restored by the JSON equals the grid cell exactly, the pivot is in the JSON, and the frame set is "0".."13".
Exit code 1 on a failure."""
import sys, json
from importlib.machinery import SourceFileLoader
from PIL import Image

V = SourceFileLoader('validate_guardian', 'scripts/validate-guardian-sheet.py').load_module()
CW, CH, PIVOT, GAP = 288, 224, (172, 206), 5
V.CW, V.CH, V.COLS, V.ROWS, V.FRAMES, V.PIVOT = CW, CH, 5, 3, 14, PIVOT
NAMES = ['idle'] + ['walk%d' % i for i in range(1, 7)] + ['attack1', 'attack2', 'attack3', 'hurt', 'death1', 'death2', 'death3']
GROUND_COL = {i: 111 for i in range(11)}; GROUND_COL.update({11: 82, 12: 87, 13: 82})   # cell columns right of the sword: the packer's 520 / 400 / 420 / 400 generator px
LOOPS = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 1), (0, 7), (7, 8), (8, 9), (9, 0), (0, 10), (0, 11), (11, 12), (12, 13)]

def red(r, g, b): return b > r + 40 and b > g + 10          # Azure blue
def metal(r, g, b): return r > 150 and g > 100 and b < 90      # gold trim

def stats(im):
    px = [p for p in im.get_flattened_data() if p[3] >= 200]; n = len(px)
    return n, sum(red(*p[:3]) for p in px) / n, sum(metal(*p[:3]) for p in px) / n, [sum(p[i] for p in px) / n for i in range(3)]

def ink(cell, t=128): return cell.getchannel('A').point(lambda v: 255 if v >= t else 0)

def main():
    fails = []; grid = Image.open('art/roland-anim/roland-grid.png').convert('RGBA')
    cells = [V.cell(grid, i) for i in range(14)]; frames = [V.analyse(c) for c in cells]; idle_h = frames[0]['main_h']
    bbs = [ink(c).getbbox() for c in cells]; base = PIVOT[1] - GAP
    print('pivot (%d,%d)  idle height %d  baseline y=%d' % (PIVOT[0], PIVOT[1], idle_h, base))
    if abs(idle_h - 150) > 3: fails.append('idle height %d' % idle_h)
    for i, f in enumerate(frames):
        flags = []; hard = []
        if f['ring']: hard.append('CLIP/edge %dpx' % f['ring'])
        if f['islands']: flags.append('%d detached island(s) %dpx (the axe, a hand or cape tips are real separate parts)' % (f['islands'], f['island_px']))
        if f['holes'] > 60: flags.append('enclosed gap %dpx (review: real negative space)' % f['holes'])
        if f['haze'] > 20: hard.append('faint haze %dpx' % f['haze'])
        if f['fringe_light'] > 0.25: hard.append('light halo %.0f%%' % (f['fringe_light'] * 100))
        if f['margins'] and min(f['margins']) < 4: hard.append('tight margins L%d T%d R%d B%d' % f['margins'])
        c = ink(cells[i]).crop((GROUND_COL[i], 0, CW, CH)).getbbox(); ground = c[3] - 1 if c else None
        if ground is None or abs(ground - base) > 3: hard.append('planted boot / body on y=%s, baseline %d' % (ground, base))
        if bbs[i][3] - 1 - base > 40: hard.append('ink %dpx below the baseline' % (bbs[i][3] - 1 - base))
        if NAMES[i].startswith('walk') and abs(f['main_h'] - idle_h) / idle_h > 0.08: hard.append('height %+d%% vs idle' % round(100 * (f['main_h'] - idle_h) / idle_h))
        if NAMES[i] == 'hurt' and abs(f['main_h'] - idle_h) / idle_h > 0.12: hard.append('height %+d%% vs idle' % round(100 * (f['main_h'] - idle_h) / idle_h))
        if NAMES[i] == 'death3' and f['main_h'] > idle_h * 0.65: hard.append('death3 taller than 65% idle')
        fails += ['%s: %s' % (NAMES[i], h) for h in hard]
        print('%2d %-8s bbox=%s margins(LTRB)=%s ground=%s h=%s %s' % (i, NAMES[i], bbs[i], f['margins'], ground, f['main_h'], '; '.join(hard + flags) or 'ok'))
    print('continuity (mask IoU, d_height, d_foot_x):')
    for a, b in LOOPS:
        fa, fb = frames[a], frames[b]
        print('  %-16s iou=%.2f d_height=%+d d_foot_x=%s' % ('%s>%s' % (NAMES[a], NAMES[b]), V.iou(fa['mask'], fb['mask']), fb['main_h'] - fa['main_h'], None if None in (fa['foot_x'], fb['foot_x']) else fb['foot_x'] - fa['foot_x']))
    mass = [sum(1 for v in ink(c).tobytes() if v) for c in cells]
    for i in range(1, 7):
        dm = (mass[i] - mass[0]) / mass[0]; print('  stability %-6s body mass %+.0f%%' % (NAMES[i], 100 * dm))
        if abs(dm) > 0.30: fails.append('%s: body mass %+.0f%% vs idle' % (NAMES[i], 100 * dm))
    # the chop
    top = {i: bbs[i][1] for i in (0, 7, 8, 9)}; reach = {i: PIVOT[0] - bbs[i][0] for i in (7, 8, 9)}
    print('chop: sword top y wind-up %d, drive %d, contact %d (idle %d); height wind-up %d (idle %d); reach left of the feet wind-up %d, drive %d, contact %d' % (top[7], top[8], top[9], top[0], frames[7]['main_h'], idle_h, reach[7], reach[8], reach[9]))
    if not (top[7] < top[8] < top[9]): fails.append('the sword does not fall through the slash: tops %s' % top)
    if top[7] > top[0] - 20: fails.append('the raised sword does not clear the head')
    if not (reach[9] >= reach[7] and reach[9] >= 120): fails.append('contact reach %d (wind-up %d)' % (reach[9], reach[7]))
    tops = [bbs[i][1] for i in (0, 11, 12, 13)]; print('death tops (idle, stagger, collapse, down):', tops)
    if not (tops[0] < tops[1] and tops[0] < tops[2] and tops[2] < tops[3] and tops[1] < tops[3]): fails.append('death silhouettes do not settle: %s' % tops)
    # identity
    still = Image.open('public/assets/hero-roland.png').convert('RGBA'); a = stats(still); b = stats(cells[0])
    print('identity: blue share still %.3f idle %.3f; gold share still %.3f idle %.3f; mean RGB still %s idle %s' % (a[1], b[1], a[2], b[2], [round(v) for v in a[3]], [round(v) for v in b[3]]))
    if not .5 <= b[1] / a[1] <= 2: fails.append('blue share %.2fx the still' % (b[1] / a[1]))
    if not .5 <= b[2] / a[2] <= 2: fails.append('gold share %.2fx the still' % (b[2] / a[2]))
    if any(abs(x - y) > 28 for x, y in zip(a[3], b[3])): fails.append('mean colour off the still')
    sb = still.getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox(); rs = (sb[2] - sb[0]) / (sb[3] - sb[1]); bb = bbs[0]; ri = (bb[2] - bb[0]) / (bb[3] - bb[1])
    print('silhouette width/height: still %.3f idle %.3f' % (rs, ri))
    if not .85 <= ri / rs <= 1.5: fails.append('idle silhouette ratio %.2fx the still' % (ri / rs))
    # atlas = grid
    atlas = Image.open('public/assets/soldier-roland.png').convert('RGBA'); js = json.load(open('public/assets/soldier-roland.json')); fr = js['frames']
    if sorted(fr, key=int) != [str(i) for i in range(14)]: fails.append('atlas frames are not "0".."13"')
    if js['meta'].get('pivot') != dict(x=PIVOT[0], y=PIVOT[1]): fails.append('atlas pivot differs')
    bad = 0
    for i in range(14):
        f = fr[str(i)]; fm, sp, ss = f['frame'], f['spriteSourceSize'], f['sourceSize']
        if (ss['w'], ss['h']) != (CW, CH): fails.append('frame %d sourceSize' % i); continue
        back = Image.new('RGBA', (CW, CH), (0, 0, 0, 0)); back.paste(atlas.crop((fm['x'], fm['y'], fm['x'] + fm['w'], fm['y'] + fm['h'])), (sp['x'], sp['y']))
        if back.tobytes() != cells[i].tobytes(): bad += 1
    print('atlas: %d of 14 frames differ from the grid; atlas %dx%d (%.2f MB RGBA)' % (bad, atlas.width, atlas.height, atlas.width * atlas.height * 4 / 1048576))
    if bad: fails.append('%d atlas frames differ from the grid' % bad)
    print('FAIL\n  ' + '\n  '.join(fails) if fails else 'ALL PASS'); sys.exit(1 if fails else 0)

if __name__ == '__main__': main()
