#pragma once
#include <cymcp/chat_ui.hpp>
#include <cymcp/http.hpp>
#include <cymcp/mcp.hpp>
#include <atomic>
#include <filesystem>
#include <string>
struct Host {
    std::shared_ptr<cymcp::Registry> registry;
    std::filesystem::path data;
    std::string endpoint, token, language = "en";
    std::atomic<bool> stop{false};
    cymcp::EventQueue ui_events;
    cymcp::Executor background{1, 16};
};
void run_chat(Host&, std::uintptr_t parent = 0);
