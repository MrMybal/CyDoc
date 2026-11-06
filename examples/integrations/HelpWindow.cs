using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

public sealed class HelpWindow : Form
{
    public static string HelpUrl(string indexFile, string locale, string page, string section,
                                 IDictionary<string, string> state)
    {
        string result = new Uri(Path.GetFullPath(indexFile)).AbsoluteUri + "#/" + Uri.EscapeDataString(locale) + "/" + Uri.EscapeDataString(page);
        if (!String.IsNullOrEmpty(section)) result += "/" + Uri.EscapeDataString(section);
        bool first = true;
        foreach (var entry in state) { result += (first ? "?" : "&") + Uri.EscapeDataString(entry.Key) + "=" + Uri.EscapeDataString(entry.Value); first = false; }
        return result;
    }

    public HelpWindow()
    {
        Text = "CyDoc · Windows F1"; Width = 480; Height = 180; KeyPreview = true;
        Controls.Add(new Label { Text = "F1: aide contextuelle locale", AutoSize = true, Left = 30, Top = 45 });
        KeyDown += delegate(object sender, KeyEventArgs e) {
            if (e.KeyCode != Keys.F1) return;
            e.Handled = true;
            string url = HelpUrl(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "Documentation", "Documentation.html"), "fr", "video-viewer", null,
                new Dictionary<string, string> { { "media", "media-1" }, { "time", "1.25" } });
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        };
    }

    [STAThread] public static void Main() { Application.EnableVisualStyles(); Application.Run(new HelpWindow()); }
}
