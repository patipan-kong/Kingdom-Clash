#!/usr/bin/env python
"""Read-only validator for the Guardian V1.0 spritesheet (the review grid art/guardian-anim/guardian-grid.png: 400x364 cells, 5x6, 29 frames, pivot (256,334); frame map in src/world/guardianSprite.ts).
Usage: py scripts/validate-guardian-sheet.py <sheet.png> [--json]
Needs Pillow only. It never writes or modifies a file. Thresholds are the constants below; they are review aids, not gameplay values."""
import sys, json
from collections import deque
from PIL import Image, ImageFilter

CW, CH, COLS, ROWS = 400, 364, 5, 6
FRAMES = 29
PIVOT = (256, 334)          # x, baseline y of the grounded sole
GUTTER = 2                  # transparent margin required inside every cell
ANY, SOLID = 8, 128         # alpha thresholds: any trace / real body
NAMES = ['idle'] + ['walk%d' % i for i in range(1, 7)] + ['attack%d' % i for i in range(1, 5)] + ['bash%d' % i for i in range(1, 5)] + ['charge1', 'charge2', 'charge3'] + ['taunt%d' % i for i in range(1, 4)] + ['protect%d' % i for i in range(1, 4)] + ['hurt', 'death1', 'death2', 'death3', 'rise']
LOOPS = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 1), (0, 7), (7, 8), (8, 9), (9, 10), (0, 11), (11, 12), (12, 13), (13, 14), (0, 15), (15, 16), (16, 17), (17, 16), (0, 18), (18, 19), (19, 20), (0, 21), (21, 22), (22, 23), (0, 24), (0, 25), (25, 26), (26, 27), (25, 28), (28, 0)]
STANDING = list(range(0, 11)) + [18, 19, 20, 24]   # idle, walk, attack, taunt, hurt: feet expected on the baseline

def cell(img, i):
    c, r = i % COLS, i // COLS
    return img.crop((c * CW, r * CH, (c + 1) * CW, (r + 1) * CH))

