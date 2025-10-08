# Supabase VS Code Quick Setup Script
# Run this in PowerShell: .\setup-supabase.ps1

Write-Host "Pachanga's Picks - Supabase VS Code Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Supabase CLI is installed
Write-Host "Checking for Supabase CLI..." -ForegroundColor Yellow
$supabaseVersion = supabase --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Supabase CLI not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install Supabase CLI first:" -ForegroundColor Yellow
    Write-Host "  Option 1 (Scoop): scoop bucket add supabase https://github.com/supabase/scoop-bucket.git && scoop install supabase" -ForegroundColor White
    Write-Host "  Option 2 (NPM):   npm install -g supabase" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "[OK] Supabase CLI found: $supabaseVersion" -ForegroundColor Green
Write-Host ""

# Check if .env file exists
Write-Host "Checking environment variables..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "[WARNING] .env file not found!" -ForegroundColor Yellow
    Write-Host "Please create a .env file with your Supabase credentials" -ForegroundColor Yellow
    Write-Host ""
    
    # Offer to copy from example
    if (Test-Path ".env.example") {
        $response = Read-Host "Copy from .env.example? (y/n)"
        if ($response -eq "y") {
            Copy-Item ".env.example" ".env"
            Write-Host "[OK] Created .env from template" -ForegroundColor Green
            Write-Host "[WARNING] Please edit .env and add your actual Supabase credentials!" -ForegroundColor Yellow
            Write-Host ""
        }
    }
}

# Check if logged in
Write-Host "Checking Supabase login status..." -ForegroundColor Yellow
$loginStatus = supabase projects list 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARNING] Not logged in to Supabase" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Login now? (y/n)"
    if ($response -eq "y") {
        supabase login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[ERROR] Login failed!" -ForegroundColor Red
            exit 1
        }
        Write-Host "[OK] Successfully logged in!" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] Skipping login. Run 'supabase login' later" -ForegroundColor Yellow
    }
} else {
    Write-Host "[OK] Already logged in to Supabase" -ForegroundColor Green
}
Write-Host ""

# Check if project is linked
Write-Host "Checking project link..." -ForegroundColor Yellow
if (-not (Test-Path ".supabase/config.toml")) {
    Write-Host "[WARNING] Project not linked yet" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To link your project, run:" -ForegroundColor Cyan
    Write-Host "  supabase link --project-ref YOUR_PROJECT_ID" -ForegroundColor White
    Write-Host ""
    Write-Host "Find your Project ID:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://app.supabase.com" -ForegroundColor White
    Write-Host "  2. Select your project" -ForegroundColor White
    Write-Host "  3. Settings → General → Reference ID" -ForegroundColor White
    Write-Host ""
    
    $projectRef = Read-Host "Enter your Project ID (or press Enter to skip)"
    if ($projectRef) {
        Write-Host "Linking project..." -ForegroundColor Yellow
        supabase link --project-ref $projectRef
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Project linked successfully!" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Failed to link project" -ForegroundColor Red
            exit 1
        }
    }
} else {
    Write-Host "[OK] Project already linked" -ForegroundColor Green
}
Write-Host ""

# Generate types
Write-Host "Would you like to generate TypeScript types from your database?" -ForegroundColor Cyan
$response = Read-Host "(y/n)"
if ($response -eq "y") {
    Write-Host "Generating types..." -ForegroundColor Yellow
    
    # Create types directory if it doesn't exist
    if (-not (Test-Path "src/types")) {
        New-Item -ItemType Directory -Path "src/types" -Force | Out-Null
    }
    
    # Try to get project ref from environment
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $supabaseUrl = $envContent | Where-Object { $_ -match "VITE_SUPABASE_URL=" } | ForEach-Object { $_ -replace "VITE_SUPABASE_URL=", "" }
        if ($supabaseUrl -match "https://([^.]+)\.supabase\.co") {
            $projectRef = $matches[1]
            Write-Host "Detected Project ID: $projectRef" -ForegroundColor Cyan
            
            supabase gen types typescript --project-id $projectRef > src/types/database.types.ts
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Types generated successfully!" -ForegroundColor Green
                Write-Host "   -> src/types/database.types.ts" -ForegroundColor Gray
            } else {
                Write-Host "[ERROR] Failed to generate types" -ForegroundColor Red
            }
        }
    } else {
        npm run types:generate
        if ($LASTEXITCODE -eq 0) {
            Write-Host "[OK] Types generated successfully!" -ForegroundColor Green
        }
    }
}
Write-Host ""

# Summary
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Open any .sql file to test SQL IntelliSense" -ForegroundColor White
Write-Host "  2. Click the Supabase icon in the sidebar to explore your database" -ForegroundColor White
Write-Host "  3. Update src/lib/supabase.ts to use typed client (see SUPABASE_VSCODE_SETUP.md)" -ForegroundColor White
Write-Host ""
Write-Host "Useful Commands:" -ForegroundColor Yellow
Write-Host "  npm run types:generate  - Regenerate types from database" -ForegroundColor White
Write-Host "  supabase db push        - Push migrations to remote" -ForegroundColor White
Write-Host "  supabase db pull        - Pull schema from remote" -ForegroundColor White
Write-Host ""
Write-Host "Full documentation: SUPABASE_VSCODE_SETUP.md" -ForegroundColor Cyan
Write-Host ""
