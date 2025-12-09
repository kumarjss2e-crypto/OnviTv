# Script to resize and optimize images for grid display (300x420)
$sourceFolder = "C:\Users\User\Downloads\New folder (2)"
$destFolder = ".\assets"

# Check if source folder exists
if (-not (Test-Path $sourceFolder)) {
    Write-Host "ERROR: Source folder not found: $sourceFolder" -ForegroundColor Red
    exit 1
}

# Get all image files
$images = @(Get-ChildItem $sourceFolder -Include *.jpg, *.jpeg, *.png, *.webp -ErrorAction SilentlyContinue)
Write-Host "Found $($images.Count) images to process" -ForegroundColor Green
Write-Host ""

$processed = 0
$counter = 1

foreach ($image in $images) {
    if ($counter -gt 20) { break } # Limit to 20
    
    $outputName = "grid-movie-$counter.jpg"
    $outputPath = Join-Path $destFolder $outputName
    
    Write-Host "[$counter/20] Converting: $($image.Name)..." -NoNewline
    
    try {
        # Use ImageMagick convert with proper syntax
        $cmd = "convert.exe `"$($image.FullName)`" -resize `"300x420^`" -gravity center -extent 300x420 -quality 85 `"$outputPath`""
        Invoke-Expression $cmd 2>&1 | Out-Null
        
        if (Test-Path $outputPath) {
            $fileSize = (Get-Item $outputPath).Length / 1KB
            Write-Host " OK ($([Math]::Round($fileSize, 1)) KB)" -ForegroundColor Green
            $processed++
        } else {
            Write-Host " FAILED" -ForegroundColor Red
        }
    }
    catch {
        Write-Host " ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
    
    $counter++
}

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Processing Complete!" -ForegroundColor Green
Write-Host "Processed: $processed out of $($images.Count) images" -ForegroundColor Cyan
Write-Host "Saved to: $destFolder" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
