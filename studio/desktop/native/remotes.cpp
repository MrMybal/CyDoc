#include "remotes.hpp"
#include <fstream>
#include <regex>
#include <set>
using namespace cymcp;
namespace {
struct Remote {
    std::string id, url, token_environment;
    std::shared_ptr<McpClient> client;
    std::vector<std::string> names;
    Json status = Json::object();
};
struct Connections {
    std::mutex mutex;
    std::vector<Remote> entries;
    std::weak_ptr<Registry> registry;
    Json refresh(const CallContext& context) {
        std::lock_guard lock(mutex);
        auto target = registry.lock();
        if (!target) throw Error("NotConnected", "Studio registry has closed");
        Json statuses = Json::array();
        for (auto& remote : entries) {
            context.cancellation.check();
            try {
                if (!remote.client) {
                    const auto secret = remote.token_environment.empty() ? nullptr : std::getenv(remote.token_environment.c_str());
                    remote.client = std::make_shared<McpClient>(remote.url, secret ? secret : "");
                    remote.client->connect(context.cancellation);
                }
                remote.client->clear_cache();
                auto tools = remote.client->list_tools(context.cancellation);
                std::vector<Operation> pending;
                for (const auto& tool : tools) {
                    const auto original = tool.at("name").get<std::string>();
                    Operation op;
                    op.name = "remote." + remote.id + "." + original;
                    op.description = "Remote application " + remote.id + ": " + tool.value("description", original);
                    op.input_schema = tool.at("inputSchema");
                    op.output_schema = {{"type", "object"}};
                    op.read_only = tool.value("annotations", Json::object()).value("readOnlyHint", false);
                    check_schema(op.input_schema);
                    const auto client = remote.client;
                    op.handler = [client, original](const Json& arguments, const CallContext& c) {
                        auto result = client->call_tool(original, arguments, c.cancellation);
                        if (result.value("isError", false)) throw Error("RemoteToolError", "The remote application reported an error: " + redact_error_message(result.value("content", Json::array()).dump()).substr(0, 1200));
                        return Json{{"result", result}};
                    };
                    pending.push_back(std::move(op));
                }
                for (const auto& name : remote.names) target->remove(name);
                remote.names.clear();
                for (auto& operation : pending) { target->add(operation); remote.names.push_back(operation.name); }
                remote.status = {{"id", remote.id}, {"state", "connected"}, {"tools", remote.names.size()}};
            } catch (const std::exception& error) {
                if (context.cancellation.cancelled()) throw;
                // Removed/unavailable tools must not retain an old executable catalogue.
                for (const auto& name : remote.names) target->remove(name);
                remote.names.clear(); remote.client.reset();
                const auto* sdk_error = dynamic_cast<const Error*>(&error);
                remote.status = {{"id", remote.id}, {"state", "error"}, {"code", sdk_error ? sdk_error->code : "InvalidRemoteCatalogue"}, {"message", "Remote connection or catalogue failed; verify its address, credentials and schemas."}};
            }
            statuses.push_back(remote.status);
        }
        return {{"connections", statuses}};
    }
};
}
void register_remotes(Host& host) {
    const auto path = host.data / "remote-mcp.json";
    if (!std::filesystem::exists(path)) return;
    std::ifstream in(path); const auto configured = Json::parse(in);
    if (!configured.is_array() || configured.size() > 16) throw Error("InvalidOptions", "remote-mcp.json must contain at most 16 configured connections");
    auto connections = std::make_shared<Connections>(); connections->registry = host.registry;
    std::set<std::string> identifiers;
    for (const auto& item : configured) {
        if (!item.value("enabled", true)) continue;
        Remote remote; remote.id = item.at("id"); remote.url = item.at("url"); remote.token_environment = item.value("tokenEnvironment", "");
        if (!std::regex_match(remote.id, std::regex("[a-zA-Z0-9_-]{1,32}")) || !identifiers.insert(remote.id).second) throw Error("InvalidOptions", "Remote connection IDs must be unique ASCII names");
        auto url = parse_url(remote.url);
        if (!url.loopback && url.scheme != "https") throw Error("InvalidOptions", "Remote MCP connections require HTTPS");
        connections->entries.push_back(std::move(remote));
    }
    Operation refresh;
    refresh.name = "remote_refresh"; refresh.description = "Refresh explicitly configured remote application tools. Read failures with connection IDs; no credentials are returned.";
    refresh.read_only = true; refresh.output_schema = {{"type", "object"}};
    refresh.handler = [connections](const Json&, const CallContext& c) { return connections->refresh(c); };
    host.registry->add(refresh);
    host.background.post([connections] {
        CallContext context; context.cancellation.deadline = Clock::now() + std::chrono::seconds(10);
        try { connections->refresh(context); } catch (const std::exception&) { /* Explicit refresh reports the saved diagnostic. */ }
    });
}
