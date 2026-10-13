# Chata v Pekle: statický web na GitHub Pages (implementační plán)

> **Pro Claude:** POVINNÝ SUB-SKILL: při provádění použij `superpowers:executing-plans` (krok po kroku s kontrolními body).

**Cíl:** Web chatavpekle.cz poběží jako čisté HTML + CSS + malý vanilla JS na GitHub Pages. Bez Node na serveru, bez buildu, upravitelný přímo v HTML. DNS zůstane u Websupportu (Active24).

**Architektura:** Stejný postup jako u Sunsetu (`C:/work/projects/Sunset-apartment.com`, plán `docs/plans/2026-10-12-staticky-web-github-pages.md`, dál jen „Sunset“). Kostra stránek vznikne jednorázovým převodem SSR výstupu `master`, spuštěného lokálně přes Node 16. Zkompilované CSS Quasaru zůstane jako jeden soubor. Menu, mobilní panel, galerie a lightbox nahradí `site/js/web.js` převzatý ze Sunsetu. Výsledek leží v `site/` a nasazuje ho GitHub Actions workflow, který soubory jen nahraje. Repo vznikne **nové s čistou historií**. Staré repo se zazálohuje a na GitHubu smaže.

**Technologie:** HTML, CSS, vanilla JS (ES2017, bez knihoven). Nástroje v Pythonu 3: `tools/kontrola.py` je čistá stdlib, převodní skript potřebuje `beautifulsoup4` v lokálním venv. Node 16 se použije jen na build a běh SSR v Tasku 0.

**Stav:** Plán napsán 2026-10-13. Předem ověřeno: build SSR s Node 16 projde a místní SSR vrací všech 5 stránek (Výchozí stav).
- Task 0: hotový 2026-10-13 (výsledky v „Provedeno“ u Tasku 0). Místní SSR na portu 3124 se po konci session musí spustit znovu (krok 7).
- Task 1, Task 2: hotové 2026-10-13. Kontrola po Tasku 2: 16 chyb (rozpis v „Provedeno“ u Tasku 2).
- Task 3: hotový 2026-10-13. Kontrola: 11 chyb, Úvod, V okolí a Kontakt jsou na snímcích shodné se SSR na pixel (rozpis v „Provedeno“ u Tasku 3).
- Task 4: hotový 2026-10-13. Kontrola: 6 chyb, všechny stránky kromě galerie Fotek shodné se SSR na pixel (rozpis v „Provedeno“ u Tasku 4).

---

## Výchozí stav (ověřeno 2026-10-13)

- **Živý web neběží.** DNS míří na `88.146.221.173` (reverzní záznam `ip-88-146-221-173.net.vodafone.cz`) a HTTP ani HTTPS do 20 s neodpoví. (Dotaz na API Web Archive `wayback/available` vrátil 404 stránku samotného API, takže o archivních snímcích nic neříká; neplatné měření, neopakovat stejně.) Za převod se tedy nic nevypíná a rollback na starý server není možný ani potřeba.
- **Doména** u Websupportu (administrace Active24, služba `https://admin.websupport.cz/cs/dashboard/service/2072776`): stav „Nepřipojena k hostingu“, vlastník Václav Vachel, expirace 1. 6. 2027. NS `ns1.websupport.cz`, `ns2.websupport.cz`, `ns3.websupport.eu`. Přehled služby ukazuje A `88.146.221.173` „+ 2 A záznamů“. `www` vrací tutéž adresu. MX, TXT ani AAAA na apexu nejsou, pošta na doméně tedy neběží. Výchozí TTL zóny podle SOA je 2560 s.
- **Staré repo** `lukas-jarda-projects/chatavpekle.cz`: soukromé, 15 commitů (poslední `8a799dd` z 1. 2. 2024 „uprava ceny“), jediná větev `master`, na GitHubu ~8,6 MB. Pracovní kopie byla `C:/work/projects/chatavpekle.cz/chatavpekle.cz`, od Tasku 0 je v `C:/work/projects/chatavpekle.cz-stare`. V historii jsou věci, které se zveřejnit nesmí: sdílený kód `lib/`, `Jenkinsfile` a interní hostitelé a cesty Altisimy v `package.json`. Proto nové repo, ne zveřejnění starého (rozhodnutí uživatele 2026-10-13).
- **Quasar 1 SSR** (Pug, Stylus), router `/`, `/cenik`, `/fotky`, `/okoli`, `/kontakt`. V `quasar.conf.js` je `vueRouterMode: 'hash'`, ale SSR build běží v režimu history (místní SSR odpovídá na `/cenik` atd.).
- **Stránky** (zdroj `src/pages/Index.vue`, `src/pages/Public/*.vue`) jsou jen statický text. Každá má velkou fotku nahoře (`chvp_foto01–05.jpg`), nadpis a text. Ceník: 12 500 Kč za týden (červenec, srpen), 4 300 Kč za víkend, kauce 3000 Kč, povlečení 100 Kč, úklid 500 Kč, účet 1188643183/0800. V okolí: 11 odkazů s `target="_blank"`. Kontakt: Facebook, mapy.cz, e-mail, telefon. Formulář (`Formular.vue`) v žádné stránce použitý není.
- **Interaktivní prvky:**
  - `src/layouts/Layout.vue`: desktop `q-tabs` se 5 položkami (logo uprostřed, e-mail a telefon vpravo), pod `md` (1024 px) hamburger a `q-drawer` se svislými záložkami a tlačítkem „zavřít“, logo, ikony mail a telefon. `q-header reveal`, tedy hlavička se skrývá při scrollu dolů.
  - `src/layouts/LayoutFooter.vue`: dvě varianty podle `$q.screen.lt.md` (mobil: logo, ©, telefon, e-mail pod sebou; desktop: v řádku s logem `.footer-logo`).
  - `src/components/JidelnaGallery.vue`: mřížka `q-img.gek-screenshots` (250 / 150 / 100 px podle šířky, zaoblení 25 px) a `TinyBox.vue` (lightbox, `loop`, `no-thumbs`, swipe).
  - `src/App.vue`: třídy `gt-xs…gt-lg` na `#q-app` (stejně jako Sunset).
  - Karusel, počítadla ani záložky galerie na webu NEJSOU.
