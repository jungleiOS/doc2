"""百家号版配图重制：三重变化（四边各裁3% + 宽度归一1000-1400px LANCZOS + 重编码）"""
import os
from PIL import Image

SRC = os.path.dirname(os.path.abspath(__file__))
DST = os.path.join(SRC, "bjh")
os.makedirs(DST, exist_ok=True)

FILES = [
    "apple-iphone-duo-hero.jpg",
    "padfone2-ifanr-IMG_0094.jpg",
    "surface-duo2-full.png",
    "samsung-zfold7-hinge-mydrivers.jpg",
    "huawei-mate-xts-entertainment-2x.jpg",
]

TARGET_W = 1200

for name in FILES:
    img = Image.open(os.path.join(SRC, name)).convert("RGB")
    w, h = img.size
    # 四边各裁 3%（避开主体与水印）
    cw, ch = int(w * 0.03), int(h * 0.03)
    img = img.crop((cw, ch, w - cw, h - ch))
    # 宽度归一
    new_h = round(img.height * TARGET_W / img.width)
    img = img.resize((TARGET_W, new_h), Image.LANCZOS)
    out = os.path.join(DST, os.path.splitext(name)[0] + ".jpg")
    # 重编码：jpg->jpg q85，png/webp->jpg q88
    q = 85 if name.lower().endswith(".jpg") else 88
    img.save(out, "JPEG", quality=q)
    print(f"{name}: {w}x{h} -> {img.width}x{img.height} q{q} -> {out}")
