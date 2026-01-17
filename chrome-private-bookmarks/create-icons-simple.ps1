# Create simple PNG icon files
Add-Type -AssemblyName System.Drawing

function CreateIcon($size) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.Clear([System.Drawing.Color]::FromArgb(66, 133, 244))
    
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $centerX = $size / 2
    $centerY = $size / 2
    $radius = $size * 0.35
    
    $points = @()
    for ($i = 0; $i -lt 10; $i++) {
        $angle = ($i * 36 - 90) * [Math]::PI / 180
        $r = if ($i % 2 -eq 0) { $radius } else { $radius * 0.4 }
        $x = $centerX + $r * [Math]::Cos($angle)
        $y = $centerY + $r * [Math]::Sin($angle)
        $points += [System.Drawing.Point]::new([int]$x, [int]$y)
    }
    
    $graphics.FillPolygon($brush, $points)
    $bitmap.Save("icons\icon$size.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $graphics.Dispose()
    $bitmap.Dispose()
    Write-Host "Created: icons\icon$size.png"
}

CreateIcon 16
CreateIcon 48
CreateIcon 128
Write-Host "Done!"

