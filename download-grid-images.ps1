# Script to download grid images for onboarding screen
# Using reliable public image sources for movie/TV content
$images = @(
    @{url="https://www.imdb.com/title/tt1375666/mediaviewer/rm1234567890"; name="grid-movie-2.jpg"},
    @{url="https://www.imdb.com/title/tt0468569/mediaviewer/rm123456789"; name="grid-movie-3.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BMTk3NDQtODMwLWI4MjktYTljNS1jOTdjOTQ0NzQxOTAuX0JfV0VfMTY4OTA3NTAwMDcx._V1_SX300.jpg"; name="grid-movie-4.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BZDEyN2NhMjgtMjdhNy00MWY3LTgxNmYtMDJmMGFlY2Ux.jpg"; name="grid-movie-5.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BNjM0NTc0NzItM2FlYy00YzEwLWE0YmUtNTA2OWM2NTc3ODA1XkEyXkFqcGdeQXVyNTgwNzIyNzg@._V1_SX300.jpg"; name="grid-movie-6.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BNDYxNjQyMjEtODRkYy00NWYyLTgwMDgtMzg2MTQ3N2YxZmM0XkEyXkFqcGdeQXVyMTMxODk2OTU@._V1_SX300.jpg"; name="grid-movie-7.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BMTkzNzk1MzkyN15BMl5BanBnXkFtZTgwMTMzNzk3NjE@._V1_SX300.jpg"; name="grid-movie-8.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BYzc1Nzk1MzMtNTY5Yi00NTczLTgxYTItYzYwMzA0YjRiMzAwXkEyXkFqcGdeQXVyNzU1NzE3NTM@._V1_SX300.jpg"; name="grid-movie-9.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BMWMwMGQwMmItNWEyYS00Yzg1LWJiNmYtZTdkMDMzYTc0MjA2XkEyXkFqcGdeQXVyNjk1Njg0NzE@._V1_SX300.jpg"; name="grid-movie-10.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BMTI1MDEzMzAxN15BMTk4MTIyXkEyXkFqcGdeQXVyNDYyMDk5OTA@._V1_SX300.jpg"; name="grid-movie-11.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BMjA5Nzk0ZmUtZWY1OS00YWZhLTljNTktYzEwZDg0MjE4ZDZkXkEyXkFqcGdeQXVyNzU1NzE3NTM@._V1_SX300.jpg"; name="grid-movie-12.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BMTEyNjA1NDU0NF5BMl5BanBnXkFtZTcwNTM4OTc3OA@@._V1_SX300.jpg"; name="grid-movie-13.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BOGZlNjAutOTgzLWEzNmYtOGM0N2Y1OTdjMzlkXkEyXkFqcGdeQXVyMjUzOTY1NTc@._V1_SX300.jpg"; name="grid-movie-14.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BMTc1MjA2NzQzMV5BMl5BanBnXkFtZTgwOTM5OTk3NjE@._V1_SX300.jpg"; name="grid-movie-15.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BOTk2NzYyMzE5OV5BMl5BanBnXkFtZTgwODU3OTc3NjE@._V1_SX300.jpg"; name="grid-movie-16.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BMTYxNzk0NzQtNTQwZS00ZDRmLTk2ZTAtM2M2ZjMwMzBmNmZhXkEyXkFqcGdeQXVyMzQ0MzAwOQ@@._V1_SX300.jpg"; name="grid-movie-17.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BNzA5ZDNlZWMtOTk4OC00N2ZiLTgyZTktODExMzQyNjkzNDkw._V1_SX300.jpg"; name="grid-movie-18.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BMDNkODczNTYtOTMyYi00ZWY1LWE5YTItMzg0MjJmNmY4NzQzXkEyXkFqcGdeQXVyNTA4NzY1MzY@._V1_SX300.jpg"; name="grid-movie-19.jpg"},
    @{url="https://ia.media-imdb.com/images/M/MV5BOWZlMjFiYzgtMmM0ZC00MDk1LWI3ZjYtODhhMmI0MzE5YTljXkEyXkFqcGdeQXVyMTQxNzMzNDI@._V1_SX300.jpg"; name="grid-movie-20.jpg"}
)

$assetsPath = ".\assets"
$downloaded = 0
$failed = 0

Write-Host "Starting to download $($images.Count) grid images..." -ForegroundColor Green

foreach ($image in $images) {
    $outputPath = Join-Path $assetsPath $image.name
    
    try {
        Write-Host "Downloading: $($image.name)..." -NoNewline
        
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($image.url, $outputPath)
        
        $fileSize = (Get-Item $outputPath).Length / 1KB
        Write-Host " OK ($fileSize KB)" -ForegroundColor Green
        $downloaded++
    }
    catch {
        Write-Host " FAILED" -ForegroundColor Red
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Yellow
        $failed++
    }
}

Write-Host ""
Write-Host "Download Summary:" -ForegroundColor Cyan
Write-Host "Successfully downloaded: $downloaded images" -ForegroundColor Green
Write-Host "Failed: $failed images" -ForegroundColor Yellow
