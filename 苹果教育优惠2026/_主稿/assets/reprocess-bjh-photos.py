# -*- coding: utf-8 -*-
"""百家号版实拍图重处理：重新裁剪构图 + 缩放 + PNG 重导出（改变文件指纹）。"""
from PIL import Image, ImageEnhance, ImageFile
import os

ImageFile.LOAD_TRUNCATED_IMAGES = True  # 部分源图尾部截断（底部纯灰带），裁剪时已避开

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '百家号')

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

# 3. 衍生文《iPad涨价学生党还要等吗》百家号版：官网返校季促销区块（知乎版 2880x2200）
# 换构图：裁掉顶部装饰条与产品分类行，聚焦「限时特惠」标题 + 黑色促销卡 + MacBook Air 卡
im = Image.open(os.path.join(HERE, '..', '知乎', '苹果官网-返校季促销区块.png'))
w, h = im.size
crop = im.crop((int(w * 0.06), int(h * 0.30), int(w * 0.685), int(h * 0.86)))
cw, ch = crop.size
resized = crop.resize((1080, int(ch * 1080 / cw)), Image.LANCZOS)
save(resized, '百家号版-iPad涨价学生党-返校季促销区块.png')

# 4. 同文：官网教育商店首页与产品区（知乎版 2880x2200）
# 换构图：裁掉导航与黑色头图大部，聚焦产品分类行 + 「限时特惠」区块上沿
im = Image.open(os.path.join(HERE, '..', '知乎', '苹果官网-教育商店产品区.png'))
w, h = im.size
crop = im.crop((int(w * 0.03), int(h * 0.41), int(w * 0.97), int(h * 0.75)))
cw, ch = crop.size
resized = crop.resize((1080, int(ch * 1080 / cw)), Image.LANCZOS)
save(resized, '百家号版-iPad涨价学生党-教育商店产品区.png')

# 5. 衍生文《理科大学生买Mac》百家号版：MacBook Neo 靛蓝侧开实拍（Notebookcheck，知乎版 1800x1200）
# 换构图：裁掉底部水印区与两侧留白，聚焦机身本体
im = Image.open(os.path.join(HERE, '..', '知乎', 'MacBook-Neo评测实拍-靛蓝侧开.jpg'))
w, h = im.size
crop = im.crop((int(w * 0.04), int(h * 0.02), int(w * 0.97), int(h * 0.90)))
cw, ch = crop.size
resized = crop.resize((1080, int(ch * 1080 / cw)), Image.LANCZOS)
resized = ImageEnhance.Contrast(resized).enhance(1.03)
save(resized, '百家号版-理科买Mac-MacBookNeo实拍.png')

# 6. 同文：MacBook Air M5 京东国补价截图（知乎版 2056x1169 整页）
# 换构图：裁掉左侧商品图区，聚焦右侧「国家补贴」横幅 + 价格 + 版本选择区
im = Image.open(os.path.join(HERE, '..', '知乎', 'MacBook-Air-M5京东教育优惠版-国补价.png'))
w, h = im.size
crop = im.crop((int(w * 0.598), int(h * 0.03), int(w * 0.95), int(h * 0.98)))
cw, ch = crop.size
resized = crop.resize((760, int(ch * 760 / cw)), Image.LANCZOS)
save(resized, '百家号版-理科买Mac-京东国补价.png')

# 7. 衍生文《iPad11寸还是13寸》百家号版：iPad Air M4 正面实拍（Notebookcheck，知乎版 4096x3072）
# 注意源文件尾部有截断（底部约 8% 为纯灰带），下裁必须避开；换构图：裁掉左侧 iPhone 与背景杂物，聚焦屏幕本体
im = Image.open(os.path.join(HERE, '..', '知乎', 'iPad-Air-M4评测实拍-正面.jpg'))
w, h = im.size
crop = im.crop((int(w * 0.30), int(h * 0.18), int(w * 0.84), int(h * 0.78)))
cw, ch = crop.size
resized = crop.resize((1080, int(ch * 1080 / cw)), Image.LANCZOS)
resized = ImageEnhance.Contrast(resized).enhance(1.03)
save(resized, '百家号版-iPad11寸还是13寸-正面实拍.png')

# 8. 同文：iPad Air M4 铝合金背板实拍（Notebookcheck，知乎版 3304x2276）
# 换构图：裁掉四周绿色背景，聚焦机身与苹果 logo，避开底部截断带
im = Image.open(os.path.join(HERE, '..', '知乎', 'iPad-Air-M4评测实拍-背面.jpg'))
w, h = im.size
crop = im.crop((int(w * 0.12), int(h * 0.10), int(w * 0.96), int(h * 0.86)))
cw, ch = crop.size
resized = crop.resize((1080, int(ch * 1080 / cw)), Image.LANCZOS)
resized = ImageEnhance.Contrast(resized).enhance(1.03)
save(resized, '百家号版-iPad11寸还是13寸-背面实拍.png')
