"""Vygeneruje HTML galerie z pole poschodi ve fotky.vue starého repa a zkopíruje fotky do site/.

Duplicity v poli se vynechají (rozhodnutí uživatele 2026-10-13: 18 fotek, každá jednou).
Spuštění:  python tools/galerie_z_vue.py > galerie.html   (výpis vložit do site/fotky/index.html)
"""
import re
import shutil
import sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # jinak Windows při přesměrování do souboru zapíše cp1250
KOREN = Path(__file__).resolve().parent.parent
VUE = (KOREN.parent / "chatavpekle.cz-stare/src/pages/Public/fotky.vue").read_text(encoding="utf-8")
ZDROJ_FOTEK = KOREN.parent / "chatavpekle.cz-stare/src"
V = 'data-v-e940f3e8=""'  # scoped styly .gek-screenshots z JidelnaGallery.vue (komponenty.css)

blok = re.search(r"poschodi: \[(.*?)\]", VUE, re.S).group(1)
fotky = list(dict.fromkeys(re.findall(r"src: '(statics/galerie/[^']+)'", blok)))

print(f'<div class="flex items-center justify-center js-gallery" {V} style="margin-left:-20px;">')
for n, src in enumerate(fotky, 1):
    cil = KOREN / "site" / src
    cil.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(ZDROJ_FOTEK / src, cil)
    print(f'  <a href="../{src}" class="gallery-item cursor-pointer" {V}>'
          f'<img src="../{src}" alt="Chata v Pekle, fotka {n}" loading="lazy" class="gek-screenshots" {V}></a>')
print("</div>")
print(f"<!-- celkem {len(fotky)} fotek -->")
