# Apply platform icons from IconKitchen output to the project

$root = "C:\Users\User\Downloads\IconKitchen-Output (1)"
$androidResSrc = Join-Path $root "android\res"
$projectRoot = "C:\Users\work4\Desktop\Onvitv\OnviTV-ReactNative"
$androidResDest = Join-Path $projectRoot "android\app\src\main\res"
$assetsDest = Join-Path $projectRoot "assets"

function Copy-AndroidRes {
    if (!(Test-Path $androidResSrc)) {
        Write-Host "[Android] Source not found: $androidResSrc"
        return
    }
    Get-ChildItem -Path $androidResSrc -Directory | ForEach-Object {
        $folderName = $_.Name
        $sourcePath = $_.FullName
        $destPath = Join-Path $androidResDest $folderName

        if (!(Test-Path $destPath)) {
            New-Item -ItemType Directory -Path $destPath -Force | Out-Null
        }
        Get-ChildItem -Path $sourcePath -File | ForEach-Object {
            Copy-Item -Path $_.FullName -Destination $destPath -Force
        }
        Write-Host "[Android] Copied $folderName"
    }
}

function Copy-IOSIcon {
    $iosIconSet = Join-Path $root "ios\AppIcon.appiconset"
    $destIcon = Join-Path $assetsDest "icon.png"

    if (Test-Path $iosIconSet) {
        try {
            Add-Type -AssemblyName System.Drawing -ErrorAction Stop
        } catch {}
        $pngs = Get-ChildItem -Path $iosIconSet -Filter *.png -File -ErrorAction SilentlyContinue
        if ($pngs -and $pngs.Count -gt 0) {
            $best = $null
            $bestArea = 0
            foreach ($p in $pngs) {
                try {
                    $img = [System.Drawing.Image]::FromFile($p.FullName)
                    $area = $img.Width * $img.Height
                    $img.Dispose()
                    if ($area -gt $bestArea) {
                        $best = $p
                        $bestArea = $area
                    }
                } catch {}
            }
            if ($best -ne $null) {
                Copy-Item -Path $best.FullName -Destination $destIcon -Force
                Write-Host "[iOS] Copied iOS icon: $($best.Name) -> assets\\icon.png"
                return
            }
        }
    }
    $fallbacks = @(
        (Join-Path $root "icon.png"),
        (Join-Path $root "ios\icon.png")
    )
    foreach ($f in $fallbacks) {
        if (Test-Path $f) {
            Copy-Item -Path $f -Destination $destIcon -Force
            Write-Host "[iOS] Copied fallback icon: $(Split-Path $f -Leaf) -> assets\\icon.png"
            break
        }
    }
}

function Copy-WebFavicons {
    $favPngCandidates = @(
        (Join-Path $root "web\favicon.png"),
        (Join-Path $root "favicon.png")
    )
    $favIcoCandidates = @(
        (Join-Path $root "web\favicon.ico"),
        (Join-Path $root "favicon.ico")
    )
    $faviconPngDest = Join-Path $assetsDest "favicon.png"
    $faviconIcoDest = Join-Path $assetsDest "favicon.ico"
    foreach ($c in $favPngCandidates) {
        if (Test-Path $c) {
            Copy-Item -Path $c -Destination $faviconPngDest -Force
            Write-Host "[Web] Copied favicon.png"
            break
        }
    }
    foreach ($c in $favIcoCandidates) {
        if (Test-Path $c) {
            Copy-Item -Path $c -Destination $faviconIcoDest -Force
            Write-Host "[Web] Copied favicon.ico"
            break
        }
    }
}

function Copy-AdaptiveIcon {
    $candidates = @(
        (Join-Path $root "adaptive-icon.png"),
        (Join-Path $root "android\adaptive-icon-foreground.png"),
        (Join-Path $root "android\adaptive\foreground.png")
    )
    $dest = Join-Path $assetsDest "adaptive-icon.png"
    foreach ($c in $candidates) {
        if (Test-Path $c) {
            Copy-Item -Path $c -Destination $dest -Force
            Write-Host "[Android] Copied adaptive icon -> assets\\adaptive-icon.png"
            break
        }
    }
}

function Copy-NotificationIcon {
    $cands = @(
        (Join-Path $root "notification-icon.png"),
        (Join-Path $root "android\notification-icon.png")
    )
    $dest = Join-Path $assetsDest "notification-icon.png"
    foreach ($c in $cands) {
        if (Test-Path $c) {
            Copy-Item -Path $c -Destination $dest -Force
            Write-Host "[Android] Copied notification icon -> assets\\notification-icon.png"
            break
        }
    }
}

# Ensure assets folder exists
if (!(Test-Path $assetsDest)) {
    New-Item -ItemType Directory -Path $assetsDest -Force | Out-Null
}

Write-Host "Starting icon application from: $root"
Copy-AndroidRes
Copy-IOSIcon
Copy-WebFavicons
Copy-AdaptiveIcon
Copy-NotificationIcon
Write-Host "`nAll icon copy operations finished."
