"""
@doc api-python
@locale fr
@title Python · help_link
@symbol help_link
@section API
@order 180
Génère un lien local depuis Python, sans lancer de serveur.

## Signature {#signature}

```python
def help_link(base: str, locale: str, page: str, section: str = "") -> str:
```

## Exemples et intégration {#integration}

[Voir les exemples de code](doc:code-languages).
"""

"""
@doc api-python
@locale en
@title Python · help_link
@symbol help_link
@section API
@order 180
Generate a local link from Python without starting a server.

## Signature {#signature}

```python
def help_link(base: str, locale: str, page: str, section: str = "") -> str:
```

## Examples and integration {#integration}

[View code examples](doc:code-languages).
"""

from urllib.parse import quote

def help_link(base: str, locale: str, page: str, section: str = "") -> str:
    route = f"{base.split('#', 1)[0]}#/{quote(locale, safe='')}/{quote(page, safe='')}"
    return route + (f"/{quote(section, safe='')}" if section else "")
