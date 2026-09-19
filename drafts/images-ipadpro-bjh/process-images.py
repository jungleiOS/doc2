# 百家号配图指纹变更处理
# 四边各裁 3% → 宽度统一到 1000-1400px → 统一编码为 JPG
# webp 源按质量 88 出，jpg 源重新编码质量 85
# 用法：.venv-md/bin/python3 process-images.py

from PIL import Image
from pathlib import Path

SRC = Path('../images-ipadpro')
OUT = Path('.')

# (源文件, 输出文件, 质量)
JOBS = [
    ('ipadpro-numbers-notebookcheck.webp', 'numbers-notebookcheck-bjh.jpg', 88),
    ('fcp-ipad-multicam-apple.jpg',        'fcp-multicam-apple-bjh.jpg',    85),
    ('ipadpro-stagemanager-apple.webp',    'stagemanager-apple-bjh.jpg',    88),
    ('ipadpro-magickeyboard-ithome.jpg',   'magickeyboard-ithome-bjh.jpg',  85),
]

TARGET_WIDTH = 1200  # 小图（stagemanager）例外缩放到 1000

for src_name, out_name, quality in JOBS:
    img = Image.open(SRC / src_name).convert('RGB')
    w, h = img.size
    # 四边各裁 3%
    dx, dy = int(w * 0.03), int(h * 0.03)
    img = img.crop((dx, dy, w - dx, h - dy))
    # 宽度归一：大图降到 1200，小于 1000 的小图升到 1000
    cw, _ = img.size
    target = TARGET_WIDTH if cw >= TARGET_WIDTH else 1000
    img = img.resize((target, round(img.size[1] * target / cw)), Image.LANCZOS)
    out_path = OUT / out_name
    img.save(out_path, 'JPEG', quality=quality, optimize=True, progressive=True)
    print(f'{out_name}: {img.size[0]}x{img.size[1]} q{quality}')
