# CSV Formatter - Makes CSVs more readable
# Run this to clean and format your CSV files

param(
    [string]$InputFile,
    [string]$OutputFile = $null
)

if (-not $InputFile) {
    Write-Host "Usage: .\format-csv.ps1 -InputFile 'path\to\file.csv' [-OutputFile 'path\to\output.csv']" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Example:" -ForegroundColor Cyan
    Write-Host "  .\format-csv.ps1 -InputFile 'nfl_2025_offensive_stats.csv'" -ForegroundColor Gray
    exit
}

if (-not $OutputFile) {
    $OutputFile = $InputFile
}

Write-Host "Formatting CSV: $InputFile" -ForegroundColor Cyan

# Read CSV
$data = Import-Csv $InputFile

# Get column names
$columns = $data[0].PSObject.Properties.Name

Write-Host "Found $($data.Count) rows and $($columns.Count) columns" -ForegroundColor Green

# Calculate max width for each column
$columnWidths = @{}
foreach ($col in $columns) {
    $maxWidth = $col.Length
    foreach ($row in $data) {
        $value = $row.$col
        if ($value -and $value.Length -gt $maxWidth) {
            $maxWidth = $value.Length
        }
    }
    $columnWidths[$col] = $maxWidth
}

# Create formatted output
$output = @()

# Add header
$headerLine = ($columns | ForEach-Object { $_.PadRight($columnWidths[$_]) }) -join ","
$output += $headerLine

# Add rows
foreach ($row in $data) {
    $rowLine = ($columns | ForEach-Object { 
        $value = $row.$_
        if ($value) {
            $value.PadRight($columnWidths[$_])
        } else {
            "".PadRight($columnWidths[$_])
        }
    }) -join ","
    $output += $rowLine
}

# Save
$output | Out-File -FilePath $OutputFile -Encoding UTF8

Write-Host "✓ Formatted CSV saved to: $OutputFile" -ForegroundColor Green
Write-Host ""
Write-Host "Column Widths:" -ForegroundColor Cyan
foreach ($col in $columns) {
    Write-Host "  $col : $($columnWidths[$col])" -ForegroundColor Gray
}
