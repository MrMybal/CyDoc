param(
    [string]$CyMCPSDKRoot = 'D:/_Project/CyMCPSDK',
    [string]$CurlRoot,
    [Parameter(Mandatory=$true)][string]$CyUIRoot,
    [Parameter(Mandatory=$true)][string]$CefRoot,
    [string]$CefSdkRoot,
    [string]$CefBridgeRoot,
    [string]$NodeLicense,
    [string]$OutputDirectory,
    [string]$NativeBuildDirectory,
    [string]$CyInstallerRoot = 'D:/_Project/CyInstaller',
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
foreach ($dependencyRoot in @($CyMCPSDKRoot,$CyUIRoot)) {
    if (-not (Test-Path -LiteralPath (Join-Path $dependencyRoot 'LICENSE'))) { throw "Missing MIT license in dependency: $dependencyRoot" }
    if (-not ((Get-Content -LiteralPath (Join-Path $dependencyRoot 'LICENSE') -Raw) -match 'MIT License')) { throw 'This build requires the MIT editions of CyMCPSDK and CyUI.' }
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
    & $privatePython -m pip install --keyring-provider disabled $CyUIRoot PyOpenGL Pillow PyInstaller
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
    if (-not $NativeBuildDirectory) { $NativeBuildDirectory = Join-Path $workRoot 'native' }
    & (Join-Path $PSScriptRoot 'build-native.ps1') -CyMCPSDKRoot $CyMCPSDKRoot -CyUIRoot $CyUIRoot -CurlRoot $CurlRoot -BuildDirectory $NativeBuildDirectory -Test
    if ($LASTEXITCODE) { throw 'Native SDK host build failed.' }
    $pyiArgs = @('-m','PyInstaller','--noconfirm','--clean','--console','--onedir','--name','CyDocStudioRuntime','--contents-directory','_internal','--distpath',(Join-Path $workRoot 'frozen'),'--workpath',(Join-Path $workRoot 'work'),'--specpath',$workRoot,'--paths',(Join-Path $PSScriptRoot 'app'),'--collect-all','cyui_modules','--collect-all','imgui_bundle','--collect-submodules','OpenGL','--copy-metadata','PyOpenGL','--add-data',((Join-Path $PSScriptRoot 'app/CyMCP.json') + ';.'),(Join-Path $PSScriptRoot 'app/entry.py'))
    $env:PYINSTALLER_CONFIG_DIR = Join-Path $workRoot 'cache'
    & $privatePython @pyiArgs *> (Join-Path $workRoot 'pyinstaller.log')
    if ($LASTEXITCODE) { throw "Desktop freezing failed; see $workRoot/pyinstaller.log" }
    $nativeRuntime = Join-Path $packageRoot 'runtime/desktop'
    New-Item -ItemType Directory -Force -Path $nativeRuntime | Out-Null
    Copy-Item -Path (Join-Path $workRoot 'frozen/CyDocStudioRuntime/*') -Destination $nativeRuntime -Recurse
    Copy-Item -LiteralPath (Join-Path $NativeBuildDirectory 'Release/CyDocStudioHost.exe') -Destination $nativeRuntime
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
    foreach ($folder in @('tools','web','ai')) { Copy-Item -LiteralPath (Join-Path $repositoryRoot $folder) -Destination $application -Recurse }
    & node (Join-Path $PSScriptRoot 'copy-runtime.mjs') $repositoryRoot $application marked prismjs esbuild three
    if ($LASTEXITCODE) { throw 'Reader runtime dependency packaging failed.' }
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'dist') -Destination $application -Recurse
    foreach ($file in @('package.json','LICENSE')) { Copy-Item -LiteralPath (Join-Path $repositoryRoot $file) -Destination $application }
    New-Item -ItemType Directory -Force -Path (Join-Path $application 'src') | Out-Null
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'src/viewer.css') -Destination (Join-Path $application 'src/viewer.css')
    $studioApplication = Join-Path $application 'studio'
    New-Item -ItemType Directory -Force -Path $studioApplication | Out-Null
    foreach ($folder in @('server','dist','sdk')) { Copy-Item -LiteralPath (Join-Path $studioRoot $folder) -Destination $studioApplication -Recurse }
    & node (Join-Path $PSScriptRoot 'copy-runtime.mjs') $studioRoot $studioApplication yjs ws fflate
    if ($LASTEXITCODE) { throw 'Studio runtime dependency packaging failed.' }
    Copy-Item -LiteralPath (Join-Path $studioRoot 'package.json') -Destination $studioApplication
    $licences = Join-Path $packageRoot 'LICENCES'
    New-Item -ItemType Directory -Force -Path $licences | Out-Null
    Copy-Item -LiteralPath (Join-Path $CyMCPSDKRoot 'LICENSE') -Destination (Join-Path $licences 'CyMCPSDK-MIT.txt')
    Copy-Item -LiteralPath (Join-Path $CyMCPSDKRoot 'THIRD_PARTY_NOTICES.md') -Destination (Join-Path $licences 'CyMCPSDK-third-party.md')
    $sdkNotices = @('nlohmann/LICENSE.MIT','httplib/LICENSE','picosha2/LICENSE','curl/COPYING')
    foreach ($notice in $sdkNotices) { Copy-Item -LiteralPath (Join-Path $CyMCPSDKRoot ('third_party/'+$notice)) -Destination (Join-Path $licences ('CyMCPSDK-'+$notice.Replace('/','-'))) }
    foreach ($notice in @('THIRD_PARTY_NOTICES.md','third_party/imgui/LICENSE.txt','third_party/md4c/LICENSE.md','third_party/lexilla/License.txt','third_party/scintilla/License.txt','third_party/SciTE-Properties-License.txt','third_party/jetbrains-mono/OFL.txt')) {
        Copy-Item -LiteralPath (Join-Path $CyUIRoot $notice) -Destination (Join-Path $licences ('CyUI-'+$notice.Replace('/','-')))
    }
    'CyMCPSDK 0.7.5 / 35d2d4fd85982d3d0ba278594e85fa37f325b4f2' | Set-Content -LiteralPath (Join-Path $licences 'CyMCPSDK-revision.txt') -Encoding utf8

    Copy-Item -LiteralPath (Join-Path $CyUIRoot 'LICENSE') -Destination (Join-Path $licences 'CyUI-MIT.txt')
    Copy-Item -LiteralPath (Join-Path $repositoryRoot 'LICENSE') -Destination (Join-Path $licences 'CyDoc-MIT.txt')
    Copy-Item -LiteralPath $NodeLicense -Destination (Join-Path $licences 'Node.js.txt')
    Copy-Item -LiteralPath (Join-Path $CefSdkRoot 'LICENSE.txt') -Destination (Join-Path $licences 'CEF.txt')
    Copy-Item -LiteralPath (Join-Path $CefSdkRoot 'CREDITS.html') -Destination (Join-Path $licences 'Chromium-CREDITS.html')
    Copy-Item -LiteralPath (Join-Path $studioRoot 'LICENCES.md') -Destination $licences
    $installerNotices = Join-Path $licences 'CyInstaller'
    New-Item -ItemType Directory -Force -Path $installerNotices | Out-Null
    Copy-Item -LiteralPath (Join-Path $CyInstallerRoot 'LICENSE') -Destination (Join-Path $installerNotices 'LICENSE.txt')
    Copy-Item -LiteralPath (Join-Path $CyInstallerRoot 'licenses') -Destination (Join-Path $installerNotices 'third-party') -Recurse
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

