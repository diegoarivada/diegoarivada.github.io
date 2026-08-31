# PowerShell script to create a static GIF fallback from an SVG using ImageMagick (magick)
# Requires ImageMagick installed and `magick` on PATH.
# Run from repository root: .\scripts\convert_svg_to_gif.ps1

$svg = "images/network.svg"
$gif = "images/network.gif"

if (-not (Test-Path $svg)) {
    Write-Error "SVG not found: $svg"
    exit 1
}

# Convert to a static GIF snapshot (non-animated). For animated GIF, see README instructions.
Write-Host "Converting $svg -> $gif (static snapshot) ..."
magick convert `"$svg`" `"$gif`"
if ($LASTEXITCODE -eq 0) {
    Write-Host "Created $gif"
} else {
    Write-Error "magick convert failed. Ensure ImageMagick is installed and `magick` is on PATH."
}
