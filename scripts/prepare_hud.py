from pathlib import Path
from PIL import Image
import json

project = Path(__file__).resolve().parents[1]
source = Image.open(project / 'art/source/hud-icons-source.png').convert('RGBA')
metadata = []
for i, name in enumerate(['gold', 'wood', 'iron', 'build', 'shop', 'army']):
    tile = source.crop((round(source.width*i/6), 0, round(source.width*(i+1)/6), source.height))
    bounds = tile.getchannel('A').point(lambda a: 255 if a > 32 else 0).getbbox()
    tile = tile.crop(bounds)
    tile.thumbnail((256, 256), Image.Resampling.LANCZOS)
    tile.save(project / f'public/assets/hud-{name}.png', optimize=True)
    metadata.append({'file': f'hud-{name}.png', 'source': 'hud-icons-source.png', 'width': tile.width, 'height': tile.height, 'alpha': True})
(project / 'public/assets/hud-metadata.json').write_text(json.dumps(metadata, indent=2))
print(json.dumps(metadata, indent=2))