- **Galerie:** pole `poschodi` v `src/pages/Public/fotky.vue` má **20 položek, z toho 2 duplicity** (`20220515_105402.jpg` a `20220515_105317.jpg` jsou tam dvakrát). Unikátních fotek je 18, všechny existují v `src/statics/galerie/`. Rozměry jsou 1662 × 936 nebo 936 × 1662 px (změřeno PIL u všech 18 JPG), celkem 2,1 MB.
- **Hlava stránky:** GA (`gtag`) i retargeting Seznamu jsou v `src/index.template.html` **zakomentované**, takže web neměří nic. ID v komentáři (`G-5Y4HJPKVK0`) je stejné jako u Sunsetu, šablona je zkopírovaná. Zůstávají meta `google-site-verification` a `msvalidate.01`.
- **Místní SSR** (ověřeno 2026-10-13 na portu 3124): `/` 200 (19 918 B), `/cenik` 200, `/fotky` 200, `/okoli` 200, `/kontakt` 200, `/neexistuje` 404 (20 B). `<html lang=en-us>`, `meta description` je na všech stránkách „Jizerské hory na okraji obce Peklo“. Stránky mají **dva `<title>`** („Chata v Pekle“ z `meta` stránky a „Vencova Chata“ ze šablony), Kontakt jen „Vencova Chata“.
  - **SSR vykreslí MOBILNÍ variantu** hlavičky i patičky: `whole-menu-mobile` 2×, `q-drawer` ano, `.footer-logo` 0×. Na serveru je `$q.screen` nulové, takže platí `lt.md`. Desktopovou variantu je třeba přepsat ručně z Pugu (Task 3).
  - Galerie v SSR HTML má 20× `gek-screenshots`, ale **bez cest k fotkám** (`q-img` načítá až JS). HTML galerie se proto generuje ze `fotky.vue` (Task 5).
  - CSS: `app.630adad0.css` + 6 chunků `3–8.*.css` v `dist/ssr/www/css`. Scoped CSS komponent je jen v chuncích, které načítá JS.
- **Build** (ověřeno 2026-10-13): s Node 24 padá dvakrát. Nejdřív `sharp` z rozšíření icon-genie („Module did not self-register“), a když se rozšíření dočasně vypne, pak `node-sass` 4.14.1 („Node Sass does not yet support your current environment: Windows 64-bit with Unsupported runtime (137)“). `node_modules/node-sass/vendor/` má binárky jen `win32-x64-83` (Node 14) a `win32-x64-93` (Node 16). **S přenosným Node 16.20.2 build projde i se zapnutým icon-genie** (`Build succeeded`, `dist/ssr/` vznikl). Build mimochodem vytvořil netrackovanou složku `src-ssr/` ve starém repu (neškodné, zanikne se starým repem) a icon-genie přepsal `iconHash` v `quasar.extensions.json` (vráceno `git checkout`; po každém dalším buildu vrátit stejně, ať staré repo zůstane čisté).

## Rozhodnutí

| rozhodnutí | důvod |
|---|---|
| Čisté HTML (varianta B jako Sunset), ne Quasar build v CI | úpravy bez buildu; každá stránka je hotové HTML |
| Kostra ze SSR HTML `master` | vzhled sedí 1:1; živý web neběží, jiný zdroj není |
| **Nové repo s čistou historií**, staré zazálohovat a na GitHubu smazat | rozhodnutí uživatele 2026-10-13; u 15 commitů jednodušší a bezpečnější než `git filter-repo` |
| **Obsah 1:1 podle `master`** (ceny z 2/2024) | rozhodnutí uživatele 2026-10-13; úpravy pak přímo v HTML |
| **Animace ze Sunsetu všechny** (ukazatel menu, postupné objevení fotek, přelet do detailu, listování, pinch zoom) | rozhodnutí uživatele 2026-10-13; `web.js` Sunsetu je ověřený na telefonu |
| Opravy SEO jako u Sunsetu: `lang="cs"`, jeden `<title>`, vlastní `meta description` na stránku, `alt` u obrázků | kontrola je hlídá; texty schválí uživatel (Task 6) |
| GA a retargeting se nepřidávají | v `master` jsou zakomentované, 1:1 = bez měření |
| Zkompilované CSS Quasaru celé, relativní odkazy všude kromě `404.html` | jako Sunset: náhled `lukas-jarda-projects.github.io/chatavpekle.cz/` běží v podsložce |
| Nasazení přes Actions (`upload-pages-artifact`), web v `site/` | jako Sunset, workflow se převezme beze změny |
| Nové repo v `C:/work/projects/chatavpekle.cz` (kořen projektu), staré se přesune do `C:/work/projects/chatavpekle.cz-stare` | stejné uspořádání jako Sunset; plán už v kořeni leží |
| Pošta: nic se nemění | MX ani SPF neexistují |

## Otevřené (zeptat se uživatele, až na ně dojde)

1. **Duplicitní fotky v galerii** (Task 5): 1:1 znamená 20 náhledů včetně dvou opakovaných. Navrhnout odstranění duplicit (18 fotek). Výchozí stav do odpovědi je 1:1 (20). **Rozhodnuto uživatelem 2026-10-13: duplicity vyhodit, 18 fotek.**
2. **Texty `title` a `meta description`** pro 5 stránek (Task 6): navrhnout a nechat schválit. Spolu s nimi schválit `alt` velkých fotek (návrhy jsou už v HTML, výčet v „Provedeno“ u Tasku 4).
3. **Kdo provozoval starý server na `88.146.221.173`** a jestli na něm (nebo v Jenkinsu Altisimy) zbyla služba nebo job webu, který by měl někdo zrušit (Task 13). U Sunsetu to byl Robert z Altisimy.
4. **Co jsou ty „+ 2 A záznamy“** v DNS u Websupportu (Task 12). Zjistit v administraci, rozhodnout s uživatelem.

---

## Task 0: Příprava

**Krok 1: Přesun starého repa.** Nejdřív ukončit místní SSR, pokud běží (proces `node.exe` s `dist/ssr/index.js`, port 3124), jinak Windows složku nepustí. Pak:

```
mv /c/work/projects/chatavpekle.cz/chatavpekle.cz /c/work/projects/chatavpekle.cz-stare
git -C /c/work/projects/chatavpekle.cz-stare log --oneline | wc -l
```

Očekávané: `15`. Složka `dist/ssr` z buildu 2026-10-13 se přesune s repem.

**Krok 2: Zálohy staré historie** (do `C:/work/archive/`, které zálohuje restic):