def analyse(im):
    a = im.getchannel('A').tobytes()
    rgb = im.convert('RGB').tobytes()
    n_any = n_solid = soft = below = ring = vfx = 0
    x0 = y0 = 10 ** 9; x1 = y1 = -1
    for y in range(CH):
        row = y * CW
        for x in range(CW):
            v = a[row + x]
            if v >= ANY:
                n_any += 1
                if x < GUTTER or y < GUTTER or x >= CW - GUTTER or y >= CH - GUTTER: ring += 1
                if y > PIVOT[1] + 2: below += 1
            if 16 < v < 230: soft += 1
            if v >= SOLID:
                n_solid += 1
                if x < x0: x0 = x
                if x > x1: x1 = x
                if y < y0: y0 = y
                if y > y1: y1 = y
                r, g, b = rgb[(row + x) * 3: (row + x) * 3 + 3]
                if b > 200 and g > 150 and b - r > 30 and r > 110: vfx += 1   # pale blue-white glow (baked slash / burst / speed lines)
    # connected components of the solid mask (8-neighbour)
    seen = bytearray(CW * CH); comps = []
    for s in range(CW * CH):
        if a[s] >= SOLID and not seen[s]:
            q = deque([s]); seen[s] = 1; area = 0; cx0 = CW; cx1 = 0; cy0 = CH; cy1 = 0
            while q:
                p = q.popleft(); area += 1; px, py = p % CW, p // CW
                cx0 = min(cx0, px); cx1 = max(cx1, px); cy0 = min(cy0, py); cy1 = max(cy1, py)
                for dy in (-1, 0, 1):
                    for dx in (-1, 0, 1):
                        nx, ny = px + dx, py + dy
                        if 0 <= nx < CW and 0 <= ny < CH:
                            n = ny * CW + nx
                            if a[n] >= SOLID and not seen[n]: seen[n] = 1; q.append(n)
            comps.append((area, (cx0, cy0, cx1, cy1)))
    comps.sort(reverse=True)
    thin = [c for c in comps if c[1][3] - c[1][1] <= 3 and c[1][2] - c[1][0] >= 150]   # 1-3 px tall, 150+ px wide = leftover grid line
    real = [c for c in comps if c not in thin]
    main = real[0] if real else (0, (0, 0, 0, 0))
    islands = [c for c in real[1:] if c[0] >= 60]
    line = len(thin); line_y = [c[1][1] for c in thin]
    if real:
        x0 = min(c[1][0] for c in real); y0 = min(c[1][1] for c in real); x1 = max(c[1][2] for c in real); y1 = max(c[1][3] for c in real)
    # fringe: semi-transparent pixels that are near-white (light halo) or near-black; haze: faint stray alpha 1..7
    fr = fl = fd = haze = 0
    for i in range(CW * CH):
        v = a[i]
        if 16 < v < 200:
            fr += 1; r, g, b = rgb[i * 3: i * 3 + 3]
            if min(r, g, b) > 215: fl += 1
            elif max(r, g, b) < 40: fd += 1
    # interior holes: non-solid pixels enclosed by the body (not reachable from the cell border through non-solid pixels) = highlights keyed out with the background
    outside = bytearray(CW * CH); q = deque()
    for x in range(CW):
        for y in (0, CH - 1):
            if a[y * CW + x] < SOLID and not outside[y * CW + x]: outside[y * CW + x] = 1; q.append(y * CW + x)
    for y in range(CH):
        for x in (0, CW - 1):
            if a[y * CW + x] < SOLID and not outside[y * CW + x]: outside[y * CW + x] = 1; q.append(y * CW + x)
    while q:
        p_ = q.popleft(); px, py = p_ % CW, p_ // CW
        for nx, ny in ((px + 1, py), (px - 1, py), (px, py + 1), (px, py - 1)):
            if 0 <= nx < CW and 0 <= ny < CH:
                n_ = ny * CW + nx
                if a[n_] < SOLID and not outside[n_]: outside[n_] = 1; q.append(n_)
    holes = sum(1 for i in range(CW * CH) if a[i] < SOLID and not outside[i])
    # haze: faint alpha (1..7) detached from the body, i.e. more than 3 px from any pixel of alpha 8+ (resampled edges are not haze)
    near = Image.frombytes('L', (CW, CH), bytes(255 if v >= ANY else 0 for v in a)).filter(ImageFilter.MaxFilter(7)).tobytes()
    haze = sum(1 for i in range(CW * CH) if 0 < a[i] < ANY and not near[i])
    foot_x = None
    if y1 >= 0:
        xs = [x for y in range(max(y0, y1 - 5), y1 + 1) for x in range(CW) if a[y * CW + x] >= SOLID]
        foot_x = round(sum(xs) / len(xs)) if xs else None
    return dict(solid=n_solid, any=n_any, bbox=(x0, y0, x1, y1) if y1 >= 0 else None, ring=ring, below=below, soft=round(soft / max(1, n_solid), 3), vfx=vfx,
                main_bbox=main[1], main_h=main[1][3] - main[1][1] + 1 if comps else 0, islands=len(islands), island_px=sum(c[0] for c in islands),
                holes=holes, gridline_rows=line, line_y=line_y, haze=haze, fringe_light=round(fl / max(1, fr), 3), fringe_dark=round(fd / max(1, fr), 3), margins=(main[1][0], main[1][1], CW - 1 - max([c[1][2] for c in real] or [0]), CH - 1 - y1) if real else None, bottom=y1, foot_x=foot_x, mask=a)

def iou(a, b):
    i = u = 0
    for p, q in zip(a, b):
        pa, qa = p >= SOLID, q >= SOLID
        if pa and qa: i += 1
        if pa or qa: u += 1
    return i / u if u else 1

