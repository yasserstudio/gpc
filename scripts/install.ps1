# Install GPC standalone binary for Windows (PowerShell)
#
# Usage:
#   iwr https://raw.githubusercontent.com/yasserstudio/gpc/main/scripts/install.ps1 | iex
#   iwr ... | iex; Install-Gpc -Version v0.9.35
#   Install-Gpc -Dir "$env:USERPROFILE\.local\bin"

param(
  [string]$Version = "",
  [string]$Dir = "$env:LOCALAPPDATA\Programs\gpc"
)

$ErrorActionPreference = "Stop"

$Repo = "yasserstudio/gpc"
$Asset = "gpc-windows-x64.exe"

# Get release tag
if ($Version -ne "") {
  $Tag = $Version
} else {
  $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
  $Tag = $Release.tag_name
  if (-not $Tag) {
    Write-Error "Could not determine latest release."
    exit 1
  }
}

Write-Host "Release: $Tag"

$Url = "https://github.com/$Repo/releases/download/$Tag/$Asset"
Write-Host "Downloading $Url..."

$TmpFile = [System.IO.Path]::GetTempFileName() + ".exe"
try {
  Invoke-WebRequest -Uri $Url -OutFile $TmpFile -UseBasicParsing
} catch {
  Write-Error "Download failed: $_`nInstall via npm instead: npm install -g @gpc-cli/cli"
  exit 1
}

# Verify SHA-256 checksum if available
try {
  $ChecksumUrl = "https://github.com/$Repo/releases/download/$Tag/checksums.txt"
  $Checksums = Invoke-WebRequest -Uri $ChecksumUrl -UseBasicParsing -ErrorAction SilentlyContinue
  if ($Checksums -and $Checksums.Content) {
    $Expected = ($Checksums.Content -split "`n" | Where-Object { $_ -match $Asset }) -replace "\s+.*", ""
    if ($Expected) {
      $Actual = (Get-FileHash -Path $TmpFile -Algorithm SHA256).Hash.ToLower()
      if ($Actual -ne $Expected.Trim().ToLower()) {
        Write-Error "Checksum mismatch!`n  Expected: $Expected`n  Got:      $Actual"
        Remove-Item $TmpFile -Force
        exit 1
      }
      Write-Host "Checksum verified."
    }
  }
} catch {
  # Checksum file not available — proceed without verification
}

# Install
if (-not (Test-Path $Dir)) {
  New-Item -ItemType Directory -Path $Dir -Force | Out-Null
}

$Dest = Join-Path $Dir "gpc.exe"
Move-Item -Path $TmpFile -Destination $Dest -Force

# Add to PATH if not already present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$Dir*") {
  [Environment]::SetEnvironmentVariable("Path", "$UserPath;$Dir", "User")
  Write-Host "Added $Dir to user PATH (restart terminal to take effect)."
}

Write-Host "Installed: $Dest"
Write-Host "Run 'gpc --version' to verify."