```
git clone --mirror https://github.com/lukas-jarda-projects/chatavpekle.cz.git /c/work/archive/chatavpekle.cz-pred-smazanim.git
git -C /c/work/projects/chatavpekle.cz-stare bundle create /c/work/archive/chatavpekle.cz-lokalni-8a799dd.bundle --all
git -C /c/work/archive/chatavpekle.cz-pred-smazanim.git log --oneline -1 master
```

Očekávané: `8a799dd uprava ceny`. Mirror musí obsahovat totéž co lokální `master`. Když se liší, zastavit a zeptat se.

**Krok 3: Nové repo** v `C:/work/projects/chatavpekle.cz`:

```
git -C /c/work/projects/chatavpekle.cz init -b master
```

`.gitignore`:

```
# nástroje statického webu
tools/.venv/
.reference/
```

**Krok 4: venv** (jen pro převod v Tasku 2):

```
python -m venv tools/.venv
tools/.venv/Scripts/python -m pip install beautifulsoup4
```

**Krok 5: Node 16** (přenosný, globální Node 24 zůstane). Uložit do starého repa, ať zanikne s ním (Task 13). Postup ověřen 2026-10-13 (stažení do scratchpadu, kontrolní součet OK, `node.exe --version` = `v16.20.2`).

```
mkdir -p /c/work/projects/chatavpekle.cz-stare/.node16 && cd /c/work/projects/chatavpekle.cz-stare/.node16
curl -sS -O https://nodejs.org/dist/v16.20.2/node-v16.20.2-win-x64.zip
curl -sS -O https://nodejs.org/dist/v16.20.2/SHASUMS256.txt
grep "win-x64.zip" SHASUMS256.txt | sha256sum -c -
unzip -q node-v16.20.2-win-x64.zip
```

Očekávané: `node-v16.20.2-win-x64.zip: OK`. Dál `N=/c/work/projects/chatavpekle.cz-stare/.node16/node-v16.20.2-win-x64`. Staré repo `.node16/` neignoruje, ale do něj se už necommituje.

**Krok 6: Build** je HOTOVÝ (2026-10-13, `dist/ssr/` se přesunul s repem). Opakovat jen při změně `src/` nebo chybějícím `dist/ssr`. Z kořene `chatavpekle.cz-stare`:

```
PATH="$N:$PATH" "$N/node.exe" node_modules/@quasar/app/bin/quasar build --mode ssr
```

Očekávané: `Build succeeded` (doba neměřena). S Node 24 build NEPROJDE (`sharp`, `node-sass`; Výchozí stav).

**Krok 7: Místní SSR** (na pozadí, poběží do Tasku 8), z kořene `chatavpekle.cz-stare`:

```
PORT=3124 "$N/node.exe" dist/ssr/index.js
```

Očekávané: `Server listening at port 3124`. Ověřit, že `/`, `/cenik`, `/fotky`, `/okoli`, `/kontakt` vrací 200. Port 3123 si nechávám pro Sunset, 3124 byl 2026-10-13 volný.

**Krok 8: Referenční snímky** z místního SSR (5 stránek, 1280 a 400 px) do `.reference/`: `node tools/snimky.mjs` (CDP, čerstvý profil Chrome při každém běhu). ~~Postup ze Sunsetu s `<iframe width="400">`~~ tady nefunguje, důvod je v „Provedeno“.

**Krok 9: Commit**

```
git add .gitignore docs/plans/2026-10-13-staticky-web-github-pages.md
git commit -m "Příprava převodu na statický web"
```

**Provedeno 2026-10-13:**
- Krok 1: přesun prošel napodruhé. Poprvé `mv` hlásil „Device or resource busy“, protože pracovní adresář session byl uvnitř přesouvané složky. Před přesunem tedy nesmí žádný shell ani proces stát ve `chatavpekle.cz/chatavpekle.cz`. Ve `chatavpekle.cz-stare` je 15 commitů, `git status` ukazuje jen netrackovaný `src-ssr/` z buildu.
- Krok 2: `C:/work/archive/chatavpekle.cz-pred-smazanim.git` (mirror, `master` = `8a799dd uprava ceny`, 15 commitů) a `C:/work/archive/chatavpekle.cz-lokalni-8a799dd.bundle` (8,9 MB, `bundle verify` = okay). Lokální `master` i `origin/master` = `8a799dd`.
- Krok 3: `git init -b master` v `C:/work/projects/chatavpekle.cz`, `.gitignore` podle kroku 3 a navíc `*.stackdump`: Git Bash na tomhle stroji nechává v kořeni projektu `bash.exe.stackdump`, 2026-10-13 třikrát. Remote zatím žádný, repo na GitHubu vznikne v Tasku 10.
- Krok 9: commit plánu a `.gitignore` (`b3b48e2` „Příprava převodu na statický web“).
- Krok 4: `tools/.venv` s `beautifulsoup4` 4.15.0.
- Krok 5: `node-v16.20.2-win-x64.zip: OK`, `node.exe --version` = `v16.20.2`.
- Krok 7: `Server listening at port 3124`. `/` 200 (19 918 B), `/cenik` 200 (19 353), `/fotky` 200 (27 378), `/okoli` 200 (20 545), `/kontakt` 200 (18 998), `/neexistuje` 404 (20). Běží na pozadí z `chatavpekle.cz-stare` a po konci session se musí spustit znovu stejným příkazem.
- Krok 8: 10 snímků v `.reference/` (`index|cenik|fotky|okoli|kontakt-1280|400.png`), skript `tools/snimky.mjs` (v repu, použije se i v Tasku 8). Výšky stránek na 1280 px: 2707, 1890, 3213, 1685, 1265; na 400 px: 2522, 1549, 1551, 1319, 1115. Fotky galerie se načetly všechny (na rozdíl od Sunsetu).
  - **Neplatný pokus, neopakovat:** postup ze Sunsetu (`--screenshot`, mobil v `<iframe width="400">` v okně 600 px) dal na 400 px **vybledlý text**. Stránka po hydrataci spouští `fadeIn` a iframe z jiného originu (soubor `file://` → `localhost:3124`) běží v samostatném procesu, kam se `--virtual-time-budget` nepromítne, takže snímek zachytil animaci v půlce. Nepomohlo ani `--disable-site-isolation-trials --disable-features=IsolateOrigins,site-per-process`. Desktopový snímek s oknem 3200 px zase posunul patičku na dno okna, protože `q-page` má `min-height` podle výšky okna. Proto CDP: `Emulation.setDeviceMetricsOverride` (šířka 400 px bez omezení okna), 4 s skutečného čekání a `captureBeyondViewport` při výšce okna 800 px.
  - **Vada originálu:** Ceník na 400 px má `scrollWidth` 472 px, tedy vodorovný přetok. Snímek je oříznutý na 400 px. V Tasku 8 zjistit, který prvek přetéká, a rozhodnout, jestli ho opravit (1:1 by znamenalo ponechat).

