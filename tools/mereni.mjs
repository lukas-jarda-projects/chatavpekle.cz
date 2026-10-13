// Měření prvků přes CDP (Node 24): stránka v okně <sirka> × 800 px, po 4 s vyhodnotí JS výraz ze souboru
// (smí vracet Promise) a vypíše výsledek jako JSON; s 5. argumentem uloží i snímek okna.
// node tools/mereni.mjs <url> <sirka> <soubor s výrazem> [port] [snimek.png]
// Příklad výrazu: [document.querySelector(".top-image").getBoundingClientRect().y]
// Každý běh má čerstvý profil Chrome v TEMP, po běhu se smaže.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const [URL_, SIRKA, VYRAZ, PORT_ = "9335"] = process.argv.slice(2);
const PORT = Number(PORT_);
const profil = mkdtempSync(join(tmpdir(), "chatavpekle-mereni-"));
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", ["--headless=new", "--disable-gpu", "--hide-scrollbars",
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${profil}`, "about:blank"], { stdio: "ignore" });
const spi = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 50 && !ws; i++) {
  try { ws = (await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()).find((x) => x.type === "page").webSocketDebuggerUrl; }
  catch { await spi(200); }
}
const sock = new WebSocket(ws);
await new Promise((r) => sock.addEventListener("open", r));
let id = 0; const cek = new Map();
sock.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && cek.has(m.id)) { cek.get(m.id)(m); cek.delete(m.id); } });
const cdp = (method, params = {}) => new Promise((r) => { const n = ++id; cek.set(n, r); sock.send(JSON.stringify({ id: n, method, params })); });
try {
  await cdp("Emulation.setDeviceMetricsOverride", { width: Number(SIRKA), height: 800, deviceScaleFactor: 1, mobile: false });
  await cdp("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp("Page.navigate", { url: URL_ });
  await spi(4000);
  const r = await cdp("Runtime.evaluate", { expression: readFileSync(VYRAZ, "utf8"), returnByValue: true, awaitPromise: true });
  console.log(JSON.stringify(r.result.result.value ?? r.result, null, 1));
  if (process.argv[6]) {
    await spi(800);
    const s = await cdp("Page.captureScreenshot", { format: "png" });
    writeFileSync(process.argv[6], Buffer.from(s.result.data, "base64"));
  }
} finally {
  sock.close();
  if (chrome.exitCode === null) { const k = new Promise((r) => chrome.once("exit", r)); chrome.kill(); await k; }
  rmSync(profil, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
}
