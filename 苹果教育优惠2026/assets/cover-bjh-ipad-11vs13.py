# -*- coding: utf-8 -*-
"""《iPad11寸还是13寸》百家号封面：苹果官网 M4 iPad Air 新闻稿妙控键盘定妆图裁剪 + PIL 叠字（轨道 A）。"""
from PIL import Image, ImageDraw, ImageFont
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '百家号')
SRC = os.path.join(HERE, 'raw', 'Apple-iPad-Air-M4-Magic-Keyboard-with-Apple-Pencil-Pro-260302_big.jpg.large_2x.jpg')

W, H = 900, 600
im = Image.open(SRC).convert('RGB')
w, h = im.size  # 1960x1104
# 裁 3:2：保留全高，水平从 x=100 起取 1656（左侧产品完整保留，右侧大面积白底留白叠字）
cw = int(h * W / H)  # 1656
crop = im.crop((100, 0, 100 + cw, h)).resize((W, H), Image.LANCZOS)

d = ImageDraw.Draw(crop)
font_big = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 76)
font_small = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 40)

# 右侧留白区：crop 内 x 750-1656，缩放比 900/1656=0.543，即 resize 后 x 353-900，中心 626
ZONE_CX = 626
BLUE = (11, 45, 110)

# 主标题两行：深蓝字直接压白底（底图右侧为纯白，无需底板）
lines = ['iPad买11寸', '还是13寸？']
y = 96
for line in lines:
    bbox = d.textbbox((0, 0), line, font=font_big)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((ZONE_CX - tw / 2 - bbox[0], y - bbox[1]), line, font=font_big, fill=BLUE)
    y += th + 26

# 副标：白字深蓝底胶囊，居中于留白区
label = '返校季实测'
bbox = d.textbbox((0, 0), label, font=font_small)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
pad = 20
capsule_w = tw + pad * 2
capsule_h = th + pad * 2
cx0 = ZONE_CX - capsule_w / 2
cy0 = y + 18
d.rounded_rectangle([cx0, cy0, cx0 + capsule_w, cy0 + capsule_h], radius=capsule_h // 2, fill=BLUE)
d.text((cx0 + pad - bbox[0], cy0 + pad - bbox[1]), label, font=font_small, fill=(255, 255, 255))

out = os.path.join(OUT, '百家号版-iPad11寸还是13寸-封面.png')
crop.save(out, 'PNG', optimize=True)
print('saved:', out, crop.size)