Před KAŽDÝM commitem: v repu nesmí být interní hostitelé ani cesty Altisimy. Vzory jsou v `C:/work/archive/sunset-cisteni-historie/overeni.sh` (mimo repo), projít jimi `git grep` nad indexem.

---

## Task 1: Kontrolní skript

**Soubory:** Vytvořit `tools/kontrola.py` jako kopii `C:/work/projects/Sunset-apartment.com/tools/kontrola.py`.

**Krok 1:** Upravit konstanty:

```python
STRANKY = ["index.html", "cenik/index.html", "fotky/index.html", "okoli/index.html", "kontakt/index.html", "404.html"]
ZAKAZANE = ["altisima", "dorsys", "jidelna-sql", "id==G-", "Sunset"]
POVINNE = {
    "cenik/index.html": ["12 500", "4 300", "3000 Kč", "1188643183/0800"],
    "okoli/index.html": ["Single trek pod Smrkem", "Přehrada Souš"],
    "kontakt/index.html": ["chata.v.pekle@seznam.cz", "+420 737 288 911", "Peklo č.p.120"],
}
# všech 9 řetězců je v SSR výstupu právě 1× (ověřeno 2026-10-13); „Sunset“ v SSR 0×
FOTEK_V_GALERII = 20  # 1:1 s fotky.vue včetně 2 duplicit; po rozhodnutí o duplicitách případně 18
```

V `main()` nahradit `"photo/index.html"` za `"fotky/index.html"` (počet fotek). Projít zbytek `main()`: všechno ostatní (odkazy, `<base>`, `lang`, `alt`, stejná `meta description`, hosty skriptů) je obecné. **Navíc doplnit kontrolu, že stránka má právě jeden `<title>`** (Sber počítá `title` tagy, chyba při počtu ≠ 1). SSR jich dává dva (Výchozí stav). `POVOLENE_HOSTY_SKRIPTU` nechat prázdné (`set()`), web nemá GA.

„Sunset“ v `ZAKAZANE` chytí zbytky zkopírovaného kódu (komentáře `web.js`, `web.css`, `<title>`). Když se ukáže, že je někde oprávněně, odebrat a zapsat proč.

**Krok 2: RED.** `python tools/kontrola.py` bez `site/`. Očekávané: exit 1 a `CHYBA: chybí složka …` (tak to má `main()` Sunsetu). S prázdnou složkou `site/` pak 6× `…: soubor chybí`. Pak ověřit mutačně jednu kontrolu, která je nová (dva `<title>`), na dočasném `site/` ve scratchpadu nebo až v Tasku 2.

**Krok 3: Commit** „Kontrolní skript statického webu“.

**Provedeno 2026-10-13:** konstanty podle kroku 1, nová kontrola `{N}x <title>, má být právě 1` (čítač `titulku` v `Sber`), hláška o absolutní cestě teď jmenuje `/chatavpekle.cz/`. RED: bez `site/` exit 1 a `CHYBA: chybí složka …`; s prázdnou `site/` 6× `soubor chybí`, exit 1. Mutačně na kopii ve scratchpadu se SSR `index.html`: dva titulky („Chata v Pekle“, „Vencova Chata“) → `index.html: 2x <title>, má být právě 1`; po odstranění druhého hláška zmizí.

---

## Task 2: Převod SSR na kostru `site/`

**Soubory:** Vytvořit `tools/prevod_z_ssr.py` jako kopii Sunsetu.

**Krok 1:** Upravit:

```python
ZDROJ = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3124"
CHUNKY = KOREN.parent / "chatavpekle.cz-stare/dist/ssr/www/css"
STRANKY = {"/": "index.html", "/cenik": "cenik/index.html", "/fotky": "fotky/index.html",
           "/okoli": "okoli/index.html", "/kontakt": "kontakt/index.html"}
```

Do `main()` za smazání skriptů přidat: ponechat jen první `<title>` (ostatní `decompose()`). Text titulků se doladí v Tasku 6. Docstring opravit (zdroj, port, Task).

**Krok 2:** Spustit `tools/.venv/Scripts/python tools/prevod_z_ssr.py`. Očekávané: `chunky …` (6 souborů), `stranka …` 5×, `css …`, stažené obrázky a fonty.

**Krok 3:** `python tools/kontrola.py`. Výsledek (počet a druh chyb) zapsat sem do „Provedeno“. Čekají se: chybějící `404.html`, galerie 0 fotek, stejná `meta description`, obrázky bez `alt` (loga v hlavičce a patičce, velké fotky `top-image`). `lang` už bude `cs` a `<title>` jeden.

**Krok 4: Commit** „Převod SSR na statickou kostru“.

**Provedeno 2026-10-13:** převod prošel: `chunky` 6 souborů (`3–8.*.css`), 5× `stranka`, `css app.css`, `css komponenty.css`, stažené `img/chvp_foto01–05.jpg`, 5 fontů, favicony `favicon-16x16/32x32/96x96.png` + `favicon.ico`, `statics/app-logo-128x128.png` a `statics/000-flags-select.svg` (odkazuje na něj `komponenty.css`, Task 7 rozhodne, jestli zůstane). Web má 3,3 MB.
- `kontrola.py`: **16 chyb**, 110 odkazů. 5× `2x <img> bez alt` (logo v hlavičce `img.logo` a velká fotka `img.top-image`; logo v patičce má `alt="logo"`), 4× stejná `meta description`, `galerie má 0 fotek, má 20`, `404.html: soubor chybí` a navíc proti očekávání 5× `v <nav> nejsou odkazy` (SSR dal mobilní hlavičku bez `<nav>`, vyřeší Task 3). `lang` i `<title>` prošly.
- Snímky kostry (`tools/snimky.mjs` na portu 8773) proti `.reference/`: písma, barvy a text sedí na 1280 i 400 px. Rozdíly: na 1280 px mobilní hlavička a patička (Task 3) a na obou šířkách je obsah níž. Posun jsem jen odhadl ze snímku (asi 120 px na 1280 px), neměřil. Příčina je stejná jako u Sunsetu: SSR dává `q-page-container` natvrdo `style="padding-top:350px"` a `q-header` `style="height:112px"`, po hydrataci to Quasar přepočítá podle skutečné hlavičky. Opraveno v Tasku 3: změřeno 112 px. Ceník na 400 px přetéká na 472 px i ve statické verzi.
- Loga v hlavičce i patičce jsou vložená jako base64 SVG přímo v HTML. Task 3 je nahradil souborem `img/logo-chatavpekle.svg`.

