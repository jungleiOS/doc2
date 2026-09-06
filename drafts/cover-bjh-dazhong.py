# -*- coding: utf-8 -*-
"""《苹果折叠屏走向大众》百家号封面：9to5Google Z Fold7 折痕实拍裁剪 + PIL 居中叠字（轨道 A 可信源实拍，非官网图）。"""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '苹果折叠屏素材', '09-三星ZFold7折痕特写.jpg')
OUT = os.path.join(HERE, '百家号版-苹果折叠屏走向大众-封面.png')

W, H = 1800, 1200
im = Image.open(SRC).convert('RGB')  # 2000x1000
# 裁 3:2：取 x 250-1750 双机完整构图（左 Fold7 折痕机 + 右 Fold8 Ultra 对照），同时切掉右下角 9to5Google 水印（x>1880）
crop = im.crop((250, 0, 1750, 1000)).resize((W, H), Image.LANCZOS)
crop = ImageEnhance.Brightness(crop).enhance(0.88)

# 文字后方垂直渐变暗带（中心偏下 y=0.68H，落在双机屏幕下半部的深色无品牌文字区，峰值 alpha≈115）
band = Image.new('L', (W, H), 0)
bd = ImageDraw.Draw(band)
CY = int(H * 0.68)
for yy in range(H):
    a = max(0.0, 1 - abs(yy - CY) / (H * 0.30))
    if a:
        bd.line([(0, yy), (W, yy)], fill=int(115 * a * a))
crop = Image.composite(Image.new('RGB', (W, H), (8, 12, 24)), crop, band)

d = ImageDraw.Draw(crop)
font_big = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 168)

lines = ['折叠屏', '能走向大众吗']
gap = 40
boxes = [d.textbbox((0, 0), t, font=font_big, stroke_width=8) for t in lines]
block_h = sum(b[3] - b[1] for b in boxes) + gap
y = CY - block_h // 2
for t, b in zip(lines, boxes):
    tw, th = b[2] - b[0], b[3] - b[1]
    d.text(((W - tw) / 2 - b[0], y - b[1]), t, font=font_big,
           fill=(255, 255, 255), stroke_width=8, stroke_fill=(10, 15, 30))
    y += th + gap

crop.save(OUT, 'PNG', optimize=True)
print('saved:', OUT, crop.size)
