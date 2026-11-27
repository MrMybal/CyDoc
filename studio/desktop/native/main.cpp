#include "host.hpp"
#include "remotes.hpp"
#include <cymcp/changes.hpp>
#include <cstdlib>
#include <fstream>
#include <iostream>
#include <set>
#include <thread>
using namespace cymcp;
namespace {
std::string env(const char* key) { auto p = std::getenv(key); return p ? p : ""; }
Json read_json(const std::filesystem::path& path) { std::ifstream in(path); if (!in) throw Error("NotFound", "Configuration not found"); return Json::parse(in); }
Json bridge(const std::string& origin, const std::string& token, const std::string& name, const Json& p, const CallContext& c) {
    HttpRequest request;
    request.method = "POST"; request.url = origin + "/invoke";
    request.headers = {{"Authorization", "Bearer " + token}, {"Content-Type", "application/json"}};
    request.body = Json{{"operation", name}, {"parameters", p}}.dump();
    request.timeout = std::chrono::milliseconds(0);
    auto response = HttpClient{}.perform(request, c.cancellation);
    auto value = Json::parse(response.body);
    if (response.status != 200) throw Error(value.value("code", "OperationFailed"), value.value("error", "Studio operation failed"));
    return value;
}
}
static int run(const std::vector<std::string>& arguments) {
    try {
        std::map<std::string, std::string> args;
        for (std::size_t i = 1; i < arguments.size(); ++i) {
            std::string key = arguments[i];
            if (key.starts_with("--")) args[key] = i + 1 < arguments.size() && !arguments[i + 1].starts_with("--") ? arguments[++i] : "true";
            else throw Error("InvalidArgument", "Use named arguments");
        }
        Host host;
        if (args.contains("--probe")) {
            auto value = probe_local_mcp(args["--probe"]);
            std::cout << Json{{"name", value.name}, {"version", value.version}, {"advertised", value.advertised}, {"status", value.status == LocalMcpStatus::active ? "active" : value.status == LocalMcpStatus::authentication_required ? "authentication_required" : "unverified"}}.dump() << '\n'; return 0;
        }
        if (args.contains("--discover")) {
            ProviderRegistry providers; Json result = Json::array();
            for (const auto& candidate : providers.discover()) result.push_back({{"id", candidate.provider_id}, {"state", candidate.state}, {"models", candidate.models}});
            std::cout << result.dump() << '\n'; return 0;
        }
        host.data = std::filesystem::u8path(args.at("--data"));
        host.language = args.contains("--language") ? args["--language"] : "en";
        const auto config = read_json(std::filesystem::u8path(args.at("--manifest")));
        const auto settings_path = host.data / "mcp-settings.json";
        auto settings = std::filesystem::exists(settings_path) ? read_json(settings_path) : Json{{"profile", "free"}};
        const std::string profile = settings.value("profile", "free");
        LocalAccessProfile mode;
        if (profile == "free") mode = LocalAccessProfile::free;
        else if (profile == "local-controlled") mode = LocalAccessProfile::local_controlled;
        else if (profile == "token-only") mode = LocalAccessProfile::token_only;
        else if (profile == "protected") mode = LocalAccessProfile::protected_access;
        else throw Error("InvalidArgument", "Unknown MCP access profile");
        auto access = local_access_settings(mode);
        host.token = env("CYDOC_MCP_TOKEN");
        if (access.require_token && host.token.size() < 32) throw Error("AuthenticationRequired", "Set CYDOC_MCP_TOKEN (at least 32 characters) for this saved profile");
        host.registry = std::make_shared<Registry>(Policy([access, &host](const CallContext&, const std::string& name, const Json&) {
            return !access.control_operations || host.registry->describe(name).at("annotations").value("readOnlyHint", false) ? Decision::allow : Decision::deny;
        }));
        auto changes = std::make_shared<ChangeFeed>(); host.registry->set_change_feed(changes);
        const auto bridge_origin = env("CYDOC_BRIDGE_ORIGIN"), bridge_token = env("CYDOC_BRIDGE_TOKEN");
        if (!parse_url(bridge_origin).loopback || bridge_token.size() < 32) throw Error("InvalidArgument", "A private loopback business bridge is required");
        for (const auto& item : config.at("operations")) {
            Operation operation;
            operation.name = item.at("id"); operation.description = item.at("description");
            operation.input_schema = item.at("inputSchema"); operation.output_schema = item.at("outputSchema");
            operation.read_only = item.at("readOnly");
            operation.handler = [=](const Json& p, const CallContext& c) { return bridge(bridge_origin, bridge_token, item.at("id"), p, c); };
            host.registry->add(operation);
            operation.name = "op_" + std::string(item.at("id"));
            operation.description = "Submit a persistent job: " + operation.description;
            operation.input_schema = {{"type", "object"}, {"properties", {{"parameters", item.at("inputSchema")}}}, {"required", {"parameters"}}, {"additionalProperties", false}};
            operation.output_schema = {{"type", "object"}, {"properties", {{"jobId", {{"type", "string"}}}}}, {"required", {"jobId"}}};
            operation.handler = [=](const Json& p, const CallContext& c) { return bridge(bridge_origin, bridge_token, "submit", {{"operationId", item.at("id")}, {"parameters", p.at("parameters")}}, c); };
            host.registry->add(operation);
        }
        for (const auto& name : {"cy_get_job", "cy_list_jobs", "cy_cancel_job"}) {
            Operation operation;
            operation.name = name;
            operation.description = std::string(name) == "cy_get_job" ? "Read persistent job state, output paths and errors." : std::string(name) == "cy_list_jobs" ? "List persistent jobs retained across Studio versions." : "Request cooperative cancellation; committed writes are never replayed.";
            operation.read_only = std::string(name) != "cy_cancel_job";
            operation.input_schema = {{"type", "object"}, {"properties", Json::object()}, {"additionalProperties", false}};
            if (std::string(name) != "cy_list_jobs") { operation.input_schema["properties"]["jobId"] = {{"type", "string"}}; operation.input_schema["required"] = {"jobId"}; }
            operation.output_schema = {{"type", "object"}};
            operation.handler = [=](const Json& p, const CallContext& c) { return bridge(bridge_origin, bridge_token, name, p, c); };
            host.registry->add(operation);
        }
        register_remotes(host);
        McpServerOptions mcp_options; mcp_options.changes = changes;
        McpServer mcp(*host.registry, "CyDoc Studio", mcp_options);
        if (args.contains("--chat-prompt")) {
            ProviderRegistry providers; ProviderConfig provider;
            auto id = args.at("--provider");
            for (const auto& candidate : providers.discover()) if (candidate.provider_id == id && candidate.available()) { provider = candidate.config; if (!candidate.api_key_env.empty()) provider.api_key = env(candidate.api_key_env.c_str()); }
            if (args.contains("--base-url")) provider.settings["base_url"] = args["--base-url"];
            provider.process.cwd = host.data / "assistant-workspace";
            private_directory(provider.process.cwd);
            provider.tools = host.registry;
            auto backend = providers.create(id, provider);
            Conversation conversation(backend, args.contains("--model") ? args["--model"] : "", "Help the human user with CyDoc Studio using its operations.");
            CallContext context; Json models; std::atomic<int> events{0}, deltas{0};
            context.events = [&](const Event& event) {
                ++events;
                if (event.type == "TextDelta") {
                    ++deltas;
                    if (args.contains("--cancel-deltas") && deltas >= std::stoi(args["--cancel-deltas"])) context.cancellation.cancel();
                }
            };
            conversation.connect({}, context, !args.contains("--model"), &models);
            Executor executor(1);
            auto result = conversation.send_async(executor, args["--chat-prompt"], context);
            if (args.contains("--cancel-after") && result.wait_for(std::chrono::milliseconds(std::stoi(args["--cancel-after"]))) == std::future_status::timeout) conversation.cancel();
            try {
                auto completed = result.get();
                std::cout << Json{{"text", completed.text}, {"events", events.load()}, {"textDeltas", deltas.load()}, {"metrics", completed.metrics}, {"models", models}, {"status", conversation.status()}}.dump() << '\n'; return 0;
            } catch (const Error& error) {
                std::cerr << Json{{"error", {{"code", error.code}, {"message", error.what()}}}, {"events", events.load()}, {"textDeltas", deltas.load()}}.dump() << '\n'; return 2;
            }
        }
        if (args.contains("--stdio")) { mcp.serve_stdio(std::cin, std::cout); return 0; }
        if (args.contains("--list")) { std::cout << host.registry->catalogue()->dump() << '\n'; return 0; }
        if (args.contains("--describe")) { std::cout << host.registry->describe(args["--describe"]).dump() << '\n'; return 0; }
        if (args.contains("--call")) { std::cout << host.registry->invoke(args["--call"], Json::parse(args.contains("--json") ? args["--json"] : "{}")).dump() << '\n'; return 0; }
        LocalMcpEndpoint endpoint;
        endpoint.name = "CyDoc Studio"; endpoint.version = config.at("version");
        endpoint.requires_token = [access] { return access.require_token; };
        endpoint.handler = [&](const Json& value, const CallContext& context) { return mcp.handle(value, context); };
        const auto control_token = env("CYDOC_HOST_TOKEN");
        if (control_token.size() < 32) throw Error("InvalidArgument", "A private host control token is required");
        auto authentication = [control_token, access, token = host.token](std::string_view credential) -> std::string {
            if (constant_time_equal(std::string(credential), control_token)) return "host";
            if (access.require_token && constant_time_equal(std::string(credential), token)) return "mcp";
            return {};
        };
        LocalHttpServer server(authentication, [&](const Json& value, const CallContext& c) {
            if (c.principal != "host") throw Error("PermissionDenied", "Private host endpoint");
            if (value.value("command", "") == "stop") { host.stop = true; return Json{{"stopping", true}}; }
            if (value.value("command", "") == "appearance") {
                host.ui_events.push({"Appearance", value}); return Json{{"queued", true}};
            }
            return dispatch_app(*host.registry, value, c);
        }, 4, provider_message_limit, endpoint);
        host.endpoint = "http://127.0.0.1:" + std::to_string(server.start(settings.value("port", 0))) + "/mcp";
        if (args.contains("--ready")) {
            auto out = open_private_output_file(std::filesystem::u8path(args["--ready"]));
            auto text = Json{{"endpoint", host.endpoint}, {"profile", profile}, {"requiresToken", access.require_token}, {"sdkVersion", version}}.dump();
            std::fwrite(text.data(), 1, text.size(), out.get());
        }
        if (args.contains("--chat")) run_chat(host, args.contains("--parent") ? std::stoull(args["--parent"]) : 0);
        else while (!host.stop) std::this_thread::sleep_for(std::chrono::milliseconds(30));
        mcp.cancel_all(); server.stop();
        return 0;
    } catch (const Error& error) {
        std::cerr << Json{{"error", {{"code", error.code}, {"message", error.what()}}}}.dump() << '\n'; return 2;
    } catch (const std::exception& error) {
        std::cerr << Json{{"error", {{"code", "HostFailed"}, {"message", error.what()}}}}.dump() << '\n'; return 1;
    }
}

int wmain(int argc, wchar_t** argv) {
    std::vector<std::string> arguments;
    for (int i = 0; i < argc; ++i) arguments.push_back(cymcp::path_utf8(std::filesystem::path(argv[i])));
    return run(arguments);
}