---

## Task 3: Hlavička, mobilní panel, patička a základ `web.js`

Vzor: Sunset Task 3 a výsledek v `Sunset-apartment.com/site/` (markup hlavičky, `.js-menu`, `body.menu-open`) a sekce „Hlavička“, „Oranžový proužek…“ v `site/css/web.css`.

**Rozdíl proti Sunsetu:** SSR tady vykreslil MOBILNÍ variantu (Výchozí stav). Desktopovou variantu je třeba napsat ručně podle `Layout.vue` (větev `v-else`) a `LayoutFooter.vue` (větev `v-else`). Obě varianty pak budou v HTML a přepínat se budou CSS na hranici 1024 px (Quasar `md`), stejně jako u Sunsetu.

**Krok 1:** Hlavička na všech 5 stránkách stejná:
- desktop: `<nav>` s 5 odkazy (`Úvod`, `Ceník`, `Fotky`, `V okolí`, `Kontakt`) v markupu `q-tab` z SSR, aktivní položka `q-tab--active` + `aria-current="page"` + `.q-tab__indicator`, logo, e-mail `chata.v.pekle@seznam.cz` a telefon `737 288 911` vpravo,
- mobil: hamburger (`.js-menu`), logo, ikony mail a telefon; panel se svislými položkami a tlačítkem „zavřít“,
- odkazy relativní (`./`, `../cenik/` …).
`q-header reveal` (skrývání hlavičky při scrollu dolů): porovnat se SSR v Chrome. Když to Sunset neřeší a vzhled bez toho sedí, nechat hlavičku statickou a zapsat sem.

**Krok 2:** Patička obě varianty, © 2022 nechat (1:1).

**Krok 3:** `site/js/web.js` ze Sunsetu, zatím jen sekce: třídy `gt-*`, mobilní menu, swipe. Karusel, počítadla a záložky NEpřebírat (na webu nejsou). Hlavičku souboru přepsat na „Interaktivita webu Chata v Pekle“. `site/css/web.css`: sekce hlavičky a ukazatele menu (View Transitions mezi dokumenty, od 1024 px).

**Krok 4:** Ověřit v prohlížeči na 1280 a 400 px (náhled `python -m http.server -d site 8773`, port 8000 je na stroji obsazený a 8772 patří Sunsetu): menu, panel, přejezd ukazatele mezi stránkami, kontrola.

**Krok 5: Commit** „Sdílená hlavička, mobilní panel a patička“.

**Provedeno 2026-10-13:**
- Hlavičku a patičku přepsal jednorázový skript (neukládán) podle markupu z **hydratovaného** DOM SSR, vytaženého přes CDP na 1280 a 400 px. Třídy Quasaru proto sedí přesně a nebylo nutné je skládat z Pugu. Obě varianty jsou v HTML: desktop `.whole-menu.gt-sm`, mobil `.whole-menu.lt-md`. Patička je `<footer class="q-mt-lg" data-v-52e497e8>` se dvěma řádky `.lt-md` a `.gt-sm`. Třídy `gt-sm` a `lt-md` mají v `app.css` `display:none!important` podle šířky.
- Desktop: `<nav aria-label="Hlavní menu" class="site-nav …">` (záložky, `q-tab--active` + `aria-current`). Mobil: `<nav aria-label="Menu" id="menu-panel" class="q-drawer …">` místo `<aside>`, backdrop i obě tlačítka mají `.js-menu`, hamburger nese `aria-expanded`. Atributy `role="tab"` a šipky `q-tabs__arrow` vypuštěny, nic nedělaly.
- Logo: base64 SVG nahrazeno souborem `site/img/logo-chatavpekle.svg` (kopie `src/assets/logo-chatavpekle.svg`, SHA-256 shodné s vloženým). Všechna 4 loga mají `alt="Chata v Pekle"` (patička měla `alt="logo"`).
- `q-page-container` má `padding-top:112px` a `q-page` `min-height:calc(100vh - 112px)`. Obojí je změřené na SSR po hydrataci, kde je `padding-top: 112px` a `min-height: 688px` při okně 800 px.
- **`q-header reveal` zachováno.** Na SSR změřeno, že nad 250 px se hlavička při scrollu dolů schová (`q-header--hidden`, posun −123,2 px), při scrollu nahoru se vrátí a `padding-top` zůstává. `web.js` to dělá stejně: viditelná do 250 px, při pohybu nahoru a prvních 100 px po změně směru, s otevřeným menu vždy. Statická verze dala ve všech 13 měřených stavech stejný výsledek jako SSR.
- `web.js`: třídy `gt-*`, menu (Esc, tlačítko „zavřít“, klik na pozadí, ověřeno), reveal, `swipe()` pro Task 5. `web.css`: panel a pozadí (`visibility` + přechod 0,12 s jako Quasar), přechod hlavičky, ukazatel menu přes View Transitions od 1024 px (`view-transition-name: nav-indikator` na 1280 ano, na 400 `none`).
- Ověřeno snímky (`tools/snimky.mjs`, port 8773) proti `.reference/`: výšky všech 10 snímků se shodují. Úvod, V okolí a Kontakt jsou **0 px rozdílu** na obou šířkách. Fotky se liší jen v galerii (Task 5). Ceník má 993 px rozdílu: „Kč“ je posunuté doprava (viz Task 4). Otevřený panel na 400 px se od SSR liší 80 px, a to jen v obsahu Ceníku za ztmavením.
- `kontrola.py`: **11 chyb**, 175 odkazů. 5× `<nav>` vyřešeno. Zbývá 5× img bez alt (`top-image`, Task 4/6), 4× stejná description, galerie 0 fotek a chybí 404.

---

## Task 4: Stránky Úvod, Ceník, V okolí, Kontakt

