# 簡単なPNGアイコンファイルを生成するPowerShellスクリプト

function Create-Icon {
    param(
        [int]$Size
    )
    
    # 簡単なPNGアイコンをbase64エンコードされたデータから作成
    # これは16x16の青い背景に白い星のアイコンです
    
    $iconPath = "icons\icon$Size.png"
    
    # 各サイズ用の簡単なPNGデータ（base64エンコード）
    # 実際のPNGファイルを作成するために、.NETのImageクラスを使用
    
    Add-Type -AssemblyName System.Drawing
    
    # ビットマップを作成
    $bitmap = New-Object System.Drawing.Bitmap($Size, $Size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    
    # 背景を青で塗りつぶし
    $graphics.Clear([System.Drawing.Color]::FromArgb(66, 133, 244))
    
    # 白い星を描画
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, 1)
    
    # 星のポイントを計算
    $centerX = $Size / 2
    $centerY = $Size / 2
    $outerRadius = $Size * 0.35
    $innerRadius = $outerRadius * 0.4
    
    $points = New-Object System.Collections.ArrayList
    for ($i = 0; $i -lt 10; $i++) {
        $angle = ($i * 36 - 90) * [Math]::PI / 180
        $radius = if ($i % 2 -eq 0) { $outerRadius } else { $innerRadius }
        $x = $centerX + $radius * [Math]::Cos($angle)
        $y = $centerY + $radius * [Math]::Sin($angle)
        $points.Add([System.Drawing.Point]::new([int]$x, [int]$y)) | Out-Null
    }
    
    $pointArray = $points.ToArray([System.Drawing.Point])
    $graphics.FillPolygon($brush, $pointArray)
    
    # ファイルに保存
    $bitmap.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    
    Write-Host "作成しました: $iconPath"
}

# 各サイズのアイコンを作成
Create-Icon -Size 16
Create-Icon -Size 48
Create-Icon -Size 128

Write-Host "すべてのアイコンファイルを作成しました！"




