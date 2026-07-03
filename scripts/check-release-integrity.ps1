[CmdletBinding()]
param(
  [string]$ReleaseTag = $env:RELEASE_TAG
)

$ErrorActionPreference = "Stop"

$RepoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Join-RepoPath {
  param([string]$RelativePath)
  return Join-Path $RepoRoot $RelativePath
}

function Read-RepoJson {
  param([string]$RelativePath)
  return Get-Content -Raw -LiteralPath (Join-RepoPath $RelativePath) | ConvertFrom-Json
}

function Read-RepoText {
  param([string]$RelativePath)
  return Get-Content -Raw -LiteralPath (Join-RepoPath $RelativePath)
}

function Assert-Equal {
  param(
    [string]$Name,
    [string]$Expected,
    [string]$Actual
  )

  if ($Actual -ne $Expected) {
    throw "$Name mismatch: expected '$Expected', got '$Actual'."
  }
}

function Assert-PathExists {
  param([string]$RelativePath)

  $Path = Join-RepoPath $RelativePath
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required release resource is missing: $RelativePath"
  }
}

$PackageJson = Read-RepoJson "package.json"
$PackageLock = Read-RepoText "package-lock.json"
$TauriConfig = Read-RepoJson "src-tauri/tauri.conf.json"
$CargoToml = Read-RepoText "src-tauri/Cargo.toml"
$CargoLock = Read-RepoText "src-tauri/Cargo.lock"

$ExpectedVersion = [string]$PackageJson.version

if ([string]::IsNullOrWhiteSpace($ExpectedVersion)) {
  throw "package.json version is empty."
}

if ($PackageLock -notmatch '(?ms)^\s*\{\s*"name"\s*:\s*"stackdrop"\s*,\s*"version"\s*:\s*"([^"]+)"') {
  throw "Could not find root version in package-lock.json."
}
Assert-Equal "package-lock.json root version" $ExpectedVersion $Matches[1]

if ($PackageLock -notmatch '(?ms)"packages"\s*:\s*\{\s*""\s*:\s*\{\s*"name"\s*:\s*"stackdrop"\s*,\s*"version"\s*:\s*"([^"]+)"') {
  throw "Could not find root package version in package-lock.json."
}
Assert-Equal "package-lock.json package version" $ExpectedVersion $Matches[1]
Assert-Equal "src-tauri/tauri.conf.json version" $ExpectedVersion ([string]$TauriConfig.version)

if ($CargoToml -notmatch '(?m)^version\s*=\s*"([^"]+)"') {
  throw "Could not find package version in src-tauri/Cargo.toml."
}
Assert-Equal "src-tauri/Cargo.toml version" $ExpectedVersion $Matches[1]

if ($CargoLock -notmatch '(?ms)\[\[package\]\]\s+name = "stackdrop"\s+version = "([^"]+)"') {
  throw "Could not find stackdrop package version in src-tauri/Cargo.lock."
}
Assert-Equal "src-tauri/Cargo.lock stackdrop version" $ExpectedVersion $Matches[1]

if (-not [string]::IsNullOrWhiteSpace($ReleaseTag)) {
  if ($ReleaseTag -notmatch '^v(.+)$') {
    throw "Release tag '$ReleaseTag' must start with 'v'."
  }
  Assert-Equal "release tag version" $ExpectedVersion $Matches[1]
}

$CurrentTag = "v$ExpectedVersion"
foreach ($DocPath in @("README.md", "docs/RELEASE.md")) {
  $DocText = Read-RepoText $DocPath
  if (-not $DocText.Contains($CurrentTag)) {
    throw "$DocPath does not reference current release tag $CurrentTag."
  }
}

$BundleResources = @($TauriConfig.bundle.resources | ForEach-Object { [string]$_ })
if ($BundleResources -notcontains "resources/windows-tools/**/*") {
  throw "src-tauri/tauri.conf.json must bundle resources/windows-tools/**/*."
}

$BundleTargets = @($TauriConfig.bundle.targets | ForEach-Object { [string]$_ })
if (($BundleTargets -notcontains "all") -and
    (($BundleTargets -notcontains "nsis") -or ($BundleTargets -notcontains "msi"))) {
  throw "src-tauri/tauri.conf.json must build all targets or both nsis and msi targets."
}

Assert-PathExists "src-tauri/resources/windows-tools/poppler/bin/pdftoppm.exe"
Assert-PathExists "src-tauri/resources/windows-tools/tesseract/tesseract.exe"
Assert-PathExists "src-tauri/resources/windows-tools/tesseract/tessdata/eng.traineddata"
Assert-PathExists "src-tauri/resources/windows-tools/tesseract/tessdata/osd.traineddata"
Assert-PathExists "src-tauri/resources/windows-tools/antiword/bin/antiword.exe"
Assert-PathExists "src-tauri/resources/windows-tools/antiword/share/antiword/Default"

$AntiwordSharePath = Join-RepoPath "src-tauri/resources/windows-tools/antiword/share/antiword"
if (-not (Test-Path -LiteralPath $AntiwordSharePath -PathType Container)) {
  throw "Antiword share directory is missing."
}

$AntiwordShareFileCount = @(Get-ChildItem -LiteralPath $AntiwordSharePath -File).Count
if ($AntiwordShareFileCount -eq 0) {
  throw "Antiword share directory has no data files."
}

Write-Host "Release integrity check passed for StackDrop $ExpectedVersion."