Obsah je v SSR celý, jen kontrola a úklid:
- velké fotky `top-image` a `alt` („Chata v Pekle“ + co je na fotce, schválit spolu s Taskem 6),
- `transition appear … animated fadeIn` z Quasaru: SSR třídy `animated fadeIn` nevykreslí (0× v `/`, ověřeno 2026-10-13), efekt běžel jen po hydrataci. 1:1 se statickým HTML tedy znamená bez něj. Nic nedoplňovat.
- odkazy V okolí a Kontaktu: `target="_blank"` doplnit o `rel="noopener"`,
- `mailto:` a `tel:` beze změny,
- **Ceník: mezera před „Kč“.** `prettify()` z Tasku 2 vložil konec řádku mezi `12 500` a `<span class="kc">`. Pug má `.cena 12 500` a hned `span.kc &nbsp;Kč`, takže mezera přibyla navíc k `&nbsp;` (příčina upřesněna v „Provedeno“: `&nbsp;` zmizel) a „Kč“ je o pár px vpravo (993 px rozdílu proti `.reference/`, zjištěno v Tasku 3). Obě ceny zapsat na jeden řádek: `12 500<span class="kc" data-v-90ebed12="">&nbsp;Kč</span>`. Stejný jev hledat i u jiných inline prvků (snímky ukážou rozdíl).
- scoped styly stránek (`.text-block`, `.cena`, `.kc`, seznamy) jsou v chuncích → `komponenty.css`. Selektory nesou `[data-v-…]`, takže atributy `data-v-…` v markupu MUSÍ zůstat. Ověřit vzhled proti `.reference/`.

**Commit** „Stránky Úvod, Ceník, V okolí, Kontakt“.

**Provedeno 2026-10-13:**
- Ceník: obě ceny na jeden řádek s `&nbsp;Kč` podle Pugu. Příčina rozdílu byla jiná, než Task 3 odhadl: `prettify()` z `&nbsp;` udělal znak U+00A0 a ořezávání textu ho smazalo (Python `strip()` bere U+00A0 jako mezeru). Zbyla tak jen běžná mezera z konce řádku. Ta se zhroutila do mezery v kontextu `.cena`, tedy ve větším písmu než `.kc`, a proto bylo „Kč“ dál. Jiné `&nbsp;` v obsahu stránek nejsou (grep Vue zdrojů: jen Ceník, hlavička a patička, ty přepsal Task 3 i s `&nbsp;`).
- `rel="noopener"` u 15 odkazů `target="_blank"` (V okolí 11, Kontakt 4).
- `alt` u 5 velkých fotek. Jsou to NÁVRHY, schválit v Tasku 6 (otevřená otázka 2): Úvod „Chata v Pekle, dřevěná chata s balkonem v lese“, Ceník „Chata v Pekle, štít chaty s číslem 120 mezi buky“, Fotky „Chata v Pekle, chata s balkonem z boku“, V okolí „Zahrada chaty s grilem a výhledem na Jizerské hory“, Kontakt „Mapa okolí obce Peklo s polohou chaty“ (`chvp_foto05.jpg` je mapa, ne fotka).
- `fadeIn` nedoplněn (viz výše). `mailto:` a `tel:` beze změny.
- Snímky proti `.reference/`: Úvod, Ceník, V okolí a Kontakt **0 px rozdílu** na 1280 i 400 px. Fotky se liší jen v galerii (Task 5).
- `kontrola.py`: **6 chyb**, 175 odkazů: 4× stejná description (Task 6), galerie 0/20 (Task 5), chybí `404.html` (Task 6).

---

## Task 5: Fotogalerie a lightbox

**Soubory:** Vytvořit `tools/galerie_z_vue.py` podle Sunsetu, ale bez záložek:

```python
VUE = (KOREN.parent / "chatavpekle.cz-stare/src/pages/Public/fotky.vue").read_text(encoding="utf-8")
ZDROJ_FOTEK = KOREN.parent / "chatavpekle.cz-stare/src"
```

Jedno pole `poschodi`, výstup `<div class="js-gallery …">` s `<a href="../statics/galerie/X.jpg" class="gallery-item"><img src="…" alt="…" loading="lazy" class="gek-screenshots" data-v-…></a>` (atribut `data-v-…` převzít z SSR `fotky/index.html`, 2026-10-13 to byl `data-v-e940f3e8`, jinak nepojedou scoped styly `.gek-screenshots` z chunku). Fotky kopírovat ze `ZDROJ_FOTEK`. `alt` je ve zdroji prázdný: použít „Chata v Pekle, fotka N“ (nebo texty schválené uživatelem). Kontejner a odsazení (`flex items-center justify-center`, `margin-left:-20px`) převzít z SSR.

**Krok 1: Otevřená otázka 1** (duplicity): ~~zeptat se~~ rozhodnuto 2026-10-13: **18 fotek**, každá jen jednou (v pořadí prvního výskytu v poli `poschodi`, druhé výskyty `20220515_105402.jpg` a `20220515_105317.jpg` vynechat). `FOTEK_V_GALERII` v `tools/kontrola.py` změnit z 20 na 18.

**Krok 2:** Výstup skriptu vložit do `site/fotky/index.html` místo SSR mřížky. Kontrola: počet fotek sedí.

**Krok 3:** `web.js` ze Sunsetu: sekce „Fotky galerie se postupně objeví“, „Lightbox“ (včetně přeletu do detailu, listování, přednačítání) a „Zoom v detailu“. Odstranit vazby na záložky (`.js-tabs`), pokud by bez nich kód padal. `web.css`: sekce „Lightbox“, „Animace galerie“, „Detail“. Vše se vypíná při `prefers-reduced-motion`. Pozor na fotky jen 1662 px: zoom 4× bude na desktopu rozmazaný, to nevadí (chování 1:1 se Sunsetem).

**Krok 4:** Ověřit headless přes CDP (postup Sunset, „Úprava: animace menu a galerie“): otevření, listování šipkami, klávesami a swipem, smyčka přes začátek, zavření, pinch, dvojí ťuknutí, chyby konzole 0. Skripty `vt_test.mjs` a `zoom_test.mjs` v repu Sunsetu nejsou (byly jen ve scratchpadu), napsat znovu podle popisu.

**Krok 5: Commit** „Fotogalerie a lightbox“.

---

## Task 6: 404, favicon, robots, sitemap, titulky a popisy

- `site/404.html` s absolutními cestami (`/css/…`) jako u Sunsetu, protože Pages ji servíruje z libovolné hloubky. Na náhledu v podsložce bude bez stylů, to je známé a přijaté (Sunset).
- favicony z `statics/icons/` (převod je stáhne, ověřit kontrolou),
- `robots.txt` a `sitemap.xml` s `https://chatavpekle.cz/`, `…/cenik/`, `…/fotky/`, `…/okoli/`, `…/kontakt/`,
- **Otevřená otázka 2:** navrhnout `title` a `meta description` pro 5 stránek, nechat schválit a doplnit,
- `alt` u log (hlavička, patička) a zbývajících obrázků, až kontrola hlásí 0 chyb.

