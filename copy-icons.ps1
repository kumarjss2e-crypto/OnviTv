# Copy app icons from IconKitchen output to Android res folder

$source = "C:\Users\Work3\Downloads\IconKitchen-Output\android\res"
$dest = "C:\Users\Work3\Desktop\Onvitv\OnviTV-ReactNative\android\app\src\main\res"

# Copy all mipmap folders
Get-ChildItem -Path $source -Directory | ForEach-Object {
    $folderName = $_.Name
    $sourcePath = $_.FullName
    $destPath = Join-Path $dest $folderName
    
    Write-Host "Copying $folderName..."
    
    # Create destination folder if it doesn't exist
    if (!(Test-Path $destPath)) {
        New-Item -ItemType Directory -Path $destPath -Force | Out-Null
    }
    
    # Copy all files from source folder to destination
    Get-ChildItem -Path $sourcePath -File | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination $destPath -Force
        Write-Host "  Copied $($_.Name)"
    }
}

Write-Host "`nIcon copy complete!"
