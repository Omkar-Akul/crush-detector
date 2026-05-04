# Deploy script for Crush Detector
# Run this AFTER you've updated the CACHE_NAME version in frontend/public/sw.js

Write-Host "Starting deployment build..." -ForegroundColor Cyan
Write-Host ""

# Navigate to frontend folder
Set-Location "$PSScriptRoot\frontend"

# Check if sw.js was updated
$swContent = Get-Content "public/sw.js"
Write-Host "Current cache version:" -ForegroundColor Yellow
$swContent | Select-String "const CACHE_NAME" | Write-Host

Write-Host ""
Write-Host "Building React app..." -ForegroundColor Cyan
npm run build

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "Build successful!" -ForegroundColor Green
    Write-Host "Your app is ready to deploy!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Upload the 'frontend/build' folder to your server" -ForegroundColor White
    Write-Host "2. Verify it's working in production" -ForegroundColor White
    Write-Host ""
    Write-Host "Deployment complete!" -ForegroundColor Green
}
else {
    Write-Host ""
    Write-Host "Build failed! Check errors above." -ForegroundColor Red
}
