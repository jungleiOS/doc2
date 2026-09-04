# -*- coding: utf-8 -*-
"""《苹果折叠屏早晚》百家号封面：爱范儿 Mate XTs 展开态实拍裁剪 + PIL 居中叠字（轨道 A 可信源实拍，非官网图）。"""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '苹果折叠屏素材', '07-爱范儿MateXTs展开实拍.jpg')
OUT = os.path.join(HERE, '百家号版-苹果折叠屏早晚-封面.png')

W, H = 1800, 1200
im = Image.open(SRC).convert('RGB')  # 7007x3941
# 裁 3:2：上沿 y=550 压掉右上角 ifanr 角标水印（y<513），水平对准展开屏幕中心（原图屏幕 x≈1470-5600）
crop = im.crop((992, 550, 6079, 3941)).resize((W, H), Image.LANCZOS)
crop = ImageEnhance.Brightness(crop).enhance(0.9)

# 文字后方垂直渐变暗带（中心偏上，落在屏幕天空区，峰值 alpha≈120）
band = Image.new('L', (W, H), 0)
bd = ImageDraw.Draw(band)
CY = int(H * 0.24)
for yy in range(H):
    a = max(0.0, 1 - abs(yy - CY) / (H * 0.26))
    if a:
        bd.line([(0, yy), (W, yy)], fill=int(120 * a * a))
crop = Image.composite(Image.new('RGB', (W, H), (8, 12, 24)), crop, band)

d = ImageDraw.Draw(crop)
font_big = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 168)

lines = ['苹果折叠屏', '晚了六年？']
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
