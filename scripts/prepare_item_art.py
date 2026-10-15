"""Mechanical preparation only: preserve generated painting/alpha, fit to square.
Run with Pillow; no API key, downloads, repainting or background synthesis.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import hashlib, json

project = Path(__file__).resolve().parents[1]
manifest = json.loads((project / 'art/item-art-generation.json').read_text(encoding='utf-8-sig'))
source_dir = project / 'art/source/items'
evidence = project / 'docs/ui-v042-shop-slice1b'
source_dir.mkdir(parents=True, exist_ok=True)
evidence.mkdir(parents=True, exist_ok=True)
names = ['Iron Sword', 'Guardian Shield', 'Ruby Gem', 'Flame Blade', "Builder's Crown", 'Siege Hammer', 'Commander Banner']
records, portraits = [], []
for entry in manifest['assets']:
    item_id = entry['id']
    source_path = project / entry['source']
    if not source_path.exists():
        raise FileNotFoundError(f'Restore preserved generated source: {entry["source"]}')
    source = Image.open(source_path)
    if source.mode != 'RGBA':
        raise ValueError(f'{item_id}: generated PNG lacks RGBA alpha')
    alpha = source.getchannel('A')
    if alpha.getextrema() != (0, 255):
        raise ValueError(f'{item_id}: transparent surround or opaque subject missing')
    bounds = alpha.getbbox()
    if not bounds:
        raise ValueError(f'{item_id}: empty art')
    content = source.crop(bounds)
    content.thumbnail((224, 224), Image.Resampling.LANCZOS)
    output = Image.new('RGBA', (256, 256), (0, 0, 0, 0))
    output.alpha_composite(content, ((256-content.width)//2, (256-content.height)//2))
    target = project / f'public/assets/item-{item_id}.png'
    output.save(target, optimize=True)
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    records.append({'id': item_id, 'file': target.relative_to(project).as_posix(), 'source': source_path.relative_to(project).as_posix(), 'width':256, 'height':256, 'alpha':True, 'sourceSize':list(source.size), 'sourceAlphaBounds':list(bounds), 'preparedContentSize':list(content.size), 'sha256':digest(target), 'sourceSha256':digest(source_path), 'mode':'built-in image_gen; alpha-bounds contain-fit and Lanczos thumbnail only'})
    portraits.append(output)

try:
    font = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 14)
    small = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 12)
except OSError:
    font = small = ImageFont.load_default()

native = Image.new('RGB', (4*272+16, 2*296+16), '#102536')
draw = ImageDraw.Draw(native)
for i, portrait in enumerate(portraits):
    x,y = 16+(i%4)*272, 8+(i//4)*296
    for a in range(0,256,16):
        for b in range(0,256,16):
            draw.rectangle((x+a,y+b,x+a+15,y+b+15), fill='#19384c' if (a//16+b//16)%2 else '#244357')
    native.paste(portrait, (x,y), portrait)
    draw.text((x,y+262), names[i], fill='#fff3d3', font=font)
native.save(evidence / 'item-icons-native-256.png')

sizes = [32,36,40,48]
small_sheet = Image.new('RGB', (7*112+16, 5*72), '#102536')
draw = ImageDraw.Draw(small_sheet)
for i, name in enumerate(names):
    draw.text((16+i*112,8), name.replace(' ', '\n',1), fill='#fff3d3', font=small)
for row,size in enumerate(sizes):
    y = 60+row*72
    for i,portrait in enumerate(portraits):
        x = 16+i*112
        tile = portrait.resize((size,size), Image.Resampling.LANCZOS)
        small_sheet.paste(tile, (x,y), tile)
        draw.text((x+54,y+12), str(size)+'px', fill='#bdd0da', font=small)
small_sheet.save(evidence / 'item-icons-shop-sizes.png')
(project/'public/assets/item-art-metadata.json').write_text(json.dumps(records,indent=2)+'\n',encoding='utf-8')
print(json.dumps(records,indent=2))
