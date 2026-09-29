# 百家号配图重制：三重变化配方（四边各裁约3% + 宽度归一1000-1400px LANCZOS + 重编码jpg q85）
from PIL import Image
from pathlib import Path

RAW = Path(__file__).parent / "raw"
OUT = Path(__file__).parent.parent  # 问题目录根，配图平铺

JOBS = [
    # (源文件, 输出名, 目标宽度)
    ("sellcell-chart-pct.jpg", "bjh-sellcell-poster.jpg", 1200),
    ("sellcell-chart-dollar.png", "bjh-sellcell-table.jpg", 1200),
    ("iphone18pro-official-og.png", "bjh-iphone18pro-render.jpg", 1200),
    ("dzwww-huangniu-2.PNG", "bjh-huangniu-scene.jpg", 1100),
]

for src_name, dst_name, target_w in JOBS:
    src = RAW / src_name
    img = Image.open(src).convert("RGB")
    w, h = img.size
    # 四边各裁约 3%
    cx, cy = int(w * 0.03), int(h * 0.03)
    img = img.crop((cx, cy, w - cx, h - cy))
    # 宽度归一（LANCZOS）
    nw = target_w
    nh = round(img.height * nw / img.width)
    img = img.resize((nw, nh), Image.LANCZOS)
    dst = OUT / dst_name
    img.save(dst, "JPEG", quality=85)
    print(f"{src_name} {w}x{h} -> {dst_name} {nw}x{nh}")
