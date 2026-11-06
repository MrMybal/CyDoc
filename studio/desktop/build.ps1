param(
    [Parameter(Mandatory=$true)][string]$CyToolsCoreRoot,
    [Parameter(Mandatory=$true)][string]$CyUIRoot,
    [Parameter(Mandatory=$true)][string]$CefRoot,
    [string]$CefSdkRoot,
    [string]$CefBridgeRoot,
    [string]$NodeLicense,
    [string]$OutputDirectory,
    [string]$Python = 'python',
    [switch]$SkipInstall
)
$ErrorActionPreference = 'Stop'
$studioRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$repositoryRoot = (Resolve-Path (Join-Path $studioRoot '..')).Path
if (-not $OutputDirectory) { $OutputDirectory = Join-Path $repositoryRoot 'artifacts/CyDocStudio-Windows' }
$packageRoot = [IO.Path]::GetFullPath($OutputDirectory)
if (Test-Path -LiteralPath $packageRoot) {
    if (Get-ChildItem -LiteralPath $packageRoot -Force | Select-Object -First 1) { throw 'Use a fresh output directory; existing distributions are preserved.' }
}
foreach ($dependencyRoot in @($CyToolsCoreRoot,$CyUIRoot)) {
    if (-not (Test-Path -LiteralPath (Join-Path $dependencyRoot 'LICENSE'))) { throw "Missing MIT license in dependency: $dependencyRoot" }
    if (-not ((Get-Content -LiteralPath (Join-Path $dependencyRoot 'LICENSE') -Raw) -match 'MIT License')) { throw 'This build requires the MIT editions of CyToolsCore and CyUI.' }
}
foreach ($file in @('cyui_webcef_bridge.dll','cyui_webcef_helper.exe','libcef.dll','icudtl.dat')) {
    if (-not (Test-Path -LiteralPath (Join-Path $CefRoot $file))) { throw "Missing CEF runtime component: $file" }
}
if ($CefBridgeRoot) {
    foreach ($file in @('cyui_webcef_bridge.dll','cyui_webcef_helper.exe')) {
        if (-not (Test-Path -LiteralPath (Join-Path $CefBridgeRoot $file))) { throw "Missing matching rebuilt CyUI component: $file" }
    }
}
if (-not $CefSdkRoot) {
    $cache = Join-Path $CefRoot 'CMakeCache.txt'
    if (Test-Path -LiteralPath $cache) {
        $line = Get-Content -LiteralPath $cache | Where-Object { $_ -like 'CYUI_CEF_ROOT:PATH=*' } | Select-Object -First 1
        if ($line) { $CefSdkRoot = $line.Substring('CYUI_CEF_ROOT:PATH='.Length) }
    }
}
if (-not $CefSdkRoot) { $CefSdkRoot = $CefRoot }
foreach ($file in @('LICENSE.txt','CREDITS.html')) {
    if (-not (Test-Path -LiteralPath (Join-Path $CefSdkRoot $file))) { throw "Supply -CefSdkRoot containing CEF's $file notice." }
}
if (-not $NodeLicense) { $NodeLicense = Join-Path (Split-Path (Get-Command node).Source) 'LICENSE' }
if (-not (Test-Path -LiteralPath $NodeLicense)) { throw 'Supply -NodeLicense with the complete LICENSE file for the installed Node.js version.' }
$privatePython = Join-Path $studioRoot 'runtime/python/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $privatePython)) { & $Python -m venv (Join-Path $studioRoot 'runtime/python'); if ($LASTEXITCODE) { throw 'Python environment creation failed.' } }
if (-not $SkipInstall) {
    & $privatePython -m pip install --keyring-provider disabled "$CyToolsCoreRoot[mcp]" $CyUIRoot PyOpenGL Pillow PyInstaller
    if ($LASTEXITCODE) { throw 'Desktop dependency installation failed.' }
}
Push-Location $repositoryRoot
try {
    npm run build
    if ($LASTEXITCODE) { throw 'CyDoc build failed.' }
    npm run build --prefix studio
    if ($LASTEXITCODE) { throw 'Studio build failed.' }
    node studio/desktop/manifest.mjs
    $workRoot = Join-Path $repositoryRoot ('.tmp/desktop-build-' + [guid]::NewGuid().ToString('N'))
    New-Item -ItemType Directory -Force -Path $workRoot,$packageRoot | Out-Null
    $pyiArgs = @('-m','PyInstaller','--noconfirm','--clean','--console','--onedir','--name','CyDocStudioRuntime','--contents-directory','_internal','--distpath',(Join-Path $workRoot 'frozen'),'--workpath',(Join-Path $workRoot 'work'),'--specpath',$workRoot,'--paths',(Join-Path $PSScriptRoot 'app'),'--collect-all','cytools_core','--hidden-import','mcp.server.lowlevel','--hidden-import','mcp.server.stdio','--copy-metadata','mcp','--collect-all','cyui_modules','--collect-all','imgui_bundle','--collect-all','OpenGL','--add-data',((Join-Path $PSScriptRoot 'app/CyTool.json') + ';.'),(Join-Path $PSScriptRoot 'app/entry.py'))
    $env:PYINSTALLER_CONFIG_DIR = Join-Path $workRoot 'cache'
    & $privatePython @pyiArgs *> (Join-Path $workRoot 'pyinstaller.log')
    if ($LASTEXITCODE) { throw "Desktop freezing failed; see $workRoot/pyinstaller.log" }
    $nativeRuntime = Join-Path $packageRoot 'runtime/desktop'
    New-Item -ItemType Directory -Force -Path $nativeRuntime | Out-Null
    Copy-Item -Path (Join-Path $workRoot 'frozen/CyDocStudioRuntime/*') -Destination $nativeRuntime -Recurse
    $nodeCommand = (Get-Command node).Source
    Copy-Item -LiteralPath $nodeCommand -Destination (Join-Path $packageRoot 'runtime/node.exe')
    $cefDestination = Join-Path $packageRoot 'runtime/cef'
    New-Item -ItemType Directory -Force -Path $cefDestination | Out-Null
    # Runtime files only: do not ship SDK objects, caches or a developer profile.
    foreach ($name in @('cyui_webcef_bridge.dll','cyui_webcef_helper.exe','libcef.dll','chrome_elf.dll','d3dcompiler_47.dll','libEGL.dll','libGLESv2.dll','vk_swiftshader.dll','vk_swiftshader_icd.json','vulkan-1.dll','icudtl.dat','resources.pak','chrome_100_percent.pak','chrome_200_percent.pak','v8_context_snapshot.bin','snapshot_blob.bin','LICENSE.txt','CREDITS.html')) {
        $source = Join-Path $CefRoot $name
        if (Test-Path -LiteralPath $source) { Copy-Item -LiteralPath $source -Destination $cefDestination }
    }
    Copy-Item -LiteralPath (Join-Path $CefRoot 'locales') -Destination $cefDestination -Recurse
    if ($CefBridgeRoot) {
        foreach ($file in @('cyui_webcef_bridge.dll','cyui_webcef_helper.exe')) {
            Copy-Item -LiteralPath (Join-Path $CefBridgeRoot $file) -Destination $cefDestination -Force
        }
    }
    $application = Join-Path $packageRoot 'app/cydoc'
    New-Item -ItemType Directory -Force -Path $application | Out-Null
    foreach ($folder in @('tools','web','ai','node_modules')) { Copy-Item -LiteralPath (Join-Path $repositoryRoot $folder) -Destination $application -Recurse }
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'dist') -Destination $application -Recurse
    foreach ($file in @('package.json','LICENSE')) { Copy-Item -LiteralPath (Join-Path $repositoryRoot $file) -Destination $application }
    $studioApplication = Join-Path $application 'studio'
    New-Item -ItemType Directory -Force -Path $studioApplication | Out-Null
    foreach ($folder in @('server','dist','sdk','node_modules')) { Copy-Item -LiteralPath (Join-Path $studioRoot $folder) -Destination $studioApplication -Recurse }
    Copy-Item -LiteralPath (Join-Path $studioRoot 'package.json') -Destination $studioApplication
    $licences = Join-Path $packageRoot 'LICENCES'
    New-Item -ItemType Directory -Force -Path $licences | Out-Null
    Copy-Item -LiteralPath (Join-Path $CyToolsCoreRoot 'LICENSE') -Destination (Join-Path $licences 'CyToolsCore-MIT.txt')
    Copy-Item -LiteralPath (Join-Path $CyUIRoot 'LICENSE') -Destination (Join-Path $licences 'CyUI-MIT.txt')
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'LICENSE') -Destination (Join-Path $licences 'CyDoc-MIT.txt')
    Copy-Item -LiteralPath $NodeLicense -Destination (Join-Path $licences 'Node.js.txt')
    Copy-Item -LiteralPath (Join-Path $CefSdkRoot 'LICENSE.txt') -Destination (Join-Path $licences 'CEF.txt')
    Copy-Item -LiteralPath (Join-Path $CefSdkRoot 'CREDITS.html') -Destination (Join-Path $licences 'Chromium-CREDITS.html')
    Copy-Item -LiteralPath (Join-Path $studioRoot 'LICENCES.md') -Destination $licences
    & $privatePython (Join-Path $PSScriptRoot 'collect_notices.py') (Join-Path $licences 'Python-components')
    if ($LASTEXITCODE) { throw 'Python component notice collection failed.' }
    & $privatePython (Join-Path $PSScriptRoot 'prepare_package.py') $packageRoot
    if ($LASTEXITCODE) { throw 'Runtime packaging failed.' }
    # PyInstaller includes Python package distribution metadata; retain it with the runtime.
    @'
