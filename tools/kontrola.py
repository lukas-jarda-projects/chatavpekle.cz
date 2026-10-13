"""Kontrola statického webu v site/.

Spuštění:  python tools/kontrola.py
Výstup 0 = v pořádku, 1 = nalezené chyby (vypíše je).
"""
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

SITE = Path(__file__).resolve().parent.parent / "site"
STRANKY = ["index.html", "cenik/index.html", "fotky/index.html", "okoli/index.html", "kontakt/index.html", "404.html"]
# „Sunset“ chytí zbytky kódu zkopírovaného z webu Sunset apartment (komentáře, <title>)
ZAKAZANE = ["altisima", "dorsys", "jidelna-sql", "id==G-", "Sunset"]
POVINNE = {
    "cenik/index.html": ["12 500", "4 300", "3000 Kč", "1188643183/0800"],
    "okoli/index.html": ["Single trek pod Smrkem", "Přehrada Souš"],
    "kontakt/index.html": ["chata.v.pekle@seznam.cz", "+420 737 288 911", "Peklo č.p.120"],
}
# 1:1 s fotky.vue včetně 2 duplicit; po rozhodnutí o duplicitách případně 18
FOTEK_V_GALERII = 18
POVOLENE_HOSTY_SKRIPTU = set()
URL_V_CSS = re.compile(r"url\(\s*[\"']?([^\"')]+)[\"']?\s*\)")


class Sber(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.odkazy, self.skripty, self.nav = [], [], []
        self.lang, self.title, self.description = None, "", None
        self.bez_alt, self.fotek, self.base, self.titulku = 0, 0, False, 0
        self._v_title, self._v_nav = False, 0

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "html":
            self.lang = a.get("lang")
        if tag == "base":
            self.base = True
        if tag == "title":
            self._v_title = True
            self.titulku += 1
        if tag == "meta" and a.get("name") == "description":
            self.description = a.get("content")
        if tag == "nav":
            self._v_nav += 1
        if self._v_nav and tag == "a" and a.get("href"):
            self.nav.append(a["href"])
        for k in ("href", "src"):
            if a.get(k):
                self.odkazy.append((tag, a[k]))
        for cast in (a.get("srcset") or "").split(","):
            if cast.strip():
                self.odkazy.append((tag, cast.split()[0]))
        for u in URL_V_CSS.findall(a.get("style") or ""):
            self.odkazy.append((tag, u))
        if tag == "script" and a.get("src"):
            self.skripty.append(a["src"])
        if tag == "img" and not a.get("alt"):
            self.bez_alt += 1
        if tag == "a" and "statics/galerie/" in (a.get("href") or ""):
            self.fotek += 1

    def handle_endtag(self, tag):
        if tag == "title":
            self._v_title = False
        if tag == "nav":
            self._v_nav -= 1

    def handle_data(self, data):
        if self._v_title:
            self.title += data


def cil(soubor, url, koren_povolen=False):
    """Vrátí cílovou cestu lokálního odkazu, nebo None u externích a kotev."""
    if url.startswith(("#", "mailto:", "tel:", "data:", "//")) or urlparse(url).scheme:
        return None
    cesta = unquote(urlparse(url).path)
    if not cesta:
        return None
    if cesta.startswith("/"):
        if not koren_povolen:
            return "ABSOLUTNI"
        t = SITE / cesta.lstrip("/")
    else:
        t = soubor.parent / cesta
    t = t.resolve()
    if cesta.endswith("/") or t.is_dir():
        t = t / "index.html"
    return t


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    if not SITE.is_dir():
        print(f"CHYBA: chybí složka {SITE}")
        return 1
    chyby, menu, pocet_odkazu, popisy = [], {}, 0, {}
    for rel in STRANKY:
        f = SITE / rel
        if not f.is_file():
            chyby.append(f"{rel}: soubor chybí")
            continue
        text = f.read_text(encoding="utf-8")
        s = Sber()
        s.feed(text)
        je_404 = rel == "404.html"
        if s.lang != "cs":
            chyby.append(f"{rel}: <html lang> je {s.lang!r}, má být 'cs'")
        if s.titulku != 1:
            chyby.append(f"{rel}: {s.titulku}x <title>, má být právě 1")
        if not s.title.strip():
            chyby.append(f"{rel}: prázdný <title>")
        if not je_404 and not s.description:
            chyby.append(f"{rel}: chybí <meta name=description>")
        elif not je_404 and s.description in popisy:
            chyby.append(f"{rel}: stejná meta description jako {popisy[s.description]}")
        elif not je_404:
            popisy[s.description] = rel
        if s.base:
            chyby.append(f"{rel}: <base> mění význam relativních odkazů, odstranit")
        if s.bez_alt:
            chyby.append(f"{rel}: {s.bez_alt}x <img> bez alt")
        for tag, url in s.odkazy:
            pocet_odkazu += 1
            t = cil(f, url, koren_povolen=je_404)
            if t == "ABSOLUTNI":
                chyby.append(f"{rel}: absolutní cesta {url} (pod /chatavpekle.cz/ nefunguje, piš relativně)")
            elif t is not None and not t.exists():
                chyby.append(f"{rel}: <{tag}> míří na neexistující {url}")
        for src in s.skripty:
            host = urlparse(src).netloc
            if host and host not in POVOLENE_HOSTY_SKRIPTU:
                chyby.append(f"{rel}: cizí skript {src}")
        for slovo in POVINNE.get(rel, []):
            if slovo not in text:
                chyby.append(f"{rel}: chybí povinný text {slovo!r}")
        if rel == "fotky/index.html" and s.fotek != FOTEK_V_GALERII:
            chyby.append(f"{rel}: galerie má {s.fotek} fotek, má {FOTEK_V_GALERII}")
        if not je_404:
            menu[rel] = [str(cil(f, h)) for h in s.nav]
    vzor = menu.get("index.html")
    for rel, polozky in menu.items():
        if not polozky:
            chyby.append(f"{rel}: v <nav> nejsou odkazy")
        elif polozky != vzor:
            chyby.append(f"{rel}: menu se liší od index.html")
    for css in SITE.rglob("*.css"):
        for url in URL_V_CSS.findall(css.read_text(encoding="utf-8")):
            t = cil(css, url)
            if t == "ABSOLUTNI":
                chyby.append(f"{css.relative_to(SITE)}: absolutní url({url})")
            elif t is not None and not t.exists():
                chyby.append(f"{css.relative_to(SITE)}: url({url}) neexistuje")
    for f in list(SITE.rglob("*.html")) + list(SITE.rglob("*.js")) + list(SITE.rglob("*.css")):
        text = f.read_text(encoding="utf-8")
        for slovo in ZAKAZANE:
            if slovo in text:
                chyby.append(f"{f.relative_to(SITE)}: zakázaný text {slovo!r}")
    velikost = sum(p.stat().st_size for p in SITE.rglob("*") if p.is_file()) / 1_048_576
    for c in chyby:
        print("CHYBA:", c)
    print(f"{'NEPROŠLO' if chyby else 'OK'}: {len(chyby)} chyb, {pocet_odkazu} odkazů, web {velikost:.1f} MB")
    return 1 if chyby else 0


if __name__ == "__main__":
    sys.exit(main())
