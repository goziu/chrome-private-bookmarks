#!/usr/bin/env python3
"""
Chrome拡張機能用のアイコンファイルを生成するスクリプト
Pillowライブラリが必要です: pip install Pillow
"""

try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Pillowライブラリが必要です。以下のコマンドでインストールしてください:")
    print("pip install Pillow")
    exit(1)

import os

def create_icon(size):
    """指定されたサイズのアイコンを生成"""
    # 画像を作成
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # 背景を描画（青）
    draw.rectangle([0, 0, size, size], fill=(66, 133, 244, 255))
    
    # ブックマークアイコン（星型）を描画
    center_x = size / 2
    center_y = size / 2
    radius = size * 0.3
    spikes = 5
    
    # 星のポイントを計算
    points = []
    for i in range(spikes * 2):
        r = radius if i % 2 == 0 else radius * 0.5
        angle = (i * 3.14159 / spikes) - 3.14159 / 2
        x = center_x + (r * (1 if i < spikes * 2 else 0.8)) * (1 if i % 2 == 0 else 0.5) * (1 if i < spikes else -1)
        y = center_y + (r * (1 if i < spikes * 2 else 0.8)) * (1 if i % 2 == 0 else 0.5) * (1 if i < spikes else -1)
        if i == 0:
            x = center_x
            y = center_y - radius
        elif i == 1:
            x = center_x + radius * 0.3
            y = center_y - radius * 0.1
        elif i == 2:
            x = center_x + radius * 0.95
            y = center_y + radius * 0.3
        elif i == 3:
            x = center_x + radius * 0.6
            y = center_y + radius * 0.95
        elif i == 4:
            x = center_x
            y = center_y + radius * 0.6
        elif i == 5:
            x = center_x - radius * 0.6
            y = center_y + radius * 0.95
        elif i == 6:
            x = center_x - radius * 0.95
            y = center_y + radius * 0.3
        elif i == 7:
            x = center_x - radius * 0.3
            y = center_y - radius * 0.1
        else:
            x = center_x
            y = center_y - radius
        
        points.append((x, y))
    
    # 星を描画
    draw.polygon(points, fill=(255, 255, 255, 255))
    
    return img

def main():
    # iconsディレクトリが存在しない場合は作成
    os.makedirs('icons', exist_ok=True)
    
    # 各サイズのアイコンを生成
    sizes = [16, 48, 128]
    for size in sizes:
        icon = create_icon(size)
        filename = f'icons/icon{size}.png'
        icon.save(filename, 'PNG')
        print(f'生成しました: {filename}')

if __name__ == '__main__':
    main()

