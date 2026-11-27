param(
    [string]$CyMCPSDKRoot = 'D:/_Project/CyMCPSDK',
    [Parameter(Mandatory=$true)][string]$CyUIRoot,
    [string]$CurlRoot,
    [string]$BuildDirectory,
    [switch]$Test
)
$ErrorActionPreference = 'Stop'
$repository = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
if (-not $BuildDirectory) { $BuildDirectory = Join-Path $repository '.tmp/cymcp-native' }
$sdk = (Resolve-Path -LiteralPath $CyMCPSDKRoot).Path
$revision = & git -c "safe.directory=$($sdk.Replace('\','/'))" -C $sdk rev-parse HEAD
if ($LASTEXITCODE -or $revision -ne '35d2d4fd85982d3d0ba278594e85fa37f325b4f2') { throw 'Use the validated CyMCPSDK 0.7.5 revision 35d2d4f, including bounded local discovery.' }
$cmake = (Get-Command cmake -ErrorAction SilentlyContinue).Source
if (-not $cmake) {
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
    $vs = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    $cmake = Join-Path $vs 'Common7/IDE/CommonExtensions/Microsoft/CMake/CMake/bin/cmake.exe'
}
if (-not $CurlRoot -and (Test-Path -LiteralPath (Join-Path $sdk '.tools/curl/windows-x64'))) { $CurlRoot = Join-Path $sdk '.tools/curl/windows-x64' }
$configure = @('-S', (Join-Path $PSScriptRoot 'native'), '-B', $BuildDirectory, '-G', 'Visual Studio 17 2022', '-A', 'x64', "-DCYDOC_CYMCP_SOURCE_DIR=$sdk", "-DCYMCP_CYUI_SOURCE_DIR=$CyUIRoot")
if ($CurlRoot) { $configure += @("-DCURL_ROOT=$CurlRoot", "-DCURL_DIR=$CurlRoot/lib/cmake/CURL") }
& $cmake @configure
if ($LASTEXITCODE) { throw 'CyMCPSDK configuration failed.' }
& $cmake --build $BuildDirectory --config Release --parallel 6
if ($LASTEXITCODE) { throw 'CyMCPSDK host compilation failed.' }
& node (Join-Path $PSScriptRoot 'manifest.mjs')
if ($LASTEXITCODE) { throw 'Operation catalogue generation failed.' }
if ($Test) {
    & (Join-Path (Split-Path $cmake) 'ctest.exe') --test-dir (Join-Path $BuildDirectory 'sdk') -C Release --output-on-failure
    if ($LASTEXITCODE) { throw 'CyMCPSDK tests failed.' }
}
Write-Output "Built CyMCPSDK 0.7.5 from $revision"
Write-Output (Join-Path $BuildDirectory 'Release/CyDocStudioHost.exe')
