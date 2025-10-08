# Quick Supabase Setup - NPX Version
# Since Supabase CLI doesn't support global npm install, we'll use npx

Write-Host "Pachanga's Picks - Supabase Setup" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Login to Supabase
Write-Host "Step 1: Login to Supabase" -ForegroundColor Yellow
Write-Host "This will open your browser for authentication..." -ForegroundColor Gray
Write-Host ""
$response = Read-Host "Press Enter to login (or 's' to skip)"
if ($response -ne "s") {
    npx supabase login
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Successfully logged in!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Login failed! Please try again." -ForegroundColor Red
        exit 1
    }
}
Write-Host ""

# Step 2: Link Project
Write-Host "Step 2: Link Your Project" -ForegroundColor Yellow
Write-Host ""
Write-Host "Find your Project ID:" -ForegroundColor Cyan
Write-Host "  1. Go to https://app.supabase.com" -ForegroundColor White
Write-Host "  2. Select your project" -ForegroundColor White
Write-Host "  3. Settings -> General -> Reference ID" -ForegroundColor White
Write-Host ""
$projectRef = Read-Host "Enter your Project ID"

if ($projectRef) {
    Write-Host "Linking project..." -ForegroundColor Yellow
    npx supabase link --project-ref $projectRef
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Project linked successfully!" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to link project" -ForegroundColor Red
        Write-Host "Please check your Project ID and try again" -ForegroundColor Yellow
        exit 1
    }
} else {
    Write-Host "[WARNING] No Project ID provided. Skipping link." -ForegroundColor Yellow
}
Write-Host ""

# Step 3: Generate TypeScript Types
Write-Host "Step 3: Generate TypeScript Types" -ForegroundColor Yellow
Write-Host ""
$response = Read-Host "Generate types from your database? (y/n)"
if ($response -eq "y") {
    Write-Host "Generating types..." -ForegroundColor Yellow
    
    # Create types directory if it doesn't exist
    if (-not (Test-Path "src/types")) {
        New-Item -ItemType Directory -Path "src/types" -Force | Out-Null
    }
    
    # Extract project ref from .env file
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        $supabaseUrl = $envContent | Where-Object { $_ -match "VITE_SUPABASE_URL=" } | ForEach-Object { $_ -replace "VITE_SUPABASE_URL=", "" } | ForEach-Object { $_.Trim() }
        
        if ($supabaseUrl -match "https://([^.]+)\.supabase\.co") {
            $detectedProjectRef = $matches[1]
            Write-Host "Detected Project ID from .env: $detectedProjectRef" -ForegroundColor Cyan
            Write-Host ""
            
            npx supabase gen types typescript --project-id $detectedProjectRef > src/types/database.types.ts
            if ($LASTEXITCODE -eq 0) {
                Write-Host "[OK] Types generated successfully!" -ForegroundColor Green
                Write-Host "   -> src/types/database.types.ts" -ForegroundColor Gray
                Write-Host ""
                
                # Show file size
                $fileSize = (Get-Item "src/types/database.types.ts").Length
                Write-Host "   File size: $fileSize bytes" -ForegroundColor Gray
            } else {
                Write-Host "[ERROR] Failed to generate types" -ForegroundColor Red
            }
        } else {
            Write-Host "[WARNING] Could not detect Project ID from .env" -ForegroundColor Yellow
            Write-Host "Please make sure VITE_SUPABASE_URL is set correctly" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[WARNING] .env file not found!" -ForegroundColor Yellow
        Write-Host "Please create a .env file with VITE_SUPABASE_URL" -ForegroundColor Yellow
    }
}
Write-Host ""

# Summary
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "What's Next?" -ForegroundColor Yellow
Write-Host "  1. Check that types were generated: src/types/database.types.ts" -ForegroundColor White
Write-Host "  2. Update src/lib/supabase.ts (see TODOs in that file)" -ForegroundColor White
Write-Host "  3. Install VS Code extensions (see chat above)" -ForegroundColor White
Write-Host ""
Write-Host "Useful Commands (use 'npx' prefix):" -ForegroundColor Yellow
Write-Host "  npx supabase gen types typescript --project-id YOUR_ID > src/types/database.types.ts" -ForegroundColor White
Write-Host "  npx supabase db push        - Push migrations to remote" -ForegroundColor White
Write-Host "  npx supabase db pull        - Pull schema from remote" -ForegroundColor White
Write-Host "  npx supabase projects list  - List your projects" -ForegroundColor White
Write-Host ""
Write-Host "Full documentation: SUPABASE_VSCODE_SETUP.md" -ForegroundColor Cyan
Write-Host ""
