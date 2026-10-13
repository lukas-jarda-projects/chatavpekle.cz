# Chata v Pekle

Web chaty k pronájmu v Jizerských horách, https://chatavpekle.cz. Čisté HTML, CSS a malý vanilla JS,
bez buildu. Nasazuje se na GitHub Pages ze složky `site/`.

Vznikl převodem původního webu v Quasaru 1 (SSR) na statické stránky. Postup a rozhodnutí jsou
v [docs/plans/2026-10-13-staticky-web-github-pages.md](docs/plans/2026-10-13-staticky-web-github-pages.md).

## Struktura

- `site/index.html`, `site/cenik/`, `site/fotky/`, `site/okoli/`, `site/kontakt/` – stránky
- `site/css/app.css` – zkompilované CSS Quasaru (neupravovat), `komponenty.css` – styly komponent
  se selektory `[data-v-…]` (atributy `data-v-…` v HTML musí zůstat), `web.css` – vlastní styly
- `site/js/web.js` – menu, skrývání hlavičky, galerie, lightbox a zoom
- `site/statics/galerie/` – fotky galerie, `site/img/` – velké fotky stránek
- `site/404.html` – samostatná stránka s vloženým stylem
- `site/google554520753bcc9e67.html` – ověřovací soubor Google Search Console (neměnit, nemazat)

## Úpravy

- **Ceny:** `site/cenik/index.html`, prvky `.cena`. Cena a `<span class="kc">&nbsp;Kč</span>` musí
  zůstat na jednom řádku, jinak se „Kč“ odsune.
- **Galerie:** odkazy `<a class="gallery-item">` v `site/fotky/index.html`. Při změně počtu fotek
  upravit `FOTEK_V_GALERII` v `tools/kontrola.py`.
- Hlavička a patička jsou v každé stránce zvlášť, změnu je třeba udělat ve všech pěti.

## Náhled a kontrola

```
python -m http.server -d site 8773
python tools/kontrola.py
```

Náhled: http://localhost:8773/. Kontrola hlídá odkazy, `alt`, titulky, popisy a počet fotek
v galerii; při úspěchu vypíše `OK: 0 chyb`.