# CyDoc Studio for Windows

Start `CyDocStudio.exe`. Keep `app/`, `runtime/` and `LICENCES/` beside it.

The local editor opens directly. No account, password or sign-in is required. Existing local projects remain available. User projects/settings are stored in `%LOCALAPPDATA%/CyDocStudio`; pass `--data PATH` to choose another private location.

The editor works with folder projects without Git. Git and remote repositories are optional. Accounts and team invitations are used only when connecting to an online service. Complete the English and French pages before publishing. Published `Documentation/Documentation.html` works without Studio or a server.

On the Projects screen, use Open the CyDoc example to create an editable copy with English/French pages, media, diagrams and API examples. Editor, Documentation, Options and Local MCP / SDK are full-window tabs. Documentation opens its own bundled reader; the Editor tab retains your working document.

Use Options for English/French, theme, text size and opening allowed application folders. Local MCP / SDK shows a configuration template; no Studio token is needed for the local workspace. An online connection requires a token from the Account panel. Give independent MCP processes different private job directories.

The command-line executable is `runtime/desktop/CyDocStudioRuntime.exe --tool`. Pass `--data-dir YOUR_PRIVATE_JOB_DIRECTORY mcp` for MCP, with CYDOC_STUDIO_ORIGIN in its environment. Set CYDOC_STUDIO_TOKEN only for an account-based service.

