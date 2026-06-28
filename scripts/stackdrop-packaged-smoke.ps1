<#
.SYNOPSIS
  Creates and mutates a Windows filesystem corpus for StackDrop packaged-app smoke testing.

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stackdrop-packaged-smoke.ps1 -Action setup

.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\stackdrop-packaged-smoke.ps1 -Action mutate
#>

[CmdletBinding()]
param(
  [ValidateSet("setup", "mutate", "offline", "restore", "permission-denied", "restore-permissions", "clean", "queries")]
  [string]$Action = "setup",

  [string]$Root = (Join-Path ([Environment]::GetFolderPath("Desktop")) "StackDropManualTest"),

  [switch]$Force
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$OfflineRoot = "$Root.offline"
$ManifestName = "stackdrop-smoke-manifest.json"
$ManifestPath = Join-Path $Root $ManifestName
$OfflineManifestPath = Join-Path $OfflineRoot $ManifestName
$Identity = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name

$Tokens = [ordered]@{
  normalTxt = "STACKDROP_SMOKE_NORMAL_TXT_20260627"
  emptyTxt = "STACKDROP_SMOKE_EMPTY_TXT_20260627"
  hyphenFile = "STACKDROP_SMOKE_HYPHEN_FILE_20260627"
  underscoreFile = "STACKDROP_SMOKE_UNDERSCORE_FILE_20260627"
  nestedTxt = "STACKDROP_SMOKE_NESTED_TXT_20260627"
  docx = "STACKDROP_SMOKE_DOCX_20260627"
  pdfText = "STACKDROP_SMOKE_PDF_TEXT_20260627"
  corruptPdf = "STACKDROP_SMOKE_CORRUPT_PDF_20260627"
  unsupportedXlsx = "STACKDROP_SMOKE_UNSUPPORTED_XLSX_20260627"
  largeFile = "STACKDROP_SMOKE_LARGE_FILE_20260627"
  watcherCreate = "STACKDROP_SMOKE_WATCH_CREATE_20260627"
  watcherEditBefore = "STACKDROP_SMOKE_WATCH_EDIT_BEFORE_20260627"
  watcherEditAfter = "STACKDROP_SMOKE_WATCH_EDIT_AFTER_20260627"
  watcherRename = "STACKDROP_SMOKE_WATCH_RENAME_20260627"
  watcherMove = "STACKDROP_SMOKE_WATCH_MOVE_20260627"
  watcherDelete = "STACKDROP_SMOKE_WATCH_DELETE_20260627"
  permissionDenied = "STACKDROP_SMOKE_PERMISSION_DENIED_20260627"
}

function Get-RelativePath {
  param([string]$Path, [string]$Base = $Root)
  $fullBase = [IO.Path]::GetFullPath($Base).TrimEnd('\') + '\'
  $fullPath = [IO.Path]::GetFullPath($Path)
  if ($fullPath.StartsWith($fullBase, [StringComparison]::OrdinalIgnoreCase)) {
    return $fullPath.Substring($fullBase.Length).Replace('\', '/')
  }
  return $fullPath
}

function Ensure-Directory {
  param([string]$Path)
  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -ItemType Directory -Path $Path | Out-Null
  }
}

function Write-Utf8File {
  param([string]$Path, [string]$Content)
  Ensure-Directory -Path (Split-Path -Parent $Path)
  Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8
}

function Add-ZipEntry {
  param(
    [System.IO.Compression.ZipArchive]$Zip,
    [string]$EntryName,
    [string]$Content
  )
  $entry = $Zip.CreateEntry($EntryName)
  $stream = $entry.Open()
  try {
    $writer = [IO.StreamWriter]::new($stream, [Text.UTF8Encoding]::new($false))
    try {
      $writer.Write($Content)
    } finally {
      $writer.Dispose()
    }
  } finally {
    $stream.Dispose()
  }
}

function New-SmokeDocx {
  param([string]$Path, [string]$Token)
  Add-Type -AssemblyName System.IO.Compression
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  if (Test-Path -LiteralPath $Path) {
    Remove-Item -LiteralPath $Path -Force
  }
  Ensure-Directory -Path (Split-Path -Parent $Path)
  $zip = [System.IO.Compression.ZipFile]::Open($Path, [System.IO.Compression.ZipArchiveMode]::Create)
  try {
    Add-ZipEntry $zip "[Content_Types].xml" @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>
"@
    Add-ZipEntry $zip "_rels/.rels" @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>
"@
    Add-ZipEntry $zip "word/document.xml" @"
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:t>$Token</w:t></w:r></w:p>
<w:p><w:r><w:t>StackDrop smoke DOCX selectable text.</w:t></w:r></w:p>
</w:body>
</w:document>
"@
  } finally {
    $zip.Dispose()
  }
}

function Escape-PdfText {
  param([string]$Text)
  return $Text.Replace('\', '\\').Replace('(', '\(').Replace(')', '\)')
}

function New-SmokePdf {
  param([string]$Path, [string]$Token)
  Ensure-Directory -Path (Split-Path -Parent $Path)
  $pdfIntro = Escape-PdfText "StackDrop smoke PDF selectable text"
  $pdfToken = Escape-PdfText $Token
  $stream = "BT /F1 12 Tf 72 720 Td ($pdfIntro) Tj 0 -18 Td ($pdfToken) Tj ET"
  $objects = @(
    "1 0 obj`n<< /Type /Catalog /Pages 2 0 R >>`nendobj`n",
    "2 0 obj`n<< /Type /Pages /Kids [3 0 R] /Count 1 >>`nendobj`n",
    "3 0 obj`n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>`nendobj`n",
    "4 0 obj`n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`nendobj`n",
    "5 0 obj`n<< /Length $(([Text.Encoding]::ASCII.GetByteCount($stream))) >>`nstream`n$stream`nendstream`nendobj`n"
  )
  $encoding = [Text.Encoding]::ASCII
  $body = "%PDF-1.4`n"
  $offsets = @()
  foreach ($object in $objects) {
    $offsets += $encoding.GetByteCount($body)
    $body += $object
  }
  $xrefOffset = $encoding.GetByteCount($body)
  $xref = "xref`n0 $($objects.Count + 1)`n0000000000 65535 f `n"
  foreach ($offset in $offsets) {
    $xref += ("{0:0000000000} 00000 n `n" -f $offset)
  }
  $trailer = "trailer`n<< /Size $($objects.Count + 1) /Root 1 0 R >>`nstartxref`n$xrefOffset`n%%EOF`n"
  [IO.File]::WriteAllBytes($Path, $encoding.GetBytes($body + $xref + $trailer))
}

function New-LargeFile {
  param([string]$Path)
  Ensure-Directory -Path (Split-Path -Parent $Path)
  $bytes = [Text.Encoding]::UTF8.GetBytes("$($Tokens.largeFile)`r`nThis token should not be searchable because the file is larger than 50 MB.`r`n")
  $stream = [IO.File]::Open($Path, [IO.FileMode]::Create, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try {
    $stream.Write($bytes, 0, $bytes.Length)
    $stream.SetLength(52MB)
  } finally {
    $stream.Dispose()
  }
}

function Get-ExpectedQueries {
  $queries = @(
    [ordered]@{ phase = "setup"; query = $Tokens.normalTxt; expected = "normal.txt appears as Parsed text." },
    [ordered]@{ phase = "setup"; query = "empty.txt"; expected = "empty.txt appears by filename/path; body token is not expected." },
    [ordered]@{ phase = "setup"; query = "file-name-hyphen"; expected = "file-name-hyphen.txt appears." },
    [ordered]@{ phase = "setup"; query = "file_name_underscore"; expected = "file_name_underscore.txt appears." },
    [ordered]@{ phase = "setup"; query = $Tokens.nestedTxt; expected = "nested-note.txt appears from Nested folder." },
    [ordered]@{ phase = "setup"; query = $Tokens.docx; expected = "simple.docx appears as Parsed text if DOCX parser works in the package." },
    [ordered]@{ phase = "setup"; query = $Tokens.pdfText; expected = "selectable-text.pdf appears as Parsed text if bundled PDF parsing works." },
    [ordered]@{ phase = "setup"; query = "corrupt.pdf"; expected = "corrupt.pdf appears by filename and should show Parse failed in diagnostics/detail." },
    [ordered]@{ phase = "setup"; query = $Tokens.unsupportedXlsx; expected = "No result; .xlsx is unsupported and skipped." },
    [ordered]@{ phase = "setup"; query = "large-over-50mb"; expected = "large-over-50mb.txt appears by filename and should show a read failure." },
    [ordered]@{ phase = "mutate"; query = $Tokens.watcherCreate; expected = "watcher-created.txt appears after auto-index or manual re-index." },
    [ordered]@{ phase = "mutate"; query = $Tokens.watcherEditBefore; expected = "No result after edited file is re-indexed." },
    [ordered]@{ phase = "mutate"; query = $Tokens.watcherEditAfter; expected = "watcher-edit.txt appears after edit." },
    [ordered]@{ phase = "mutate"; query = "watcher-rename-before"; expected = "No result after rename is re-indexed." },
    [ordered]@{ phase = "mutate"; query = "watcher-rename-after"; expected = "watcher-rename-after.txt appears." },
    [ordered]@{ phase = "mutate"; query = "watcher-moved"; expected = "Moved/watcher-moved.txt appears." },
    [ordered]@{ phase = "mutate"; query = $Tokens.watcherDelete; expected = "No result after delete is re-indexed." },
    [ordered]@{ phase = "offline"; query = "Index Diagnostics"; expected = "After clicking Index library, the indexed root should show a root issue/unavailable error." },
    [ordered]@{ phase = "permission-denied"; query = $Tokens.permissionDenied; expected = "Usually no result; diagnostics should show a root issue or read failure depending Windows traversal behavior." }
  )
  return $queries
}

function Get-GeneratedFiles {
  if (-not (Test-Path -LiteralPath $Root)) {
    return @()
  }
  return Get-ChildItem -LiteralPath $Root -File -Recurse -Force -ErrorAction SilentlyContinue |
    Sort-Object FullName |
    ForEach-Object {
      [ordered]@{
        relativePath = Get-RelativePath -Path $_.FullName
        fullPath = $_.FullName
        sizeBytes = $_.Length
      }
    }
}

function Write-Manifest {
  param([string]$Path = $ManifestPath)
  $manifestRoot = Split-Path -Parent $Path
  Ensure-Directory -Path $manifestRoot
  $manifest = [ordered]@{
    generatedAt = (Get-Date).ToString("o")
    corpusPath = $Root
    offlinePath = $OfflineRoot
    manifestPath = $Path
    indexedRootToAddInStackDrop = $Root
    tokens = $Tokens
    generatedFiles = Get-GeneratedFiles
    expectedQueries = Get-ExpectedQueries
    mutationSteps = @(
      "create Watcher/watcher-created.txt",
      "edit Watcher/watcher-edit.txt from old token to new token",
      "rename Watcher/watcher-rename-before.txt to Watcher/watcher-rename-after.txt",
      "move Watcher/watcher-move-before.txt to Moved/watcher-moved.txt",
      "delete Watcher/watcher-delete.txt"
    )
    cleanupSteps = @(
      "Run restore-permissions before clean if permission-denied was used.",
      "Run clean to remove the corpus and offline copy."
    )
    commands = [ordered]@{
      setup = ".\scripts\stackdrop-packaged-smoke.ps1 -Action setup"
      mutate = ".\scripts\stackdrop-packaged-smoke.ps1 -Action mutate"
      offline = ".\scripts\stackdrop-packaged-smoke.ps1 -Action offline"
      restore = ".\scripts\stackdrop-packaged-smoke.ps1 -Action restore"
      permissionDenied = ".\scripts\stackdrop-packaged-smoke.ps1 -Action permission-denied"
      restorePermissions = ".\scripts\stackdrop-packaged-smoke.ps1 -Action restore-permissions"
      clean = ".\scripts\stackdrop-packaged-smoke.ps1 -Action clean"
    }
  }
  $manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $Path -Encoding UTF8
}

function Show-Queries {
  param([string]$Phase)
  $queries = Get-ExpectedQueries | Where-Object { $_.phase -eq $Phase }
  if ($queries.Count -eq 0) {
    Write-Host "No query list for phase '$Phase'."
    return
  }
  Write-Host ""
  Write-Host "StackDrop queries for phase '$Phase':"
  foreach ($item in $queries) {
    Write-Host ("  Query: {0}" -f $item.query)
    Write-Host ("    Expected: {0}" -f $item.expected)
  }
  Write-Host ""
}

function Invoke-Icacls {
  param([string[]]$Arguments)
  $output = & icacls @Arguments 2>&1
  if ($LASTEXITCODE -ne 0) {
    throw "icacls failed ($LASTEXITCODE): $($output -join "`n")"
  }
}

function Restore-SmokePermissions {
  foreach ($path in @($Root, $OfflineRoot)) {
    if (Test-Path -LiteralPath $path) {
      & icacls $path /remove:d $Identity /T /C | Out-Null
    }
  }
}

function Invoke-Setup {
  if ((Test-Path -LiteralPath $Root) -and -not $Force) {
    throw "Corpus already exists at '$Root'. Re-run with -Force or run -Action clean first."
  }
  if ($Force) {
    Invoke-Clean -Quiet
  }

  Ensure-Directory -Path $Root
  Ensure-Directory -Path (Join-Path $Root "Nested")
  Ensure-Directory -Path (Join-Path $Root "Watcher")
  Ensure-Directory -Path (Join-Path $Root "Moved")

  Write-Utf8File (Join-Path $Root "normal.txt") "$($Tokens.normalTxt)`r`nNormal StackDrop smoke text file."
  New-Item -ItemType File -Path (Join-Path $Root "empty.txt") -Force | Out-Null
  Write-Utf8File (Join-Path $Root "file-name-hyphen.txt") "$($Tokens.hyphenFile)`r`nHyphen filename smoke file."
  Write-Utf8File (Join-Path $Root "file_name_underscore.txt") "$($Tokens.underscoreFile)`r`nUnderscore filename smoke file."
  Write-Utf8File (Join-Path $Root "Nested\nested-note.txt") "$($Tokens.nestedTxt)`r`nNested StackDrop smoke file."
  New-SmokeDocx (Join-Path $Root "simple.docx") $Tokens.docx
  New-SmokePdf (Join-Path $Root "selectable-text.pdf") $Tokens.pdfText
  Write-Utf8File (Join-Path $Root "corrupt.pdf") "%PDF-1.4`r`nThis is intentionally corrupt. $($Tokens.corruptPdf)"
  Write-Utf8File (Join-Path $Root "unsupported-placeholder.xlsx") "$($Tokens.unsupportedXlsx)`r`nThis is intentionally not a real XLSX and should be skipped by extension."
  New-LargeFile (Join-Path $Root "large-over-50mb.txt")

  Write-Utf8File (Join-Path $Root "Watcher\watcher-edit.txt") "$($Tokens.watcherEditBefore)`r`nThis file will be edited by the mutate phase."
  Write-Utf8File (Join-Path $Root "Watcher\watcher-rename-before.txt") "$($Tokens.watcherRename)`r`nThis file will be renamed by the mutate phase."
  Write-Utf8File (Join-Path $Root "Watcher\watcher-move-before.txt") "$($Tokens.watcherMove)`r`nThis file will be moved by the mutate phase."
  Write-Utf8File (Join-Path $Root "Watcher\watcher-delete.txt") "$($Tokens.watcherDelete)`r`nThis file will be deleted by the mutate phase."

  Write-Manifest
  Write-Host "Created StackDrop smoke corpus:"
  Write-Host "  $Root"
  Write-Host "Manifest:"
  Write-Host "  $ManifestPath"
  Write-Host ""
  Write-Host "In the installed StackDrop app, add/index this folder:"
  Write-Host "  $Root"
  Show-Queries -Phase "setup"
}

function Invoke-Mutate {
  if (-not (Test-Path -LiteralPath $Root)) {
    throw "Corpus does not exist at '$Root'. Run setup first."
  }
  Ensure-Directory -Path (Join-Path $Root "Watcher")
  Ensure-Directory -Path (Join-Path $Root "Moved")

  Write-Utf8File (Join-Path $Root "Watcher\watcher-created.txt") "$($Tokens.watcherCreate)`r`nCreated while StackDrop is open."
  Write-Utf8File (Join-Path $Root "Watcher\watcher-edit.txt") "$($Tokens.watcherEditAfter)`r`nEdited while StackDrop is open."

  $renameBefore = Join-Path $Root "Watcher\watcher-rename-before.txt"
  $renameAfter = Join-Path $Root "Watcher\watcher-rename-after.txt"
  if (Test-Path -LiteralPath $renameBefore) {
    Move-Item -LiteralPath $renameBefore -Destination $renameAfter -Force
  }

  $moveBefore = Join-Path $Root "Watcher\watcher-move-before.txt"
  $moveAfter = Join-Path $Root "Moved\watcher-moved.txt"
  if (Test-Path -LiteralPath $moveBefore) {
    Move-Item -LiteralPath $moveBefore -Destination $moveAfter -Force
  }

  $deletePath = Join-Path $Root "Watcher\watcher-delete.txt"
  if (Test-Path -LiteralPath $deletePath) {
    Remove-Item -LiteralPath $deletePath -Force
  }

  Write-Manifest
  Write-Host "Applied watcher mutations under:"
  Write-Host "  $Root"
  Write-Host "Keep StackDrop open with auto-index enabled, or click Index library now."
  Show-Queries -Phase "mutate"
}

function Invoke-Offline {
  if (-not (Test-Path -LiteralPath $Root)) {
    if (Test-Path -LiteralPath $OfflineRoot) {
      Write-Host "Corpus is already offline:"
      Write-Host "  $OfflineRoot"
      Show-Queries -Phase "offline"
      return
    }
    throw "Corpus does not exist at '$Root'. Run setup first."
  }
  if (Test-Path -LiteralPath $OfflineRoot) {
    throw "Offline path already exists at '$OfflineRoot'. Run restore or clean first."
  }
  Move-Item -LiteralPath $Root -Destination $OfflineRoot
  Write-Manifest -Path $OfflineManifestPath
  Write-Host "Moved indexed root offline:"
  Write-Host "  From: $Root"
  Write-Host "  To:   $OfflineRoot"
  Write-Host "In StackDrop, click Index library. Existing rows should remain, and diagnostics should show a root issue."
  Show-Queries -Phase "offline"
}

function Invoke-Restore {
  if (Test-Path -LiteralPath $Root) {
    Write-Host "Corpus is already restored:"
    Write-Host "  $Root"
    return
  }
  if (-not (Test-Path -LiteralPath $OfflineRoot)) {
    throw "Offline corpus does not exist at '$OfflineRoot'."
  }
  Move-Item -LiteralPath $OfflineRoot -Destination $Root
  Write-Manifest
  Write-Host "Restored indexed root:"
  Write-Host "  $Root"
  Write-Host "In StackDrop, click Index library. The diagnostics root issue should clear after a successful scan."
}

function Invoke-PermissionDenied {
  if (-not (Test-Path -LiteralPath $Root)) {
    throw "Corpus does not exist at '$Root'. Run setup first."
  }
  $restricted = Join-Path $Root "PermissionDenied"
  Ensure-Directory -Path $restricted
  Write-Utf8File (Join-Path $restricted "permission-denied-token.txt") "$($Tokens.permissionDenied)`r`nThis folder will deny read/list access to the current user."
  Invoke-Icacls @($restricted, "/deny", "$($Identity):(OI)(CI)RX")
  Write-Manifest
  Write-Host "Created restricted folder:"
  Write-Host "  $restricted"
  Write-Host "Denied read/list permissions for:"
  Write-Host "  $Identity"
  Write-Host "In StackDrop, click Index library. Diagnostics should show a root issue or read failure depending Windows traversal behavior."
  Show-Queries -Phase "permission-denied"
}

function Invoke-RestorePermissions {
  Restore-SmokePermissions
  if (Test-Path -LiteralPath $Root) {
    Write-Manifest
  } elseif (Test-Path -LiteralPath $OfflineRoot) {
    Write-Manifest -Path $OfflineManifestPath
  }
  Write-Host "Removed explicit deny ACEs for:"
  Write-Host "  $Identity"
  Write-Host "Targets checked:"
  Write-Host "  $Root"
  Write-Host "  $OfflineRoot"
}

function Invoke-Clean {
  param([switch]$Quiet)
  Restore-SmokePermissions
  foreach ($path in @($Root, $OfflineRoot)) {
    if (Test-Path -LiteralPath $path) {
      Remove-Item -LiteralPath $path -Recurse -Force
      if (-not $Quiet) {
        Write-Host "Removed $path"
      }
    }
  }
  if (-not $Quiet) {
    Write-Host "Clean complete."
  }
}

switch ($Action) {
  "setup" { Invoke-Setup }
  "mutate" { Invoke-Mutate }
  "offline" { Invoke-Offline }
  "restore" { Invoke-Restore }
  "permission-denied" { Invoke-PermissionDenied }
  "restore-permissions" { Invoke-RestorePermissions }
  "clean" { Invoke-Clean }
  "queries" {
    foreach ($phase in @("setup", "mutate", "offline", "permission-denied")) {
      Show-Queries -Phase $phase
    }
  }
}
