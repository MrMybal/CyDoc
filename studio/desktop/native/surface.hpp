#pragma once
#include <cstdint>
#include <memory>

// Owns only the platform window and renderer. ChatController/ChatPanel stay shared.
struct ChatSurface {
    virtual ~ChatSurface() = default;
    virtual std::uintptr_t handle() const = 0;
    virtual float dpi_scale() const = 0;
    virtual void initialize() = 0;
    virtual void shutdown() = 0;
    virtual bool poll() = 0;
    virtual bool visible() const = 0;
    virtual void begin_frame() = 0;
    virtual void present() = 0;
};
std::unique_ptr<ChatSurface> create_chat_surface(std::uintptr_t parent);