Sources and deployment guide: https://github.com/MrMybal/CyDoc/tree/main/studio
Component notices: LICENCES/ and runtime dependency notices. This Python CyUI CEF bridge runs without the CEF process sandbox on Windows; see the source deployment guide for that boundary.
'@ | Set-Content -LiteralPath (Join-Path $packageRoot 'README.md') -Encoding utf8
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
    $visualStudio = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if (-not $visualStudio) { throw 'MSVC C++ build tools are required for the native Windows launcher.' }
    $developerShell = Join-Path $visualStudio 'Common7/Tools/VsDevCmd.bat'
    $batch = Join-Path $workRoot 'launcher.bat'
    @"
@echo off
call "$developerShell" -arch=x64 -host_arch=x64 >nul
cl /nologo /std:c++17 /EHsc /O2 /MT "$PSScriptRoot/launcher.cpp" /Fe:"$packageRoot/CyDocStudio.exe" /Fo:"$workRoot/launcher.obj" /link /SUBSYSTEM:WINDOWS user32.lib shell32.lib
"@ | Set-Content -LiteralPath $batch -Encoding ascii
    & cmd.exe /c $batch
    if ($LASTEXITCODE) { throw 'Native launcher compilation failed.' }
    Write-Output "Windows application: $packageRoot/CyDocStudio.exe"
    Write-Output "Local MCP/CLI: $nativeRuntime/CyDocStudioRuntime.exe --tool --data-dir YOUR_PRIVATE_JOB_DIRECTORY mcp"
} finally { Pop-Location }
