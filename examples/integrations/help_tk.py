"""Windows/Linux/macOS: stdlib path/link helper and optional Tkinter F1 example."""
from pathlib import Path
from urllib.parse import quote, urlencode
import webbrowser


def help_url(index_file, locale="fr", page="overview", section=None, **state):
    url = Path(index_file).resolve().as_uri() + "#/" + quote(locale, safe="") + "/" + quote(page, safe="")
    if section:
        url += "/" + quote(section, safe="")
    if state:
        url += "?" + urlencode(state, quote_via=quote)
    return url


def main():
    import tkinter as tk
    app = tk.Tk()
    app.title("CyDoc · F1")
    tk.Label(app, text="F1: aide contextuelle locale", padx=35, pady=40).pack()
    app.bind("<F1>", lambda event: webbrowser.open(help_url(Path(__file__).parent / "help/index.html", page="precise-links")))
    app.mainloop()


if __name__ == "__main__":
    main()
