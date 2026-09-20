import json
import sys
from pathlib import Path

from PIL import Image

dir_ = Path(__file__).parent
meta = json.loads((dir_ / "_segments.json").read_text())

images = [Image.open(p) for p in meta["parts"]]
width = max(im.width for im in images)
height = sum(im.height for im in images)

out = Image.new("RGB", (width, height), (248, 249, 251))
y = 0
for im in images:
    out.paste(im, (0, y))
    y += im.height
    im.close()

out.save(meta["outputPath"])
print("stitched:", meta["outputPath"], out.size)

for p in meta["parts"]:
    Path(p).unlink()
(dir_ / "_segments.json").unlink()
print("segments cleaned")
