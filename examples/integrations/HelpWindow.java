import java.awt.Desktop;
import java.awt.event.ActionEvent;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.util.Map;
import javax.swing.*;

public final class HelpWindow {
    private static String encode(String value) { return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20"); }
    public static URI helpUri(Path index, String locale, String page, Map<String,String> state) {
        StringBuilder result = new StringBuilder(index.toAbsolutePath().toUri().toASCIIString()).append("#/").append(encode(locale)).append('/').append(encode(page));
        boolean first = true;
        for (var entry : state.entrySet()) { result.append(first ? '?' : '&').append(encode(entry.getKey())).append('=').append(encode(entry.getValue())); first = false; }
        return URI.create(result.toString());
    }
    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            JFrame frame = new JFrame("CyDoc · F1"); frame.setSize(480,180); frame.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
            frame.add(new JLabel("F1: local contextual help", SwingConstants.CENTER));
            frame.getRootPane().getInputMap(JComponent.WHEN_IN_FOCUSED_WINDOW).put(KeyStroke.getKeyStroke("F1"), "help");
            frame.getRootPane().getActionMap().put("help", new AbstractAction() {
                public void actionPerformed(ActionEvent event) {
                    try {
                        Path appDir = Path.of(HelpWindow.class.getProtectionDomain().getCodeSource().getLocation().toURI());
                        if (!java.nio.file.Files.isDirectory(appDir)) appDir = appDir.getParent();
                        Desktop.getDesktop().browse(helpUri(appDir.resolve("help/index.html"), "fr", "precise-links", Map.of()));
                    }
                    catch (Exception error) { JOptionPane.showMessageDialog(frame, error.getMessage(), "Documentation", JOptionPane.ERROR_MESSAGE); }
                }
            });
            frame.setVisible(true);
        });
    }
}
