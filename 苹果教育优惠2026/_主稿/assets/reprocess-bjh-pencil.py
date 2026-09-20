# -*- coding: utf-8 -*-
"""《iPad Pencil 有必要买吗》百家号配图重制：3 张正文图重裁调色改指纹 + 信息流封面（轨道 A 少数派实拍 + PIL 叠字）。
须用 .venv-md/bin/python3 运行（系统 python3 无 PIL）。幂等可重跑。"""
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import os

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, '..', '知乎', 'cover-assets', 'raw', 'iPadPencil评测')
OUT = os.path.join(HERE, '..', '百家号')

def recolor(im):
    """统一调色：轻微暖化 + 对比，改变文件指纹并与知乎原图区隔。"""
    im = ImageEnhance.Color(im).enhance(1.06)
    im = ImageEnhance.Contrast(im).enhance(1.04)
    im = ImageEnhance.Brightness(im).enhance(0.98)
    return im

# 1. 手写笔记场景：03-Goodnotes-writing-scene.jpg (336x437)
# 裁掉外圈白边与圆角黑框，聚焦笔记内容区，2x 缩放重导出
im = Image.open(os.path.join(RAW, '03-Goodnotes-writing-scene.jpg')).convert('RGB')
crop = im.crop((12, 14, 324, 426))  # 312x412 内容区
crop = crop.resize((624, 824), Image.LANCZOS)
crop = recolor(crop)
crop.save(os.path.join(OUT, '百家号版-iPadPencil有必要买吗-手写笔记场景.png'), 'PNG', optimize=True)
print('saved 手写笔记场景', crop.size)

# 2. Pencil Pro 实拍：04-sspai-pencil-1.jpg (1120x840)
# 原图为笔+iPad 全景横构图；重裁为聚焦笔身「Pencil Pro」刻字区的偏方形构图
im = Image.open(os.path.join(RAW, '04-sspai-pencil-1.jpg')).convert('RGB')
crop = im.crop((0, 40, 720, 760))  # 720x720 方形，含刻字与笔尖走向
crop = crop.resize((880, 880), Image.LANCZOS)
crop = recolor(crop)
crop.save(os.path.join(OUT, '百家号版-iPadPencil有必要买吗-PencilPro实拍.png'), 'PNG', optimize=True)
print('saved PencilPro实拍', crop.size)

# 3. 两款对比实拍：06-sspai-pencil-3.jpg (1120x840)
# 重裁聚焦左下双笔 + 双摄模组区域，去掉右侧大面积留白保护壳
im = Image.open(os.path.join(RAW, '06-sspai-pencil-3.jpg')).convert('RGB')
crop = im.crop((0, 90, 900, 840))  # 900x750
crop = crop.resize((1000, 833), Image.LANCZOS)
crop = recolor(crop)
crop.save(os.path.join(OUT, '百家号版-iPadPencil有必要买吗-两款对比实拍.png'), 'PNG', optimize=True)
print('saved 两款对比实拍', crop.size)

# 4. 信息流封面：04 重裁 3:2 + 居中叠字「Pencil有必要买吗」（11 字）
W, H = 1200, 800
im = Image.open(os.path.join(RAW, '04-sspai-pencil-1.jpg')).convert('RGB')
crop = im.crop((0, 70, 1120, 817)).resize((W, H), Image.LANCZOS)  # 1120x747 ≈ 3:2
crop = ImageEnhance.Brightness(crop).enhance(0.90)

# 文字后方垂直渐变暗带（画面中心，峰值 alpha≈115）
band = Image.new('L', (W, H), 0)
bd = ImageDraw.Draw(band)
CY = H // 2
for yy in range(H):
    a = max(0.0, 1 - abs(yy - CY) / (H * 0.30))
    if a:
        bd.line([(0, yy), (W, yy)], fill=int(115 * a * a))
crop = Image.composite(Image.new('RGB', (W, H), (10, 12, 18)), crop, band)

d = ImageDraw.Draw(crop)
font = ImageFont.truetype('/System/Library/Fonts/STHeiti Medium.ttc', 104)
text = 'Pencil有必要买吗'
b = d.textbbox((0, 0), text, font=font, stroke_width=6)
tw, th = b[2] - b[0], b[3] - b[1]
d.text(((W - tw) / 2 - b[0], CY - th / 2 - b[1]), text, font=font,
       fill=(255, 214, 0), stroke_width=6, stroke_fill=(10, 14, 24))
crop.save(os.path.join(OUT, '百家号版-iPadPencil有必要买吗-封面.png'), 'PNG', optimize=True)
print('saved 封面', crop.size)
