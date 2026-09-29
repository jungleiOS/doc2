# 百家号版配图重制：三重变化（四边各裁约3% + 宽度归一1000-1400px LANCZOS + 重编码）
import os
from PIL import Image

SRC_DIR = "cover-assets/raw"
OUT_DIR = "cover-assets/bjh"
os.makedirs(OUT_DIR, exist_ok=True)

# 源稿 5 张配图（与知乎版一一对应），输出统一 jpg
files = [
    "发布会-iPhoneDuo-title.png",
    "内部结构-铰链支撑筋.png",
    "发布会-内外屏对比.png",
    "官方渲染-折叠展开双机.png",
    "官方渲染-展开桌面.jpg",
]

for name in files:
    src = os.path.join(SRC_DIR, name)
    im = Image.open(src).convert("RGB")
    w, h = im.size
    # 四边各裁约 3%
    cw, ch = int(w * 0.03), int(h * 0.03)
    im = im.crop((cw, ch, w - cw, h - ch))
    # 宽度归一到 1000-1400px
    target_w = 1280
    nw, nh = target_w, round(im.height * target_w / im.width)
    im = im.resize((nw, nh), Image.LANCZOS)
    out = os.path.join(OUT_DIR, os.path.splitext(name)[0] + ".jpg")
    im.save(out, "JPEG", quality=88, optimize=True)
    print(f"{name}: {w}x{h} -> {nw}x{nh} -> {out} ({os.path.getsize(out)//1024}KB)")
