# -*- coding: utf-8 -*-
"""《iPad涨价学生党还要等吗》百家号封面：苹果官网新闻稿 hero 图裁剪 + PIL 叠字（轨道 A）。"""
from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '百家号')
SRC = os.path.join(HERE, 'raw', 'Apple-iPad-Air-hero-250304_big.jpg.large_2x.jpg')

W, H = 900, 600
im = Image.open(SRC).convert('RGB')
w, h = im.size  # 1960x1102
# 裁 3:2：保留全高，水平取右侧（iPad 群偏右下，左上限速蓝渐变留白叠字）
cw = int(h * W / H)  # 1653
crop = im.crop((w - cw, 0, w, h)).resize((W, H), Image.LANCZOS)

d = ImageDraw.Draw(crop)
font_big = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 96)
font_small = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 40)

# 主标题两行：白字 + 半透明深蓝圆角底板（压在屏幕画面上保证信息流小图对比度）
overlay = Image.new('RGBA', crop.size, (0, 0, 0, 0))
od = ImageDraw.Draw(overlay)
lines = ['iPad涨价', '学生党别等']
pad_x, pad_y, gap = 26, 14, 12
y = 44
boxes = []
for line in lines:
    bbox = d.textbbox((0, 0), line, font=font_big)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    od.rounded_rectangle([40, y, 40 + tw + pad_x * 2, y + th + pad_y * 2], radius=18, fill=(11, 45, 110, 215))
    boxes.append((line, bbox, y, th))
    y += th + pad_y * 2 + gap
crop.paste(overlay, (0, 0), overlay)
for line, bbox, ly, th in boxes:
    d.text((40 + pad_x, ly + pad_y - bbox[1]), line, font=font_big, fill=(255, 255, 255))

# 副标：深蓝字白底胶囊
label = '返校季实测'
bbox = d.textbbox((0, 0), label, font=font_small)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
pad = 18
d.rounded_rectangle([40, y + 10, 40 + tw + pad * 2, y + 10 + th + pad * 2], radius=(th + pad * 2) // 2, fill=(255, 255, 255))
d.text((40 + pad, y + 10 + pad - bbox[1]), label, font=font_small, fill=(11, 45, 110))

out = os.path.join(OUT, '百家号版-iPad涨价学生党-封面.png')
crop.save(out, 'PNG', optimize=True)
print('saved:', out, crop.size)
