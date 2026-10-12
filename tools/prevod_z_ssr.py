"""Jednorázový převod SSR webu na statické soubory v site/.

Spuštění:  tools/.venv/Scripts/python tools/prevod_z_ssr.py [zdroj]
Zdroj je místní SSR z master starého repa (Task 0, krok 7), výchozí http://localhost:3124.
Přepíše HTML v site/, stažené soubory přeskočí, pokud už existují (Task 2 plánu).
"""
import posixpath
import re
import sys
from pathlib import Path
from urllib.parse import quote, unquote
from urllib.request import urlopen

from bs4 import BeautifulSoup

ZDROJ = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3124"
KOREN = Path(__file__).resolve().parent.parent
SITE = KOREN / "site"
# Scoped CSS komponent leží v chuncích, které načítá jen JS (SSR HTML na ně neodkazuje).
CHUNKY = KOREN.parent / "chatavpekle.cz-stare/dist/ssr/www/css"
STRANKY = {"/": "index.html", "/cenik": "cenik/index.html", "/fotky": "fotky/index.html",
           "/okoli": "okoli/index.html", "/kontakt": "kontakt/index.html"}
HASH = re.compile(r"\.[0-9a-f]{8}(\.\w+)$")
# Jako App.vue: kořen #q-app dostane třídy gt-xs/gt-sm/gt-md/gt-lg podle šířky (hranice Quasaru).
# CSS komponent na ně navazuje rozvržení (např. karty dopravy ve 3 sloupcích jen s .gt-xs).
TRIDY_SIRKY = ("(function(){var a=document.getElementById('q-app'),w=window.innerWidth;"
               "[['xs',600],['sm',1024],['md',1440],['lg',1920]].forEach(function(b)"
               "{a.classList.toggle('gt-'+b[0],w>=b[1])})})()")
URL_V_CSS = re.compile(r"url\(\s*([\"']?)([^\"')]+)\1\s*\)")


def stahni(vzdalena, mistni):
    cil = SITE / mistni
    if cil.exists():
        return
    cil.parent.mkdir(parents=True, exist_ok=True)
    with urlopen(ZDROJ + "/" + quote(unquote(vzdalena))) as r:
        cil.write_bytes(r.read())
    print("stazeno", mistni)


def lokalni(url):
    """Vrátí cestu souboru vůči kořeni webu, nebo None, není-li lokální."""
    if url.startswith("//") or "://" in url or url.startswith(("#", "data:", "mailto:", "tel:")):
        return None
    if url.startswith("/"):
        return url[1:]
    if url.startswith("statics/"):
        return url
    return None


def prevod_odkazu(url, prefix):
    if url in STRANKY:
        cil = STRANKY[url].removesuffix("index.html")
        return (prefix + cil) or "./"
    cesta = lokalni(url)
    if cesta is None:
        return url
    cista = HASH.sub(r"\1", cesta.split("?")[0])
    stahni(cesta.split("?")[0], cista)
    return prefix + cista


def prevod_css(text, prefix):
    return URL_V_CSS.sub(lambda m: f'url("{prevod_odkazu(m.group(2), prefix)}")', text)


def prevod_css_souboru(text):
    """CSS leží v css/ a Quasar v něm odkazuje relativně (../fonts/…): převést na cestu od kořene."""
    def nahrada(m):
        url = m.group(2)
        if lokalni(url) is None and "://" not in url and not url.startswith(("data:", "#")):
            url = "/" + posixpath.normpath("css/" + url)
        return f'url("{prevod_odkazu(url, "../")}")'
    return URL_V_CSS.sub(nahrada, text)


def spoj_chunky():
    """Všechny CSS chunky kromě app.*.css spojí do css/komponenty.css (chunk-common první)."""
    chunky = sorted((p for p in CHUNKY.glob("*.css") if not p.name.startswith("app.")),
                    key=lambda p: (not p.name.startswith("chunk-common"), p.name))
    assert chunky, f"v {CHUNKY} nejsou CSS chunky, nejdřív build (Task 0 krok 6)"
    cil = SITE / "css" / "komponenty.css"
    cil.parent.mkdir(parents=True, exist_ok=True)
    cil.write_text("\n".join(f"/* {p.name} */\n" + p.read_text(encoding="utf-8") for p in chunky),
                   encoding="utf-8", newline="\n")
    print("chunky", ", ".join(p.name for p in chunky))


def main():
    SITE.mkdir(exist_ok=True)
    spoj_chunky()
    for cesta, soubor in STRANKY.items():
        prefix = "../" * soubor.count("/")
        with urlopen(ZDROJ + cesta) as r:
            soup = BeautifulSoup(r.read().decode("utf-8"), "html.parser")
        soup.html["lang"] = "cs"
        # SSR dává <base href="/">; s relativními odkazy by v podsložce (náhled Pages) vše rozbil
        for b in soup.find_all("base"):
            b.decompose()
        for s in soup.find_all("script"):
            if (s.get("src") or "").startswith("/js/") or "__INITIAL_STATE__" in (s.string or ""):
                s.decompose()
        for l in soup.find_all("link"):
            rel = set(l.get("rel") or [])
            if (l.get("href") or "").startswith("/js/") or rel & {"preload", "prefetch"}:
                l.decompose()
        # SSR dává dva <title> (z meta stránky a ze šablony); text doladí Task 6
        for t in soup.find_all("title")[1:]:
            t.decompose()
        for tag in soup.find_all(True):
            for attr in ("href", "src"):
                if tag.get(attr):
                    tag[attr] = prevod_odkazu(tag[attr].replace("id==", "id="), prefix)
            if tag.get("style"):
                tag["style"] = prevod_css(tag["style"], prefix)
        koren = soup.find(id="q-app")
        del koren["data-server-rendered"]
        skript = soup.new_tag("script")
        skript.string = TRIDY_SIRKY
        koren.insert(0, skript)
        app_css = soup.find("link", rel="stylesheet")
        app_css.insert_after(soup.new_tag("link", rel="stylesheet", href=prefix + "css/komponenty.css"))
        cil = SITE / soubor
        cil.parent.mkdir(parents=True, exist_ok=True)
        # formatter="minimal": čeština zůstane jako znaky (html5 by z ř udělal &rcaron;)
        cil.write_text(soup.prettify(formatter="minimal"), encoding="utf-8", newline="\n")
        print("stranka", soubor)
    for css in (SITE / "css").glob("*.css"):
        css.write_text(prevod_css_souboru(css.read_text(encoding="utf-8")), encoding="utf-8", newline="\n")
        print("css", css.name)


if __name__ == "__main__":
    main()
