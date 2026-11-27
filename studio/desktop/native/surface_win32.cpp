#include <windows.h>
#include "host.hpp"
#include "surface.hpp"
#include <d3d11.h>
#include <wrl/client.h>
#include <imgui_impl_dx11.h>
#include <imgui_impl_win32.h>
using namespace cymcp;
using Microsoft::WRL::ComPtr;
extern IMGUI_IMPL_API LRESULT ImGui_ImplWin32_WndProcHandler(HWND, UINT, WPARAM, LPARAM);
namespace {
UINT width = 0, height = 0;
LRESULT WINAPI procedure(HWND window, UINT message, WPARAM w, LPARAM l) {
    if (ImGui::GetCurrentContext() && ImGui_ImplWin32_WndProcHandler(window, message, w, l)) return 1;
    if (message == WM_SIZE) { width = LOWORD(l); height = HIWORD(l); return 0; }
    if (message == WM_CLOSE) { DestroyWindow(window); return 0; }
    if (message == WM_DESTROY) { PostQuitMessage(0); return 0; }
    return DefWindowProcW(window, message, w, l);
}
class Win32Surface final : public ChatSurface {
    HWND window{}, parent{};
    ComPtr<ID3D11Device> device;
    ComPtr<ID3D11DeviceContext> renderer;
    ComPtr<IDXGISwapChain> swap;
    ComPtr<ID3D11RenderTargetView> target;
    void create_target() {
        ComPtr<ID3D11Texture2D> back;
        if (FAILED(swap->GetBuffer(0, IID_PPV_ARGS(&back))) || FAILED(device->CreateRenderTargetView(back.Get(), nullptr, &target)))
            throw Error("RendererFailed", "Cannot create assistant render target");
    }
public:
    explicit Win32Surface(std::uintptr_t owner) : parent(reinterpret_cast<HWND>(owner)) {
        auto instance = GetModuleHandleW(nullptr);
        WNDCLASSW klass{}; klass.lpfnWndProc = procedure; klass.hInstance = instance; klass.lpszClassName = L"CyDocStudioAssistant"; klass.hCursor = LoadCursor(nullptr, IDC_ARROW);
        RegisterClassW(&klass);
        window = CreateWindowW(klass.lpszClassName, L"CyDoc Studio Assistant", parent ? WS_CHILD | WS_CLIPSIBLINGS : WS_OVERLAPPEDWINDOW,
            0, 0, 1100, 760, parent, nullptr, instance, nullptr);
        if (!window) throw Error("WindowFailed", "Cannot create assistant panel");
        DXGI_SWAP_CHAIN_DESC desc{}; desc.BufferCount = 2; desc.BufferDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
        desc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT; desc.OutputWindow = window; desc.SampleDesc.Count = 1; desc.Windowed = TRUE;
        const D3D_FEATURE_LEVEL levels[]{D3D_FEATURE_LEVEL_11_0, D3D_FEATURE_LEVEL_10_0}; D3D_FEATURE_LEVEL level;
        auto result = D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, 0, levels, 2, D3D11_SDK_VERSION, &desc, &swap, &device, &level, &renderer);
        if (FAILED(result)) result = D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_WARP, nullptr, 0, levels, 2, D3D11_SDK_VERSION, &desc, &swap, &device, &level, &renderer);
        if (FAILED(result)) { DestroyWindow(window); window = nullptr; throw Error("RendererFailed", "Cannot initialize assistant renderer"); }
        create_target();
    }
    ~Win32Surface() override { if (IsWindow(window)) DestroyWindow(window); }
    std::uintptr_t handle() const override { return reinterpret_cast<std::uintptr_t>(window); }
    float dpi_scale() const override { return static_cast<float>(GetDpiForWindow(window)) / 96.f; }
    void initialize() override { ImGui_ImplWin32_Init(window); ImGui_ImplDX11_Init(device.Get(), renderer.Get()); if (!parent) ShowWindow(window, SW_SHOW); }
    void shutdown() override { ImGui_ImplDX11_Shutdown(); ImGui_ImplWin32_Shutdown(); }
    bool poll() override {
        if (parent && !IsWindow(parent)) return false;
        MSG message;
        while (PeekMessageW(&message, nullptr, 0, 0, PM_REMOVE)) {
            if (message.message == WM_QUIT) return false;
            TranslateMessage(&message); DispatchMessageW(&message);
        }
        if (width && height) {
            renderer->OMSetRenderTargets(0, nullptr, nullptr); target.Reset();
            if (FAILED(swap->ResizeBuffers(0, width, height, DXGI_FORMAT_UNKNOWN, 0))) throw Error("RendererFailed", "Cannot resize assistant");
            width = height = 0; create_target();
        }
        return IsWindow(window);
    }
    bool visible() const override { return IsWindowVisible(window) && !IsIconic(window); }
    void begin_frame() override { ImGui_ImplDX11_NewFrame(); ImGui_ImplWin32_NewFrame(); }
    void present() override {
        const float clear[]{.035f, .045f, .065f, 1}; auto target_ptr = target.Get();
        renderer->OMSetRenderTargets(1, &target_ptr, nullptr); renderer->ClearRenderTargetView(target.Get(), clear);
        ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData()); swap->Present(1, 0);
    }
};
}
std::unique_ptr<ChatSurface> create_chat_surface(std::uintptr_t parent) { return std::make_unique<Win32Surface>(parent); }
