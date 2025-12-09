# Script to resize and optimize images for grid display (300x420)
# Install ImageMagick first: choco install imagemagick

# Source folder with images
$sourceFolder = "C:\Users\User\Downloads\New folder (2)"
$destFolder = ".\assets"

# Target dimensions (300x420 is the ratio we need)
$targetWidth = 300
$targetHeight = 420

# Check if source folder exists
if (-not (Test-Path $sourceFolder)) {
    Write-Host "ERROR: Source folder not found: $sourceFolder" -ForegroundColor Red
    exit 1
}

# Check if ImageMagick is installed
$magick = Get-Command convert.exe -ErrorAction SilentlyContinue
if (-not $magick) {
    Write-Host "Installing ImageMagick..." -ForegroundColor Yellow
    choco install imagemagick -y
}

# Get all image files
$images = Get-ChildItem $sourceFolder -Include *.jpg, *.jpeg, *.png, *.webp -Recurse
Write-Host "Found $($images.Count) images to process" -ForegroundColor Green

$processed = 0
$counter = 1

foreach ($image in $images) {
    $outputName = "grid-movie-$counter.jpg"
    $outputPath = Join-Path $destFolder $outputName
    
    try {
        Write-Host "Processing: $($image.Name) -> $outputName..." -NoNewline
        
        # Resize image with center crop to fit 300x420 ratio
        # This will resize and crop the image to exact dimensions
        & convert.exe "$($image.FullName)" -resize "${targetWidth}x${targetHeight}^" -gravity center -extent ${targetWidth}x${targetHeight} -quality 85 "$outputPath"
        
        $fileSize = (Get-Item $outputPath).Length / 1KB
        Write-Host " OK ($([Math]::Round($fileSize, 1)) KB)" -ForegroundColor Green
        $processed++
        $counter++
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Processing Complete!" -ForegroundColor Green
Write-Host "Processed: $processed images"
Write-Host "Output folder: $destFolder"
Write-Host "================================" -ForegroundColor Cyan
