param(
    [Parameter(Mandatory=$true)][string]$AppDirectory,
    [Parameter(Mandatory=$true)][string]$OutputDirectory,
    [string]$CyInstallerRoot = 'D:/_Project/CyInstaller',
    [string]$SigningKey = $env:CYINSTALLER_SIGNING_KEY_FILE,
    [string]$Previous,
    [switch]$OfflineOnly
)
$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$application = (Resolve-Path -LiteralPath $AppDirectory).Path
$output = [IO.Path]::GetFullPath($OutputDirectory)
if ($output.Equals($application,[StringComparison]::OrdinalIgnoreCase) -or $output.StartsWith($application+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Keep release outputs outside the payload directory.' }
$engine = Join-Path $CyInstallerRoot 'build/bin/Release/cyinstall.exe'
$ui = Join-Path (Split-Path $engine) 'cyinstall-ui.exe'
if (-not (Test-Path -LiteralPath $engine) -or -not (Test-Path -LiteralPath $ui)) { throw 'Supply a trusted CyInstaller build with its matching UI.' }
if (-not $SigningKey -or -not (Test-Path -LiteralPath $SigningKey)) { throw 'Set -SigningKey or CYINSTALLER_SIGNING_KEY_FILE to the private key stored outside the repository.' }
$keyPath = (Resolve-Path -LiteralPath $SigningKey).Path
if ($keyPath.StartsWith($repository+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Keep the publisher private key outside this repository.' }
if (Test-Path -LiteralPath (Join-Path $application '_cyinstall')) { throw 'Use the compiled payload; CyInstaller creates its own managed engine folder.' }
$version = (Get-Content -LiteralPath (Join-Path $repository 'studio/package.json') -Raw | ConvertFrom-Json).version
$payloadVersion = (Get-Content -LiteralPath (Join-Path $application 'app/cydoc/studio/package.json') -Raw | ConvertFrom-Json).version
if ($version -ne $payloadVersion) { throw 'The payload version must match the Studio source and changelog.' }
$manifest = Join-Path $repository '.cyinstaller/cyinstaller.json'
& $engine manifest validate $manifest
if ($LASTEXITCODE) { throw 'CyInstaller manifest validation failed.' }
$arguments = @('release','--manifest',$manifest,'--changelog',(Join-Path $repository 'CHANGELOG.md'),'--app-dir',$application,'--version',$version,'--platform','win-x64','--out',$output,'--key',$keyPath)
if ($Previous) { $arguments += @('--previous',(Resolve-Path -LiteralPath $Previous).Path) }
if ($OfflineOnly) { $arguments += '--no-websetup' }
& $engine @arguments
if ($LASTEXITCODE) { throw 'CyInstaller release generation failed.' }
Write-Output 'Local signed release prepared. Nothing was uploaded or published.'