On the Projects screen, use Open the CyDoc example to create an editable copy with English/French pages, media, diagrams and API examples. Editor, Documentation, Assistant, Updates, Options and Local MCP / SDK are full-window tabs. Documentation opens its own bundled reader; the Editor tab retains your working document.

Use Options for English/French, theme, text size and opening allowed application folders. Local MCP / SDK shows a configuration template; no Studio token is needed for the local workspace. An online connection requires a token from the Account panel. The integrated Assistant tab uses the native CyMCPSDK ChatUI. Give independent CLI/MCP processes different private job directories.

Install using the offline CyInstaller setup for managed updates. The compiled payload itself is portable and has no fabricated _cyinstall folder. The Updates tab delegates checks, downloads, verification, replacement and rollback to the installed engine. An existing portable copy migrates to a separate installation folder; close it before setup. Projects, jobs and browser drafts keep their data paths. Existing appearance settings are copied once into the data folder's config/ subdirectory; originals are preserved.

The command-line executable is `runtime/desktop/CyDocStudioRuntime.exe --tool`. Pass `--data-dir YOUR_PRIVATE_JOB_DIRECTORY mcp` for MCP, with CYDOC_STUDIO_ORIGIN in its environment. Set CYDOC_STUDIO_TOKEN only for an account-based service. `CyDocStudioRuntime.exe --update-action info|check|window` exposes the same update adapter without starting an editor workspace.

Sources and deployment guide: https://github.com/MrMybal/CyDoc/tree/main/studio
Component notices: LICENCES/ and runtime dependency notices. This Python CyUI CEF bridge runs without the CEF process sandbox on Windows; see the source deployment guide for that boundary.
'@ | Set-Content -LiteralPath (Join-Path $packageRoot 'README.md') -Encoding utf8
    $vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio/Installer/vswhere.exe'
    $visualStudio = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
    if (-not $visualStudio) { throw 'MSVC C++ build tools are required for the native Windows launcher.' }
    $developerShell = Join-Path $visualStudio 'Common7/Tools/VsDevCmd.bat'
    $batch = Join-Path $workRoot 'launcher.bat'
    $studioVersion = (Get-Content -LiteralPath (Join-Path $studioRoot 'package.json') -Raw | ConvertFrom-Json).version
    $numericVersion = ((($studioVersion -split '[.-]') | Select-Object -First 3) -join ',')+',0'
    $iconPath = (Join-Path $repositoryRoot '.cyinstaller/assets/cydoc.ico').Replace('\','\\')
    $resource = Join-Path $workRoot 'launcher.rc'
    (Get-Content -LiteralPath (Join-Path $PSScriptRoot 'launcher.rc.in') -Raw).Replace('@VERSION@',$studioVersion).Replace('@NUMERIC_VERSION@',$numericVersion).Replace('@ICON_PATH@',$iconPath) | Set-Content -LiteralPath $resource -Encoding utf8
    @"
@echo off
call "$developerShell" -arch=x64 -host_arch=x64 >nul
rc /nologo /fo "$workRoot/launcher.res" "$resource"
if errorlevel 1 exit /b 1
cl /nologo /std:c++17 /EHsc /O2 /MT "$PSScriptRoot/launcher.cpp" "$workRoot/launcher.res" /Fe:"$packageRoot/CyDocStudio.exe" /Fo:"$workRoot/launcher.obj" /link /SUBSYSTEM:WINDOWS user32.lib shell32.lib
"@ | Set-Content -LiteralPath $batch -Encoding ascii
    & cmd.exe /c $batch
    if ($LASTEXITCODE) { throw 'Native launcher compilation failed.' }
    Write-Output "Windows application: $packageRoot/CyDocStudio.exe"
    Write-Output "Local MCP/CLI: $nativeRuntime/CyDocStudioRuntime.exe --tool --data-dir YOUR_PRIVATE_JOB_DIRECTORY mcp"
} finally { Pop-Location }
