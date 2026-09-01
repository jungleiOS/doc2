# -*- coding: utf-8 -*-
"""百家号版实拍图重处理：重新裁剪构图 + 缩放 + PNG 重导出（改变文件指纹）。"""
from PIL import Image, ImageEnhance
import os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..')

def save(im, name):
    path = os.path.join(OUT, name)
    im.save(path, 'PNG', optimize=True)
    print('saved:', path, im.size)

# 1. Apple Store 店内海报实拍：600x400 -> 切掉边缘聚焦两台手机与二维码立牌，放大到 1080 宽
im = Image.open(os.path.join(HERE, 'shots', 'alipay-store-poster.jpg'))
w, h = im.size
# 裁掉左侧 6%、右侧 4%、上 3%、下 8%，构图更聚焦
crop = im.crop((int(w * 0.06), int(h * 0.03), int(w * 0.96), int(h * 0.92)))
cw, ch = crop.size
resized = crop.resize((1080, int(ch * 1080 / cw)), Image.LANCZOS)
resized = ImageEnhance.Contrast(resized).enhance(1.04)
resized = ImageEnhance.Color(resized).enhance(1.03)
save(resized, '百家号版-苹果返校季2026-店内海报实拍.png')

# 2. 支付宝认证页面：1280x2816 -> 裁掉状态栏与底部横条留白，聚焦「完成身份验证」到「去认证」按钮
im = Image.open(os.path.join(HERE, 'shots', 'alipay-verify-entry.jpg'))
w, h = im.size
# 上裁 9.5%（状态栏+导航图标行）、下裁 5%、左右各裁 2.5%
crop = im.crop((int(w * 0.025), int(h * 0.095), int(w * 0.975), int(h * 0.95)))
cw, ch = crop.size
resized = crop.resize((760, int(ch * 760 / cw)), Image.LANCZOS)
save(resized, '百家号版-苹果返校季2026-支付宝认证页面.png')
