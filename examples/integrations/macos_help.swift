import AppKit

// Retain this controller for the lifetime of the host window.
final class CyDocHelpController {
    private var monitor: Any?
    var page = "precise-links"
    init() {
        monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
            if event.keyCode == 122 { self?.openHelp(); return nil }
            return event
        }
    }
    deinit { if let monitor { NSEvent.removeMonitor(monitor) } }
    func openHelp() {
        guard let resources = Bundle.main.resourceURL else { return }
        let file = resources.appendingPathComponent("Documentation/Documentation.html")
        var components = URLComponents(url: file, resolvingAgainstBaseURL: false)!
        let allowed = CharacterSet(charactersIn: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~")
        components.percentEncodedFragment = "/fr/" + (page.addingPercentEncoding(withAllowedCharacters: allowed) ?? "overview")
        if let url = components.url { NSWorkspace.shared.open(url) }
    }
}
