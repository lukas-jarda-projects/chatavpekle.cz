// Snímky 5 stránek na 1280 a 400 px přes CDP (Node 24 kvůli vestavěnému WebSocket).
// Šířka přes Emulation (headless okno užší než ~500 px neumí), celá stránka přes captureBeyondViewport
// při výšce okna 800 px (q-page má min-height podle okna). Každý běh má čerstvý profil Chrome.
// Reference ze SSR: node tools/snimky.mjs
// Statická verze:   node tools/snimky.mjs http://localhost:8773 <scratchpad>/po 9334
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const ZDROJ = process.argv[2] || "http://localhost:3124";
const CIL = process.argv[3] || "C:/work/projects/chatavpekle.cz/.reference";
const PORT = Number(process.argv[4] || 9333);
const SCRATCH = dirname(fileURLToPath(import.meta.url));
const STRANKY = { index: "/", cenik: "/cenik", fotky: "/fotky", okoli: "/okoli", kontakt: "/kontakt" };
const SIRKY = [1280, 400];
const VYSKA_OKNA = 800;
const CEKANI_MS = 4000;

mkdirSync(CIL, { recursive: true });
const profil = mkdtempSync(join(SCRATCH, "cdp-"));
const chrome = spawn(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
const spi = (ms) => new Promise((r) => setTimeout(r, ms));

let ws;
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const t = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    ws = t.find((x) => x.type === "page").webSocketDebuggerUrl;
  } catch { await spi(200); }
}
const sock = new WebSocket(ws);
await new Promise((r) => sock.addEventListener("open", r));
let id = 0;
const cekajici = new Map();
sock.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && cekajici.has(m.id)) { cekajici.get(m.id)(m); cekajici.delete(m.id); }
});
const cdp = (method, params = {}) => new Promise((r) => {
  const n = ++id; cekajici.set(n, r); sock.send(JSON.stringify({ id: n, method, params }));
});

try {
  for (const sirka of SIRKY) {
    await cdp("Emulation.setDeviceMetricsOverride", { width: sirka, height: VYSKA_OKNA, deviceScaleFactor: 1, mobile: false });
    for (const [jmeno, cesta] of Object.entries(STRANKY)) {
      await cdp("Network.setCacheDisabled", { cacheDisabled: true });
      await cdp("Page.navigate", { url: ZDROJ + cesta });
      await spi(CEKANI_MS);
      const r = await cdp("Runtime.evaluate", { expression: "[document.documentElement.scrollWidth, document.documentElement.scrollHeight, innerWidth]", returnByValue: true });
      const [w, h, iw] = r.result.result.value;
      const s = await cdp("Page.captureScreenshot", { format: "png", captureBeyondViewport: true, clip: { x: 0, y: 0, width: sirka, height: h, scale: 1 } });
      const soubor = join(CIL, `${jmeno}-${sirka}.png`);
      writeFileSync(soubor, Buffer.from(s.result.data, "base64"));
      console.log(`snimek ${soubor} innerWidth=${iw} scrollWidth=${w} vyska=${h}`);
    }
  }
} finally {
  sock.close();
  chrome.kill();
}
