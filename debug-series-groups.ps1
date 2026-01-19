# Find all groups that match the series detection rule
$ht = @{}
foreach ($line in Get-Content tv_channels_c74823f72c_plus.m3u) {
    if ($line -match 'group-title="([^"]*)"') {
        $g = $matches[1].ToLower()
        # Check the series rule: (serien|serie|series) AND NOT (filme|film|movies)
        if (($g -match 'serien|serie|series') -and ($g -notmatch 'filme|film|movies')) {
            if (-not $ht[$g]) { $ht[$g] = 0 }
            $ht[$g]++
        }
    }
}

Write-Host "Groups matching series detection rule (50 largest):" -ForegroundColor Cyan
$ht.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 50 | ForEach-Object { 
    Write-Host "$($_.Key): $($_.Value)" 
}
