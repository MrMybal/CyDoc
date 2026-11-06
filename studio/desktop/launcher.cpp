#define UNICODE
#define _UNICODE
#include <windows.h>
#include <shellapi.h>
#include <string>

static std::wstring quote(const std::wstring& text) {
    std::wstring result = L"\"";
    size_t slashes = 0;
    for (const auto character : text) {
        if (character == L'\\') { ++slashes; continue; }
        if (character == L'\"') result.append(slashes * 2 + 1, L'\\');
        else result.append(slashes, L'\\');
        slashes = 0; result += character;
    }
    result.append(slashes * 2, L'\\'); result += L'\"'; return result;
}
int WINAPI wWinMain(HINSTANCE, HINSTANCE, PWSTR, int) {
    wchar_t path[32768]{};
    const DWORD count = GetModuleFileNameW(nullptr, path, 32768);
    if (!count || count == 32768) return 1;
    const std::wstring root = std::wstring(path).substr(0, std::wstring(path).find_last_of(L"\\/"));
    // A side-by-side runtime lets an update replace the launcher while an older window is open.
    const std::wstring current = root + L"\\runtime\\desktop\\CyDocStudioRuntime-0.1.2.exe";
    const std::wstring executable = GetFileAttributesW(current.c_str()) != INVALID_FILE_ATTRIBUTES
        ? current : root + L"\\runtime\\desktop\\CyDocStudioRuntime.exe";
    std::wstring command = quote(executable);
    int argc = 0; auto argv = CommandLineToArgvW(GetCommandLineW(), &argc);
    for (int index = 1; index < argc; ++index) command += L" " + quote(argv[index]);
    LocalFree(argv);
    STARTUPINFOW startup{sizeof(startup)}; PROCESS_INFORMATION process{};
    if (!CreateProcessW(executable.c_str(), command.data(), nullptr, nullptr, FALSE, CREATE_NO_WINDOW, nullptr, root.c_str(), &startup, &process)) {
        MessageBoxW(nullptr, L"The Studio runtime could not start. Keep the app and runtime directories beside this launcher.", L"CyDoc Studio", MB_OK | MB_ICONERROR);
        return 1;
    }
    CloseHandle(process.hThread); CloseHandle(process.hProcess); return 0;
}
