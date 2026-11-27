#include "host.hpp"
#include "surface.hpp"
#define GLFW_EXPOSE_NATIVE_X11
#include <GLFW/glfw3.h>
#include <GLFW/glfw3native.h>
#include <imgui_impl_glfw.h>
#include <imgui_impl_opengl3.h>
using namespace cymcp;
namespace {
// The parent can disappear between event polling and an X request during shutdown.
XErrorHandler forward_error{};
int x_error(Display* display, XErrorEvent* event) {
    return event->error_code == BadWindow ? 0 : (forward_error ? forward_error(display, event) : 0);
}
class X11Surface final : public ChatSurface {
    GLFWwindow* window{};
    Display* display{};
    Window child{}, parent{};
    XErrorHandler previous_error{};
public:
    explicit X11Surface(std::uintptr_t owner) : parent(static_cast<Window>(owner)) {
        if (!glfwInit()) throw Error("WindowFailed", "Linux Studio requires an X11 or XWayland display.");
        glfwWindowHint(GLFW_CONTEXT_VERSION_MAJOR, 3); glfwWindowHint(GLFW_CONTEXT_VERSION_MINOR, 3);
        glfwWindowHint(GLFW_OPENGL_PROFILE, GLFW_OPENGL_CORE_PROFILE);
        glfwWindowHint(GLFW_VISIBLE, parent ? GLFW_FALSE : GLFW_TRUE);
        glfwWindowHint(GLFW_DECORATED, parent ? GLFW_FALSE : GLFW_TRUE);
        window = glfwCreateWindow(1100, 760, "CyDoc Studio Assistant", nullptr, nullptr);
        if (!window) { glfwTerminate(); throw Error("RendererFailed", "Cannot initialize assistant OpenGL renderer"); }
        display = glfwGetX11Display(); child = glfwGetX11Window(window);
        previous_error = XSetErrorHandler(x_error);
        forward_error = previous_error;
        if (parent) {
            XWindowAttributes attributes{};
            if (!XGetWindowAttributes(display, parent, &attributes)) {
                XSetErrorHandler(previous_error); glfwDestroyWindow(window); glfwTerminate();
                throw Error("WindowFailed", "Studio parent window is no longer available.");
            }
            XReparentWindow(display, child, parent, 0, 0); XSync(display, False);
        }
        glfwMakeContextCurrent(window); glfwSwapInterval(1);
    }
    ~X11Surface() override { glfwDestroyWindow(window); glfwTerminate(); XSetErrorHandler(previous_error); }
    std::uintptr_t handle() const override { return static_cast<std::uintptr_t>(child); }
    float dpi_scale() const override { float x{}, y{}; glfwGetWindowContentScale(window, &x, &y); return x; }
    void initialize() override {
        if (!ImGui_ImplGlfw_InitForOpenGL(window, true) || !ImGui_ImplOpenGL3_Init("#version 330"))
            throw Error("RendererFailed", "Cannot initialize assistant ImGui backends");
    }
    void shutdown() override { ImGui_ImplOpenGL3_Shutdown(); ImGui_ImplGlfw_Shutdown(); }
    bool poll() override {
        glfwPollEvents();
        XWindowAttributes attributes{};
        return !glfwWindowShouldClose(window) && (!parent || XGetWindowAttributes(display, parent, &attributes));
    }
    bool visible() const override {
        XWindowAttributes attributes{};
        return XGetWindowAttributes(display, child, &attributes) && attributes.map_state == IsViewable && attributes.width > 0 && attributes.height > 0;
    }
    void begin_frame() override { glfwMakeContextCurrent(window); ImGui_ImplOpenGL3_NewFrame(); ImGui_ImplGlfw_NewFrame(); }
    void present() override {
        int width{}, height{}; glfwGetFramebufferSize(window, &width, &height);
        glViewport(0, 0, width, height); glClearColor(.035f, .045f, .065f, 1.f); glClear(GL_COLOR_BUFFER_BIT);
        ImGui_ImplOpenGL3_RenderDrawData(ImGui::GetDrawData()); glfwSwapBuffers(window);
    }
};
}
std::unique_ptr<ChatSurface> create_chat_surface(std::uintptr_t parent) { return std::make_unique<X11Surface>(parent); }