`python tools/kontrola.py` = `OK: 0 chyb, …`. Výsledek zapsat sem.

**Commit** „404, robots, sitemap, popisy stránek“.

---

## Task 7: Úklid markupu a README

- odstranit zbytky SSR, které bez Vue nic nedělají (prázdné `q-drawer` obaly, `aria-*` stavy Quasaru, které už neodpovídají), ale ne třídy, na které je navázané CSS,
- `README.md`: co je web, jak náhled (`python -m http.server -d site 8773`), jak kontrola, kde se upravují ceny (`site/cenik/index.html`), odkaz na tento plán,
- `site/` nesmí obsahovat soubory, na které nic neodkazuje (porovnat výpis souborů s odkazy z kontroly), kromě `robots.txt`, `sitemap.xml`, `404.html`, favicon a `google554520753bcc9e67.html` (ověřovací soubor Google Search Console, dodal uživatel 2026-10-13, obsah se nesmí měnit).

**Commit** „Úklid markupu, README“.

---

## Task 8: Vizuální porovnání se SSR

Porovnat 5 stránek na 1280 a 400 px se `.reference/`: statickou verzi nasnímkovat `node tools/snimky.mjs http://localhost:8773 <scratchpad>/po 9334` a měřit prvky přes CDP (`Runtime.evaluate` s `getBoundingClientRect`) na obou originech, skriptem `node tools/mereni.mjs <url> <sirka> <soubor s výrazem>` (vznikl v Tasku 3). Pixelový rozdíl snímků: PIL `ImageChops.difference` (systémový Python, venv PIL nemá). Iframe tu kvůli `fadeIn` nefunguje (Task 0, „Provedeno“, krok 8). Vyřešit přetok Ceníku na 400 px (tamtéž). Rozdíly opravit, nebo zapsat, proč zůstávají. Pak ukončit místní SSR (Task 0, krok 7).

**Commit** „Vizuální doladění podle SSR“.

---

## Task 9: Workflow pro GitHub Pages

`.github/workflows/pages.yml` zkopírovat ze Sunsetu beze změny (větev `master`, krok „Kontrola webu“, krok „Verze CSS a JS“ přidává `?v=<commit>` k `web.css` a `web.js`). Nová stránka musí mít odkazy končící přesně `web.css"` a `web.js"`, jinak je `sed` nechytí. Ověřit `yaml.safe_load`.

**Commit** „Workflow GitHub Pages“.

---

## Task 10: Nové repo na GitHubu (místo starého)

Auto režim blokuje mazání repa i zakládání veřejného repa. Tyto příkazy dát uživateli ke spuštění přes `!`, vždy na JEDEN řádek.

**Krok 1: Před smazáním starého repa** zjistit, co by zaniklo:

```
gh api repos/lukas-jarda-projects/chatavpekle.cz/hooks --jq 'length'
gh api repos/lukas-jarda-projects/chatavpekle.cz/keys --jq 'length'
gh issue list -R lukas-jarda-projects/chatavpekle.cz --state all --limit 5
gh pr list -R lukas-jarda-projects/chatavpekle.cz --state all --limit 5
```

Webhook Jenkinsu nebo deploy key zapsat (souvisí s otevřenou otázkou 3). Mirror z Tasku 0, krok 2 musí existovat.

**Krok 2: Kontrola obsahu nového repa před zveřejněním:**
- `git log --format='%an <%ae>' | sort -u` = jen `LukasWana <qwanap@gmail.com>` (globální `user.name` a `user.email`, ověřeno 2026-10-13),
- `git grep` vzory z `C:/work/archive/sunset-cisteni-historie/overeni.sh` = 0 nálezů,
- `python tools/kontrola.py` = OK.

**Krok 3 (uživatel přes `!`):**

```
gh repo delete lukas-jarda-projects/chatavpekle.cz --yes
```

```
gh repo create lukas-jarda-projects/chatavpekle.cz --public --source . --remote origin --push
```

Token `gh` má scope `delete_repo` (ponechán vědomě kvůli tomuto kroku, viz předávka Sunsetu).

**Krok 4:** Zapnout Pages z Actions a pustit workflow:

```
gh api -X POST repos/lukas-jarda-projects/chatavpekle.cz/pages -f build_type=workflow
gh workflow run pages.yml -R lukas-jarda-projects/chatavpekle.cz
```

Ověřit: běh prošel, `https://lukas-jarda-projects.github.io/chatavpekle.cz/` a 4 podstránky vrací 200, `/neexistuje` vlastní 404, interní odkazy bez chyby.

**Krok 5:** Uživatel ověří na telefonu menu, panel, galerii, swipe a pinch v detailu. Výsledek zapsat sem.

---

## Task 11: Ověření domény v organizaci

**Krok 1 (uživatel nebo přes Chrome na pokyn):** GitHub → organizace `lukas-jarda-projects` → Settings → Pages → **Add a domain** → `chatavpekle.cz`. GitHub vypíše TXT záznam `_github-pages-challenge-lukas-jarda-projects.chatavpekle.cz`.

**Krok 2:** U Websupportu (služba 2072776 → DNS) přidat TXT s TTL 300. Ověřit přímo u autoritativního serveru:

```
nslookup -type=TXT _github-pages-challenge-lukas-jarda-projects.chatavpekle.cz ns1.websupport.cz
```

Pak na GitHubu **Verify**. TXT musí v DNS zůstat. Past ze Sunsetu: wildcard `*` záznam by dotaz na TXT „zodpověděl“ apexem. Tady wildcard na `neco.chatavpekle.cz` 2026-10-13 nic nevrátil.

---

## Task 12: Převod domény (DNS u Websupportu)

Web teď neběží, takže převod nikomu nevypne funkční web a čas převodu nehraje roli.

**Krok 1:** V administraci vypsat všechny DNS záznamy a zapsat sem. **Otevřená otázka 4:** co jsou 2 další A záznamy. `www` je dnes A (ne CNAME), nahradí se CNAME.

**Krok 2: Nové záznamy** (IP ověřit v aktuální dokumentaci GitHubu „Managing a custom domain for your GitHub Pages site“, než se zadají):

