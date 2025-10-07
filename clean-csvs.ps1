# Quick CSV Cleanup Script
# Removes extra whitespace and ensures consistent formatting

# Process offensive stats
Write-Host "Processing offensive stats..." -ForegroundColor Cyan
$offensive = Import-Csv "nfl_2025_offensive_stats.csv"
$offensive | Export-Csv "nfl_2025_offensive_stats_clean.csv" -NoTypeInformation -Encoding UTF8
Write-Host "[OK] Created: nfl_2025_offensive_stats_clean.csv" -ForegroundColor Green

# Process defensive stats  
Write-Host "Processing defensive stats..." -ForegroundColor Cyan
$defensive = Import-Csv "nfl_2025_defensive_stats.csv"
$defensive | Export-Csv "nfl_2025_defensive_stats_clean.csv" -NoTypeInformation -Encoding UTF8
Write-Host "[OK] Created: nfl_2025_defensive_stats_clean.csv" -ForegroundColor Green

Write-Host ""
Write-Host "[DONE] Your CSVs have been cleaned." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Open the clean CSV files in VS Code" -ForegroundColor Gray
Write-Host "2. Press Ctrl+Shift+P" -ForegroundColor Gray
Write-Host "3. Type CSV: Align and press Enter" -ForegroundColor Gray
Write-Host "4. Your CSV will look beautiful!" -ForegroundColor Gray
