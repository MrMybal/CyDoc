#include <windows.h>
#include "host.hpp"
#include <cyui/Core.h>
#include <d3d11.h>
#include <wrl/client.h>
#include <imgui_impl_dx11.h>
#include <imgui_impl_win32.h>
#include <fstream>
#include <future>
#include <set>
#include <algorithm>
#include <cmath>
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
std::string environment(const std::string& key) { auto v = std::getenv(key.c_str()); return v ? v : ""; }
}
void run_chat(Host& host, std::uintptr_t parent) {
    auto instance = GetModuleHandleW(nullptr);
    WNDCLASSW klass{}; klass.lpfnWndProc = procedure; klass.hInstance = instance; klass.lpszClassName = L"CyDocStudioAssistant"; klass.hCursor = LoadCursor(nullptr, IDC_ARROW);
    RegisterClassW(&klass);
    HWND window = CreateWindowW(klass.lpszClassName, L"CyDoc Studio Assistant", parent ? WS_CHILD | WS_CLIPSIBLINGS : WS_OVERLAPPEDWINDOW,
        0, 0, 1100, 760, reinterpret_cast<HWND>(parent), nullptr, instance, nullptr);
    if (!window) throw Error("WindowFailed", "Cannot create assistant panel");
    ComPtr<ID3D11Device> device; ComPtr<ID3D11DeviceContext> renderer; ComPtr<IDXGISwapChain> swap; ComPtr<ID3D11RenderTargetView> target;
    DXGI_SWAP_CHAIN_DESC desc{}; desc.BufferCount = 2; desc.BufferDesc.Format = DXGI_FORMAT_B8G8R8A8_UNORM;
    desc.BufferUsage = DXGI_USAGE_RENDER_TARGET_OUTPUT; desc.OutputWindow = window; desc.SampleDesc.Count = 1; desc.Windowed = TRUE;
    const D3D_FEATURE_LEVEL levels[]{D3D_FEATURE_LEVEL_11_0, D3D_FEATURE_LEVEL_10_0}; D3D_FEATURE_LEVEL level;
    auto result = D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_HARDWARE, nullptr, 0, levels, 2, D3D11_SDK_VERSION, &desc, &swap, &device, &level, &renderer);
    if (FAILED(result)) result = D3D11CreateDeviceAndSwapChain(nullptr, D3D_DRIVER_TYPE_WARP, nullptr, 0, levels, 2, D3D11_SDK_VERSION, &desc, &swap, &device, &level, &renderer);
    if (FAILED(result)) { DestroyWindow(window); throw Error("RendererFailed", "Cannot initialize assistant renderer"); }
    auto create_target = [&] { ComPtr<ID3D11Texture2D> back; if (FAILED(swap->GetBuffer(0, IID_PPV_ARGS(&back))) || FAILED(device->CreateRenderTargetView(back.Get(), nullptr, &target))) throw Error("RendererFailed", "Cannot create assistant render target"); };
    create_target();
    IMGUI_CHECKVERSION(); ImGui::CreateContext(); ImGui::GetIO().IniFilename = nullptr;
    ImGui::GetIO().ConfigFlags |= ImGuiConfigFlags_NavEnableKeyboard;
    cyui::Config appearance; appearance.themeKey = "navy"; appearance.dpiScale = static_cast<float>(GetDpiForWindow(window)) / 96.f;
    cyui::apply(appearance); cyui::loadFonts(); cyui::setLocale(host.language.c_str());
    ImGui_ImplWin32_Init(window); ImGui_ImplDX11_Init(device.Get(), renderer.Get());
    {
        auto out = open_private_output_file(host.data / "assistant-window.json");
        auto value = Json{{"handle", reinterpret_cast<std::uintptr_t>(window)}, {"parent", reinterpret_cast<std::uintptr_t>(GetParent(window))}}.dump(); std::fwrite(value.data(), 1, value.size(), out.get());
    }
    if (!parent) ShowWindow(window, SW_SHOW);
    {
        auto providers = std::make_shared<ProviderRegistry>();
        ChatController controller(providers);
        ChatPanelOptions panel_options;
        panel_options.edit_message = [&](std::uint64_t id, const std::string& text) { controller.edit_message(id, text); };
        panel_options.delete_message = [&](std::uint64_t id) { controller.delete_turn(id); };
        ChatPanel panel(controller, panel_options);
        Cancellation discovery_cancel;
        auto discover = [&] { return std::async(std::launch::async, [&, providers] { CallContext context; context.cancellation = discovery_cancel; return providers->discover({}, context); }); };
        auto discovery = discover();
        std::vector<DiscoveredConnection> found;
        auto catalogue = providers->describe();
        char provider[96] = "", model[256] = "", endpoint[1024] = "", executable[2048] = "", key_env[128] = "", advanced[8192] = "{}", history[128] = "studio";
        bool restore = true, configuration = true;
        int context_kib = 0;
        std::string error;
        const auto settings_path = host.data / "assistant-settings.json";
        if (std::filesystem::exists(settings_path)) {
            try { std::ifstream in(settings_path); auto settings = Json::parse(in);
                auto load = [&](const char* key, auto& buffer) { auto text = settings.value(key, ""); std::snprintf(buffer, sizeof(buffer), "%s", text.c_str()); };
                load("provider", provider); load("model", model); load("endpoint", endpoint); load("executable", executable); load("keyEnvironment", key_env);
            } catch (...) { error = "Invalid assistant settings / Paramètres de l’assistant invalides"; }
        }
        const auto tr = [&](const char* en, const char* fr) { return host.language == "fr" ? fr : en; };
        bool done = false;
        while (!done && !host.stop && (!parent || IsWindow(reinterpret_cast<HWND>(parent)))) {
            MSG message; while (PeekMessageW(&message, nullptr, 0, 0, PM_REMOVE)) { if (message.message == WM_QUIT) done = true; TranslateMessage(&message); DispatchMessageW(&message); }
            if (done) break;
            if (width && height) { renderer->OMSetRenderTargets(0, nullptr, nullptr); target.Reset(); if (FAILED(swap->ResizeBuffers(0, width, height, DXGI_FORMAT_UNKNOWN, 0))) throw Error("RendererFailed", "Cannot resize assistant"); width = height = 0; create_target(); }
            controller.poll();
            for (const auto& event : host.ui_events.drain()) {
                if (event.type != "Appearance") continue;
                try {
                    const auto& value = event.data;
                    const auto locale = value.at("locale").get<std::string>();
                    if (locale != "en" && locale != "fr") continue;
                    host.language = locale; cyui::setLocale(locale.c_str());
                    cyui::Config config; config.themeKey = value.value("light", false) ? "light-grey" : "navy"; config.dpiScale = appearance.dpiScale; cyui::apply(config);
                    auto palette = cyui::palette();
                    const std::map<std::string, ImU32 cyui::Palette::*> fields{{"bg0", &cyui::Palette::bg0}, {"bg1", &cyui::Palette::bg1}, {"bg2", &cyui::Palette::bg2}, {"bg3", &cyui::Palette::bg3}, {"bg4", &cyui::Palette::bg4}, {"bg5", &cyui::Palette::bg5}, {"text", &cyui::Palette::text}, {"textDim", &cyui::Palette::textDim}, {"textFaint", &cyui::Palette::textFaint}, {"line", &cyui::Palette::line}, {"lineStrong", &cyui::Palette::lineStrong}, {"grid", &cyui::Palette::grid}, {"gridStrong", &cyui::Palette::gridStrong}, {"accent", &cyui::Palette::accent}, {"accentHover", &cyui::Palette::accentHover}, {"accentDim", &cyui::Palette::accentDim}, {"selection", &cyui::Palette::selection}, {"info", &cyui::Palette::info}};
                    const std::map<std::string, std::string> tokens{{"bg0","sidebar"},{"bg1","bg"},{"bg2","surface"},{"bg3","card"},{"bg4","accent-bg"},{"bg5","line"},{"text","text"},{"textDim","muted"},{"textFaint","faint"},{"line","line"},{"lineStrong","line"},{"grid","line"},{"gridStrong","line"},{"accent","accent"},{"accentHover","accent"},{"accentDim","accent"},{"selection","accent-bg"},{"info","accent"}};
                    for (const auto& [key, member] : fields) {
                        auto hex = value.at("colors").at(tokens.at(key)).get<std::string>();
                        if (hex.size() == 4 && hex[0] == '#') { std::string expanded = "#"; for (std::size_t i = 1; i < 4; ++i) expanded.append(2, hex[i]); hex = expanded; }
                        if (hex.size() != 7 || hex[0] != '#') continue;
                        palette.*member = cyui::rgb(std::stoul(hex.substr(1), nullptr, 16));
                    }
                    const auto accent = ImGui::ColorConvertU32ToFloat4(palette.accent);
                    const auto linear = [](float c) { return c <= .04045f ? c / 12.92f : std::pow((c + .055f) / 1.055f, 2.4f); };
                    const float luminance = .2126f * linear(accent.x) + .7152f * linear(accent.y) + .0722f * linear(accent.z);
                    palette.accentText = cyui::rgb(luminance > .179f ? 0x000000 : 0xffffff); cyui::setPalette(palette);
                    ImGui::GetStyle().FontScaleMain = std::clamp(value.value("textScale", 1.f), .8f, 1.5f);
                } catch (const std::exception&) { error = tr("Appearance settings could not be applied.", "Les réglages d’apparence n’ont pas pu être appliqués."); }
            }
            if (discovery.valid() && discovery.wait_for(std::chrono::seconds(0)) == std::future_status::ready) {
                try { found = discovery.get(); } catch (const std::exception& e) { error = e.what(); }
            }
            if (!IsWindowVisible(window) || IsIconic(window)) { Sleep(30); continue; }
            ImGui_ImplDX11_NewFrame(); ImGui_ImplWin32_NewFrame(); ImGui::NewFrame();
            ImGui::SetNextWindowPos({0, 0}); ImGui::SetNextWindowSize(ImGui::GetIO().DisplaySize);
            ImGui::Begin("CyDoc Assistant", nullptr, ImGuiWindowFlags_NoDecoration | ImGuiWindowFlags_NoMove | ImGuiWindowFlags_NoSavedSettings);
            if (ImGui::Button(tr("Connection settings", "Réglages de connexion"))) configuration = !configuration;
            ImGui::SameLine(); ImGui::TextUnformatted(controller.state().phase.c_str());
            if (configuration) {
                if (ImGui::BeginCombo(tr("Provider", "Fournisseur"), provider)) {
                    for (const auto& item : catalogue) { auto id = item.at("id").get<std::string>();
                        bool available = false; for (const auto& candidate : found) if (candidate.provider_id == id && candidate.available()) available = true;
                        if (ImGui::Selectable((id + (available ? " *" : "")).c_str(), id == provider)) { std::snprintf(provider, sizeof(provider), "%s", id.c_str()); model[0] = endpoint[0] = executable[0] = key_env[0] = 0; }
                    } ImGui::EndCombo();
                }
                if (ImGui::Button(tr("Detect again", "Détecter à nouveau")) && !discovery.valid()) discovery = discover();
                ImGui::SameLine(); ImGui::TextUnformatted(tr("* detected; authentication is checked on connection", "* détecté ; authentification vérifiée à la connexion"));
                ImGui::InputText(tr("Model ID (empty: native/local)", "ID modèle (vide : natif/local)"), model, sizeof(model));
                ImGui::InputText(tr("Service URL (optional)", "URL du service (facultative)"), endpoint, sizeof(endpoint));
                ImGui::InputText(tr("CLI executable (optional)", "Exécutable CLI (facultatif)"), executable, sizeof(executable));
                ImGui::InputText(tr("API key environment variable", "Variable d’environnement de la clé API"), key_env, sizeof(key_env));
                ImGui::InputText(tr("Conversation name", "Nom de conversation"), history, sizeof(history));
                ImGui::Checkbox(tr("Restore saved conversation", "Reprendre la conversation enregistrée"), &restore);
                if (ImGui::TreeNode(tr("Advanced connection settings", "Réglages avancés de connexion"))) {
                    ImGui::InputTextMultiline(tr("Provider JSON (memory only)", "JSON fournisseur (en mémoire)"), advanced, sizeof(advanced), {0, 100});
                    ImGui::InputInt(tr("API context limit (KiB, 0 = full)", "Limite du contexte API (Kio, 0 = complet)"), &context_kib);
                    context_kib = std::clamp(context_kib, 0, 262144);
                    ImGui::TextWrapped("%s", tr("Complete conversation history remains available locally.", "L’historique complet reste disponible localement.")); ImGui::TreePop();
                }
                ImGui::BeginDisabled(controller.state().busy || !provider[0]);
                if (ImGui::Button(tr("Connect", "Connecter"))) {
                    try {
                        ChatConnection connection; connection.provider_id = provider; connection.model = model; connection.automatic_model = !model[0];
                        for (const auto& candidate : found) if (candidate.provider_id == provider && candidate.available()) { connection.provider = candidate.config; if (!key_env[0]) std::snprintf(key_env, sizeof(key_env), "%s", candidate.api_key_env.c_str()); }
                        auto manual = Json::parse(advanced); if (!manual.is_object()) throw Error("InvalidArgument", "Settings must be an object");
                        connection.provider.settings.update(manual);
                        if (endpoint[0]) connection.provider.settings["base_url"] = endpoint;
                        if (executable[0]) connection.provider.process.executable = std::filesystem::u8path(executable);
                        connection.provider.process.cwd = host.data / "assistant-workspace";
                        private_directory(connection.provider.process.cwd);
                        if (key_env[0]) connection.provider.api_key = environment(key_env);
                        const std::set<std::string> direct{"codex", "openai", "anthropic", "openrouter", "ollama", "openai-compatible", "llama.cpp", "lmstudio"};
                        bool native_tools = direct.contains(provider); std::string transport;
                        for (const auto& item : catalogue) if (item.at("id") == provider) transport = item.value("transport", "");
                        if (native_tools) connection.provider.tools = host.registry;
                        else {
                            Json headers = Json::array(); if (!host.token.empty()) headers.push_back({{"name", "Authorization"}, {"value", "Bearer " + host.token}});
                            if (std::string(provider) == "claude-code") {
                                connection.provider.settings["mcp_servers"]["cydoc-studio"] = {{"type", "http"}, {"url", host.endpoint}};
                                if (!host.token.empty()) connection.provider.settings["mcp_servers"]["cydoc-studio"]["headers"] = {{"Authorization", "Bearer " + host.token}};
                            } else if (transport == "acp-v1-stdio")
                                connection.provider.settings["mcp_servers"] = Json::array({{{"type", "http"}, {"name", "cydoc-studio"}, {"url", host.endpoint}, {"headers", headers}}});
                            else throw Error("Unsupported", "Configure this CLI's native MCP settings explicitly; this profile has no automatic Studio tool attachment");
                        }
                        connection.system_prompt = "You help the human user author and publish CyDoc documentation. Use Studio operations for application actions. Respect revision tokens and report failures. Never invent a successful edit or publication.";
                        connection.history_directory = host.data / "conversations"; connection.history_id = history; connection.restore = restore;
                        connection.context.max_bytes = static_cast<std::size_t>(context_kib) * 1024;
                        controller.open(std::move(connection)); error.clear();
                        auto out = open_private_output_file(settings_path);
                        auto value = Json{{"provider", provider}, {"model", model}, {"endpoint", endpoint}, {"executable", executable}, {"keyEnvironment", key_env}}.dump(); std::fwrite(value.data(), 1, value.size(), out.get());
                    } catch (const std::exception& e) { error = redact_error_message(e.what()); }
                }
                ImGui::SameLine(); if (ImGui::Button(tr("Model catalogue", "Catalogue des modèles"))) controller.refresh_models();
                ImGui::SameLine(); if (ImGui::Button(tr("Save history", "Enregistrer l’historique"))) controller.save();
                ImGui::EndDisabled();
                ImGui::BeginDisabled(controller.state().busy);
                if (!controller.state().models.empty() && ImGui::BeginCombo(tr("Catalogued models", "Modèles du catalogue"), model)) {
                  for (const auto& item : controller.state().models) {
                    const auto id = item.is_string() ? item.get<std::string>() : item.value("id", "");
                    if (!id.empty() && ImGui::Selectable(id.c_str(), id == model)) { std::snprintf(model, sizeof(model), "%s", id.c_str()); if (controller.state().connected && controller.state().turn_model_selection) controller.select_model(id); }
                  }
                  ImGui::EndCombo();
                }
                ImGui::EndDisabled();
                if (!error.empty()) ImGui::TextWrapped("%s", error.c_str());
                ImGui::Separator();
            }
            panel.draw("studio-chat");
            ImGui::End(); ImGui::Render();
            const float clear[]{.035f, .045f, .065f, 1}; auto target_ptr = target.Get(); renderer->OMSetRenderTargets(1, &target_ptr, nullptr); renderer->ClearRenderTargetView(target.Get(), clear);
            ImGui_ImplDX11_RenderDrawData(ImGui::GetDrawData()); swap->Present(1, 0);
        }
        discovery_cancel.cancel(); controller.cancel(); controller.disconnect();
    }
    ImGui_ImplDX11_Shutdown(); ImGui_ImplWin32_Shutdown(); ImGui::DestroyContext();
    if (IsWindow(window)) DestroyWindow(window);
    host.stop = true;
}
