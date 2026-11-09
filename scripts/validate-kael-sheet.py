#!/usr/bin/env python
"""Read-only validator for the Kael V1.0 sheet: the review grid art/kael-anim/kael-grid.png (280x216 cells, 5x3, 14 frames, pivot (174,192); the packed atlas
public/assets/soldier-kael.png/.json; frame map and geometry in src/world/soldierSprite.ts). Usage: py scripts/validate-kael-sheet.py
Needs Pillow only; never writes a file. Per frame it runs the Guardian validator's analysis (clipping, islands, interior holes, detached haze, halo, height against idle), then the Hero rules:
 - idle height 140 +-3 (hair to boot soles; the still's silhouette at its drawn size, 74.2 px);
 - the ground line: the lowest ink of every frame (the boots, or the body and the axes when he is down) is on the baseline, 4 cell px above the pivot, +-3, and nothing leaves the cell;
 - walk frames within 10% of the idle's height, the hurt within 12%, death3 at most 65% of idle; the walk's body mass within 30% of the idle's (the scarf sways);
 - the crossing slash: the wind-up wider than the idle (arms flung apart), the drive and the contact narrower than the wind-up (the arms close), the contact lunging past the idle's reach left of the feet;
 - death: the silhouette top falls (idle < stagger, stagger and collapse < down), the down frame at most 65% of idle;
 - identity against the approved still (public/assets/hero-kael.png): the same opaque colour family (the share of blue-class and of gold-class pixels within 0.5x..2x of the still's, the mean
   colour of the opaque pixels within 28 of its R, G and B) and the idle's silhouette width/height within 0.85x..1.5x of the still's;
 - atlas: every cell restored by the JSON equals the grid cell exactly, the pivot is in the JSON, and the frame set is "0".."13".
Exit code 1 on a failure."""
import sys, json
from importlib.machinery import SourceFileLoader
from PIL import Image

V = SourceFileLoader('validate_guardian', 'scripts/validate-guardian-sheet.py').load_module()
CW, CH, PIVOT, GAP = 288, 208, (150, 190), 4
V.CW, V.CH, V.COLS, V.ROWS, V.FRAMES, V.PIVOT = CW, CH, 5, 3, 14, PIVOT
NAMES = ['idle'] + ['walk%d' % i for i in range(1, 7)] + ['attack1', 'attack2', 'attack3', 'hurt', 'death1', 'death2', 'death3']
GROUND_COL = {i: 0 for i in range(14)}   # the lowest ink of the frame (boots, or the body and axes when down)
LOOPS = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 1), (0, 7), (7, 8), (8, 9), (9, 0), (0, 10), (0, 11), (11, 12), (12, 13)]

def red(r, g, b): return b > r + 40 and b > g + 10          # Azure blue
def metal(r, g, b): return r > 150 and g > 100 and b < 90      # gold trim

def stats(im):
    px = [p for p in im.get_flattened_data() if p[3] >= 200]; n = len(px)
    return n, sum(red(*p[:3]) for p in px) / n, sum(metal(*p[:3]) for p in px) / n, [sum(p[i] for p in px) / n for i in range(3)]

def ink(cell, t=128): return cell.getchannel('A').point(lambda v: 255 if v >= t else 0)

def main():
    fails = []; grid = Image.open('art/kael-anim/kael-grid.png').convert('RGBA')
    cells = [V.cell(grid, i) for i in range(14)]; frames = [V.analyse(c) for c in cells]; idle_h = frames[0]['main_h']
    bbs = [ink(c).getbbox() for c in cells]; base = PIVOT[1] - GAP
    print('pivot (%d,%d)  idle height %d  baseline y=%d' % (PIVOT[0], PIVOT[1], idle_h, base))
    if abs(idle_h - 140) > 3: fails.append('idle height %d' % idle_h)
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
        if NAMES[i].startswith('walk') and abs(f['main_h'] - idle_h) / idle_h > 0.10: hard.append('height %+d%% vs idle' % round(100 * (f['main_h'] - idle_h) / idle_h))
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
    # the crossing slash: wind-up arms wide, drive closing, contact crossed in front and lunging left
    wd = {i: bbs[i][2] - bbs[i][0] for i in (0, 7, 8, 9)}; reach = {i: PIVOT[0] - bbs[i][0] for i in (7, 8, 9)}
    print('slash: ink width idle %d, wind-up %d, drive %d, contact %d; reach left of the feet wind-up %d, drive %d, contact %d' % (wd[0], wd[7], wd[8], wd[9], reach[7], reach[8], reach[9]))
    if wd[7] < wd[0] * 1.1: fails.append('the wind-up is not wider than idle: %s' % wd)
    if not (wd[8] < wd[7] * 0.95 and wd[9] < wd[7] * 0.95): fails.append('the arms do not close from wind-up to drive to contact: %s' % wd)
    idle_reach = PIVOT[0] - bbs[0][0]
    if reach[9] <= idle_reach: fails.append('the contact does not lunge past the idle reach %d: %d' % (idle_reach, reach[9]))
    tops = [bbs[i][1] for i in (0, 11, 12, 13)]; print('death tops (idle, stagger, collapse, down):', tops)
    if not (tops[0] < tops[1] and tops[0] < tops[2] and tops[2] < tops[3] and tops[1] < tops[3]): fails.append('death silhouettes do not settle: %s' % tops)
    # identity
    still = Image.open('public/assets/hero-kael.png').convert('RGBA'); a = stats(still); b = stats(cells[0])
    print('identity: blue share still %.3f idle %.3f; gold share still %.3f idle %.3f; mean RGB still %s idle %s' % (a[1], b[1], a[2], b[2], [round(v) for v in a[3]], [round(v) for v in b[3]]))
    if not .5 <= b[1] / a[1] <= 2: fails.append('blue share %.2fx the still' % (b[1] / a[1]))
    if not .5 <= b[2] / a[2] <= 2: fails.append('gold share %.2fx the still' % (b[2] / a[2]))
    if any(abs(x - y) > 28 for x, y in zip(a[3], b[3])): fails.append('mean colour off the still')
    sb = still.getchannel('A').point(lambda v: 255 if v >= 128 else 0).getbbox(); rs = (sb[2] - sb[0]) / (sb[3] - sb[1]); bb = bbs[0]; ri = (bb[2] - bb[0]) / (bb[3] - bb[1])
    print('silhouette width/height: still %.3f idle %.3f' % (rs, ri))
    if not .85 <= ri / rs <= 1.5: fails.append('idle silhouette ratio %.2fx the still' % (ri / rs))
    # atlas = grid
    atlas = Image.open('public/assets/soldier-kael.png').convert('RGBA'); js = json.load(open('public/assets/soldier-kael.json')); fr = js['frames']
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
