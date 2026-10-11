"""Stamp asset links in the HTML pages with a content hash (?v=...), so
browsers fetch updated CSS/JS right away instead of a cached copy.
Run before committing: python3 version-assets.py"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).parent
pages = ["index.html", "404.html", "demo/articles.html", "demo/cluster.html", "demo/exchange/index.html"]
for page in pages:
    path = root / page
    html = path.read_text()
    def stamp(m):
        attr, url = m.group(1), m.group(2)
        clean = url.split("?")[0]
        target = (path.parent / clean) if not clean.startswith("/") else (root / clean.lstrip("/"))
        if not target.is_file():
            return m.group(0)
        v = hashlib.sha1(target.read_bytes()).hexdigest()[:8]
        return f'{attr}="{clean}?v={v}"'
    new = re.sub(r'(src|href)="((?!https?:|#|mailto:)[^"]+\.(?:css|js))(?:\?v=[0-9a-f]+)?"', stamp, html)
    if new != html:
        path.write_text(new)
        print("stamped", page)