def main():
    path = sys.argv[1]; as_json = '--json' in sys.argv
    img = Image.open(path)
    out = dict(file=path, size=img.size, mode=img.mode)
    ok = img.size == (CW * COLS, CH * ROWS) and img.mode == 'RGBA'
    A = img.convert('RGBA').getchannel('A').tobytes()
    zero = A.count(0); full = A.count(255); n = len(A)
    out['alpha'] = dict(transparent=round(zero / n, 4), opaque=round(full / n, 4), partial=round(1 - (zero + full) / n, 4), min=min(A), max=max(A))
    out['dimensions_ok'] = ok
    frames = [analyse(cell(img, i)) for i in range(FRAMES)]
    empty = analyse(cell(img, FRAMES))
    out['reserved_cell_empty'] = empty['any'] == 0
    idle_h = frames[0]['main_h']; fails = []; rows = []
    for i, f in enumerate(frames):
        flags = []
        if f['ring']: flags.append('CLIP/edge %dpx' % f['ring'])
        if f['below']: flags.append('ink below baseline %dpx' % f['below'])
        if f['islands']: flags.append('%d detached island(s) %dpx' % (f['islands'], f['island_px']))
        if f['vfx'] > 600: flags.append('baked glow %dpx' % f['vfx'])
        if f['soft'] > 0.10: flags.append('soft alpha %.0f%%' % (f['soft'] * 100))
        if f['gridline_rows']: flags.append('grid line at y=%s' % f['line_y'])
        if f['holes'] > 150: flags.append('INTERIOR HOLES %dpx (%.1f%% of body)' % (f['holes'], 100 * f['holes'] / max(1, f['solid'])))
        if f['haze'] > 50: flags.append('faint haze %dpx' % f['haze'])
        if f['fringe_light'] > 0.25: flags.append('light halo %.0f%%' % (f['fringe_light'] * 100))
        if f['margins'] and min(f['margins']) < 6: flags.append('tight margins L%d T%d R%d B%d' % f['margins'])
        if i in STANDING and f['bottom'] >= 0 and abs(f['bottom'] - PIVOT[1]) > 3: flags.append('feet off baseline by %+d' % (f['bottom'] - PIVOT[1]))
        if (NAMES[i].startswith('walk') or NAMES[i] == 'hurt') and idle_h and abs(f['main_h'] - idle_h) / idle_h > 0.12: flags.append('height %+d%% vs idle' % round(100 * (f['main_h'] - idle_h) / idle_h))
        if NAMES[i] == 'death3' and f['main_h'] > idle_h * 0.65: flags.append('death3 taller than 65% idle')
        rows.append((i, NAMES[i], f['bbox'], f['bottom'], f['main_h'], f['foot_x'], flags, f['margins']))
    out['frames'] = [dict(i=r[0], name=r[1], bbox=r[2], bottom=r[3], height=r[4], foot_x=r[5], flags=r[6]) for r in rows]
    cont = []
    for a, b in LOOPS:
        fa, fb = frames[a], frames[b]
        cont.append(dict(pair='%s>%s' % (NAMES[a], NAMES[b]), iou=round(iou(fa['mask'], fb['mask']), 2), d_bottom=(fb['bottom'] - fa['bottom']), d_height=(fb['main_h'] - fa['main_h']),
                         d_foot_x=None if None in (fa['foot_x'], fb['foot_x']) else fb['foot_x'] - fa['foot_x']))
    out['continuity'] = cont
    if as_json: print(json.dumps(out, indent=1)); return
    print('%s  %dx%d %s  dims_ok=%s  reserved_cell_empty=%s' % (path, img.size[0], img.size[1], img.mode, ok, out['reserved_cell_empty']))
    print('alpha: transparent %.1f%%, opaque %.1f%%, partial %.1f%%, range %d-%d' % (out['alpha']['transparent'] * 100, out['alpha']['opaque'] * 100, out['alpha']['partial'] * 100, out['alpha']['min'], out['alpha']['max']))
    print('pivot (%d,%d)  idle height %d' % (PIVOT[0], PIVOT[1], idle_h))
    for r in rows: print('%2d %-8s bbox=%s margins(LTRB)=%s bottom=%s h=%s %s' % (r[0], r[1], r[2], r[7], r[3], r[4], '; '.join(r[6]) if r[6] else 'ok'))
    print('continuity (mask IoU at pivot, d_bottom, d_height, d_foot_x):')
    for c in cont: print('  %-16s iou=%.2f d_bottom=%+d d_height=%+d d_foot_x=%s' % (c['pair'], c['iou'], c['d_bottom'], c['d_height'], c['d_foot_x']))

if __name__ == '__main__': main()
