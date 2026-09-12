#!/usr/bin/env python3
# 百家号版配图重制：裁切 4% 改变文件指纹 + 重新导出；封面走「实拍图 + 黄色叠字」轨道
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

SRC = "/Users/jiangjun/Documents/kimi/Workspaces/zhihu/outlines/苹果发布会渲染图"
DST = os.path.join(SRC, "百家号版")
os.makedirs(DST, exist_ok=True)

IMAGES = [
    "01-iphone-ultra-fold-open-fpt.jpg",
    "02-iphone-ultra-concept-blue.jpg",
    "03-iphone-ultra-dummy-white.jpg",
    "04-iphone-ultra-factory-leak.jpg",
    "05-iphone-fold-18pro-dummy-lineup.jpeg",
    "06-iphone18pro-dark-cherry-render.jpg",
    "07-iphone18pro-four-colors-mockup.jpg",
    "08-iphone18pro-color-dummies.jpg",
    "09-airpods-5-mockup.jpg",
    "10-apple-event-surprise-and-shine.jpg",
]

def recrop(name: str) -> None:
    """四边各裁 4%，重新导出为 jpg，改变文件指纹"""
    src_path = os.path.join(SRC, name)
    im = Image.open(src_path).convert("RGB")
    w, h = im.size
    mx, my = int(w * 0.04), int(h * 0.04)
    im = im.crop((mx, my, w - mx, h - my))
    out = os.path.join(DST, os.path.splitext(name)[0] + ".jpg")
    im.save(out, "JPEG", quality=88)
    print(f"ok {os.path.basename(out)} {im.size}")

def make_cover() -> None:
    """封面：工厂产线实拍图 3:2 裁切 + 底部渐变暗带 + 黄色叠字"""
    im = Image.open(os.path.join(SRC, "04-iphone-ultra-factory-leak.jpg")).convert("RGB")
    w, h = im.size
    # 目标 3:2（1140×760 输出）
    target_ratio = 3 / 2
    if w / h > target_ratio:
        nw = int(h * target_ratio)
        x0 = (w - nw) // 2
        im = im.crop((x0, 0, x0 + nw, h))
    else:
        nh = int(w / target_ratio)
        y0 = (h - nh) // 2
        im = im.crop((0, y0, w, y0 + nh))
    im = im.resize((1140, 760), Image.LANCZOS)

    # 底部渐变暗带（压文字区）
    band_h = 220
    overlay = Image.new("L", (1140, band_h), 0)
    for y in range(band_h):
        alpha = int(200 * (y / band_h) ** 1.2)
        ImageDraw.Draw(overlay).line([(0, y), (1140, y)], fill=alpha)
    dark = Image.new("RGB", (1140, band_h), (10, 10, 14))
    im.paste(dark, (0, 760 - band_h), overlay)

    # 黄色叠字 #FFD600 + 深色描边，水平垂直居中于暗带
    text = "苹果发布会27条预测"
    font = None
    for p in ["/System/Library/Fonts/PingFang.ttc",
              "/System/Library/Fonts/STHeiti Medium.ttc",
              "/System/Library/Fonts/Hiragino Sans GB.ttc"]:
        if os.path.exists(p):
            font = ImageFont.truetype(p, 92, index=0)
            break
    if font is None:
        raise RuntimeError("no CJK font found")
    d = ImageDraw.Draw(im)
    cx, cy = 1140 // 2, 760 - band_h // 2
    d.text((cx, cy), text, font=font, fill=(255, 214, 0),
           anchor="mm", stroke_width=6, stroke_fill=(20, 20, 24))
    out = os.path.join(DST, "cover-bjh.jpg")
    im.save(out, "JPEG", quality=90)
    print(f"ok cover-bjh.jpg {im.size}")

for n in IMAGES:
    recrop(n)
make_cover()
print("done")
