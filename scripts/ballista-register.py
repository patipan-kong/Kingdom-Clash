"""Register a generator output that came back on a different canvas onto the master's: the gold boss on the pedestal is the same size and place in every pose, so its bounding
box (the biggest gold blob in the lower half of the figure) fixes the scale and the offset. Used only to place a frame; no pixel is changed except by the one resampling.
Usage: import register; register.fit(image, reference) -> image on the reference's canvas."""
from PIL import Image
from collections import deque

def boss(im, ystride=3):
    im = im.convert('RGBA'); w, h = im.size; px = im.load(); st = 3
    gold = {(x, y) for y in range(0, h, st) for x in range(0, w, st) if px[x, y][3] > 200 and px[x, y][0] > 190 and px[x, y][1] > 135 and px[x, y][2] < 110}
    seen = set(); best = []
    for p in gold:
        if p in seen: continue
        q = deque([p]); seen.add(p); comp = []
        while q:
            x, y = q.popleft(); comp.append((x, y))
            for d in ((st, 0), (-st, 0), (0, st), (0, -st)):
                n = (x + d[0], y + d[1])
                if n in gold and n not in seen: seen.add(n); q.append(n)
        best.append(comp)
    best.sort(key=len, reverse=True)
    for comp in best:   # the boss is the biggest blob that is round and low; the pennant's knobs and the crank's knob are smaller
        xs = [c[0] for c in comp]; ys = [c[1] for c in comp]; bb = (min(xs), min(ys), max(xs) + st, max(ys) + st)
        if 0.7 < (bb[2] - bb[0]) / (bb[3] - bb[1]) < 1.4 and bb[2] - bb[0] > 40: return bb
    raise SystemExit('no boss found')

def fit(im, ref):
    a, b = boss(im), boss(ref); s = (b[2] - b[0]) / (a[2] - a[0]); w, h = round(im.width * s), round(im.height * s)
    small = im.convert('RGBa').resize((w, h), Image.LANCZOS).convert('RGBA')
    dx, dy = round((b[0] + b[2]) / 2 - (a[0] + a[2]) / 2 * s), round((b[1] + b[3]) / 2 - (a[1] + a[3]) / 2 * s)
    out = Image.new('RGBA', ref.size, (0, 0, 0, 0)); out.alpha_composite(small, (dx, dy)) if dx >= 0 and dy >= 0 else out.paste(small, (dx, dy)); return out, s, (dx, dy)

if __name__ == '__main__':
    import sys
    ref = Image.open(sys.argv[1]).convert('RGBA'); im = Image.open(sys.argv[2]).convert('RGBA'); print(im.size, boss(im), ref.size, boss(ref))
