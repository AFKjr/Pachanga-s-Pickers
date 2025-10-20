# Apply Fusion Data Migration
# This script adds all the new fusion data columns to the team_stats_cache table

Write-Host "Applying fusion data migration..." -ForegroundColor Green

# Check if Supabase CLI is available
if (!(Get-Command supabase -ErrorAction SilentlyContinue)) {
    Write-Host "Supabase CLI not found. Please install it first:" -ForegroundColor Red
    Write-Host "npm install -g supabase" -ForegroundColor Yellow
    exit 1
}

# Apply the migration
Write-Host "Running migration: add_fusion_data_columns.sql" -ForegroundColor Cyan
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Migration applied successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "New columns added to team_stats_cache table:" -ForegroundColor Cyan
    Write-Host "- Situational stats (third/fourth down, red zone)" -ForegroundColor White
    Write-Host "- Special teams (field goals, punting, returns)" -ForegroundColor White
    Write-Host "- Pass rush metrics (QB hurries, blitz percentage)" -ForegroundColor White
    Write-Host "- Drive-level statistics (scoring %, turnover %, etc.)" -ForegroundColor White
    Write-Host "- Advanced scoring breakdowns" -ForegroundColor White
    Write-Host ""
    Write-Host "Total new fields: ~45 columns" -ForegroundColor Green
    Write-Host "Total table columns: ~98 columns" -ForegroundColor Green
} else {
    Write-Host "❌ Migration failed. Please check the error messages above." -ForegroundColor Red
    exit 1
}