| záznam | typ | hodnota |
|---|---|---|
| `@` | A | `185.199.108.153` |
| `@` | A | `185.199.109.153` |
| `@` | A | `185.199.110.153` |
| `@` | A | `185.199.111.153` |
| `@` | AAAA | `2606:50c0:8000::153` |
| `@` | AAAA | `2606:50c0:8001::153` |
| `@` | AAAA | `2606:50c0:8002::153` |
| `@` | AAAA | `2606:50c0:8003::153` |
| `www` | CNAME | `lukas-jarda-projects.github.io.` |

Starý A `88.146.221.173` (apex i `www`) smazat.

**Krok 3:** Custom domain na repu (s Actions workflow se soubor `CNAME` nepoužívá):

```
gh api -X PUT repos/lukas-jarda-projects/chatavpekle.cz/pages -f cname=chatavpekle.cz
```

**Krok 4:** Počkat na certifikát (obvykle minuty, nejvýš ~1 h), pak zapnout **Enforce HTTPS** (`-F https_enforced=true`).

**Krok 5: Ověření** (výsledky zapsat sem):

```
nslookup chatavpekle.cz 8.8.8.8                  # 4× 185.199.10x.153
curl -sI https://chatavpekle.cz/                 # 200, server: GitHub.com
curl -sI https://www.chatavpekle.cz/             # 301 na https://chatavpekle.cz/
curl -sI https://chatavpekle.cz/cenik            # 301 na /cenik/ (stará adresa bez lomítka)
curl -sI http://chatavpekle.cz/                  # 301 na https
curl -sI https://chatavpekle.cz/neexistuje       # 404 s vlastní stránkou
```

**Krok 6:** Pokud je doména v Google Search Console nebo Bing Webmaster (meta `google-site-verification` a `msvalidate.01` v hlavě to naznačují), odeslat `sitemap.xml`. Neověřeno, jestli ověření ještě platí.
- **Google Search Console, ověření souborem (zadal uživatel 2026-10-13):** soubor `site/google554520753bcc9e67.html` je v repu od commitu „Ověřovací soubor Google Search Console“ a po nasazení bude na `https://chatavpekle.cz/google554520753bcc9e67.html`. Před převodem DNS ho Google nenajde, protože doména míří na mrtvý server. Po kroku 5 ověřit `curl -s https://chatavpekle.cz/google554520753bcc9e67.html` (musí vrátit `google-site-verification: google554520753bcc9e67.html`) a teprve pak v Search Console kliknout na **Ověřit**.

---

## Task 13: Úklid

- **Otevřená otázka 3:** domluvit vypnutí starého serveru a jobu v Jenkinsu, pokud existují,
- po týdnu bez problémů smazat `C:/work/projects/chatavpekle.cz-stare` (včetně `.node16/`). Zálohy v `C:/work/archive/` ponechat,
- odebrat tokenu `gh` scope `delete_repo` (`gh auth refresh -h github.com -r delete_repo`), protože chatavpekle.cz byl poslední důvod ho mít,
- plán označit jako dokončený, do `Stav` hash posledního commitu a datum převodu.

---

## Předávka

```
Pokračuj v projektu C:\work\projects\chatavpekle.cz podle plánu docs/plans/2026-10-13-staticky-web-github-pages.md (převod Quasar SSR webu Chata v Pekle na statické HTML na GitHub Pages, stejně jako Sunset-apartment.com).
Skills: superpowers:executing-plans (plán má tasky s kontrolními body), superpowers:verification-before-completion (kontrola.py a snímky mají přesné očekávané výstupy).

Stav (2026-10-13): Tasky 0–4 hotové. Hlavička (desktop + mobilní panel, reveal), patička, site/js/web.js a site/css/web.css jsou hotové. Úvod, Ceník, V okolí a Kontakt jsou na snímcích shodné se SSR na pixel, Fotky se liší jen v galerii. tools/kontrola.py hlásí 6 chyb (rozpis v „Provedeno“ u Tasku 4). Referenční snímky SSR jsou v .reference/ (mimo git). Texty alt u velkých fotek jsou návrhy, schvalují se v Tasku 6.
Pokračuj Taskem 5 (galerie a lightbox). Otázka duplicit je rozhodnutá: 18 fotek, duplicity pryč, FOTEK_V_GALERII v tools/kontrola.py na 18 (Task 5, krok 1). Pak Task 6.
V site/ je od commitu dbbd192 ověřovací soubor Google Search Console google554520753bcc9e67.html (dodal uživatel). Obsah neměnit, nemazat při úklidu v Tasku 7. Ověřit ho v Search Console až po převodu DNS (Task 12, krok 6).

Před prací spusť na pozadí náhled: python -m http.server -d site 8773 (z kořene repa). Místní SSR není potřeba až do Tasku 8; spouští se z C:\work\projects\chatavpekle.cz-stare příkazem PORT=3124 ./.node16/node-v16.20.2-win-x64/node.exe dist/ssr/index.js. Stroj má málo paměti, harness už jednou procesy na pozadí ukončil, takže je po práci zastav.
Snímky: node tools/snimky.mjs http://localhost:8773 <scratchpad>/po 9334 (statická verze), pak pixelové porovnání s .reference/ přes PIL ImageChops (systémový Python). Měření prvků: node tools/mereni.mjs <url> <sirka> <soubor s JS výrazem>. Postup se <iframe> ze Sunsetu tu nefunguje kvůli fadeIn (Task 0, „Provedeno“, krok 8).

Pozor:
- Kód ze Sunsetu se kopíruje a upravuje podle tasků: v Tasku 5 lightbox a animace galerie do web.js a web.css (swipe() už v web.js je) a tools/galerie_z_vue.py, v Tasku 9 .github/workflows/pages.yml. Karusel, počítadla ani záložky galerie nepřebírat.
- Scoped CSS stránek a galerie je v site/css/komponenty.css se selektory [data-v-…]: atributy data-v v markupu musí zůstat.
- Ceník na 400 px přetéká na 472 px (vada originálu, je i v SSR). Řešit v Tasku 8.
- Auto režim blokuje mazání repa a zakládání veřejného repa: příkazy dát uživateli přes ! na JEDEN řádek (Task 10).
- Do plánu ani commitů nepiš interní hostitele a cesty Altisimy. Vzory: C:/work/archive/sunset-cisteni-historie/overeni.sh. Před commitem projít git grep --cached.
- Otevřené otázky pro uživatele jsou v sekci „Otevřené“ (duplicity v galerii, texty popisů, starý server, 2 další A záznamy).
```
