# -*- coding: utf-8 -*-
"""《理科大学生买Mac》百家号封面：苹果官网新闻稿 M5 MacBook Air 双机侧视图裁剪 + PIL 叠字（轨道 A）。"""
from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '百家号')
SRC = os.path.join(HERE, 'raw', 'Apple-MacBook-Air-13-inch-and-15-inch-260303_big.jpg.large_2x.jpg')

W, H = 900, 600
im = Image.open(SRC).convert('RGB')
w, h = im.size  # 1960x1308，接近 3:2，裁底部 1px 即可
crop = im.crop((0, 0, w, int(w * H / W))).resize((W, H), Image.LANCZOS)

d = ImageDraw.Draw(crop)
font_big = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 88)
font_small = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 38)

# 上半幅白底留白区叠深灰大字（两行）
d.text((48, 30), '理科生买Mac', font=font_big, fill=(29, 29, 31))
d.text((48, 140), '先看课表', font=font_big, fill=(29, 29, 31))
label = '返校季实测'
bbox = d.textbbox((0, 0), label, font=font_small)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
pad = 16
d.rounded_rectangle([48, 268, 48 + tw + pad * 2, 268 + th + pad * 2], radius=(th + pad * 2) // 2, fill=(29, 29, 31))
d.text((48 + pad, 268 + pad - bbox[1]), label, font=font_small, fill=(255, 255, 255))

out = os.path.join(OUT, '百家号版-理科买Mac-封面.png')
crop.save(out, 'PNG', optimize=True)
print('saved:', out, crop.size)
