// Gera os "recortes" da tela 06: pedaços de papel com o texto literal de cada ato oficial
// (ementa + art. 1º), copiado do planalto.gov.br (materiais/dou/textos-atos.json).
// Atos oficiais não têm direito autoral (Lei 9.610/98, art. 8º, IV). Não imita o cabeçalho
// de nenhum jornal: é o texto do ato composto sobre papel, com a fonte citada no rodapé.
// uso: bun scripts/gerar-recortes.ts   (precisa do Playwright da skill reanimate ou do projeto)
import { chromium } from "C:/Users/User/.claude/skills/reanimate/scripts/node_modules/playwright";
import { mkdirSync, readFileSync } from "node:fs";

const textos = JSON.parse(readFileSync("materiais/dou/textos-atos.json", "utf8"));
const saida = "src/assets/apresentacao/recortes";
mkdirSync(saida, { recursive: true });

// chave → publicação (citação) e formato do recorte
const lista: { chave: string; pub: string; formato: "retrato" | "paisagem" | "quadrado" }[] = [
  { chave: "cruzado", pub: "DOU · 28.02.1986 · Seção 1 · p. 3085", formato: "retrato" },
  { chave: "cruzado2", pub: "DOU · 24.11.1986 · Seção 1", formato: "paisagem" },
  { chave: "bresser", pub: "DOU · 13.06.1987 · p. 9214", formato: "quadrado" },
  { chave: "constituicao", pub: "DOU nº 191-A · 05.10.1988", formato: "retrato" },
  { chave: "verao", pub: "DOU · 16.01.1989 · p. 845", formato: "paisagem" },
  { chave: "collor1", pub: "DOU · 16.03.1990 · Seção 1 · p. 5546", formato: "retrato" },
  { chave: "collor2", pub: "DOU · 01.02.1991 · Seção 1 · p. 2313", formato: "paisagem" },
  { chave: "cruzeiroreal", pub: "DOU · 29.07.1993 · Seção 1 · p. 10714", formato: "quadrado" },
  { chave: "real", pub: "DOU · 30.06.1994 · Edição Extra · p. 9761", formato: "retrato" },
  { chave: "kandir", pub: "DOU · 16.09.1996 · p. 18261", formato: "paisagem" },
  { chave: "cpmf", pub: "DOU · 25.10.1996 · p. 21877", formato: "quadrado" },
  { chave: "simples", pub: "DOU · 15.12.2006 · p. 1", formato: "retrato" },
  { chave: "esocial", pub: "DOU · 12.12.2014 · p. 4", formato: "paisagem" },
  { chave: "reforma", pub: "DOU · 21.12.2023 · Seção 1 · p. 1", formato: "quadrado" },
];
const larguras = { retrato: 560, paisagem: 860, quadrado: 660 } as const;

// gerador pseudoaleatório com semente (o mesmo recorte sai igual sempre)
function aleatorio(semente: number) {
  let s = semente;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}
// borda rasgada: polígono com dentes irregulares nos 4 lados
function rasgo(w: number, h: number, semente: number) {
  const r = aleatorio(semente);
  const pts: string[] = [];
  const lado = (x0: number, y0: number, x1: number, y1: number, nx: number, ny: number) => {
    const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 9);
    for (let i = 0; i < n; i++) {
      const t = i / n, a = (r() * 7 + (r() < 0.12 ? 6 : 0));
      pts.push(`${(x0 + (x1 - x0) * t + nx * a).toFixed(1)}px ${(y0 + (y1 - y0) * t + ny * a).toFixed(1)}px`);
    }
  };
  lado(0, 0, w, 0, 0, 1); lado(w, 0, w, h, -1, 0); lado(w, h, 0, h, 0, -1); lado(0, h, 0, 0, 1, 0);
  return `polygon(${pts.join(",")})`;
}
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 1.5 });
for (const [k, item] of lista.entries()) {
  const t = textos[item.chave];
  if (!t) throw new Error(`sem texto: ${item.chave}`);
  const w = larguras[item.formato];
  await p.setViewportSize({ width: w + 40, height: 1400 });
  const colunas = item.formato === "paisagem" ? 2 : 1;
  const tam = item.formato === "retrato" ? 21 : item.formato === "quadrado" ? 21 : 20;
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  html,body{margin:0;background:transparent}
  .papel{position:absolute;left:20px;top:20px;width:${w}px;padding-bottom:70px !important;
    background:
      radial-gradient(ellipse at ${20 + k * 7 % 60}% ${30 + k * 11 % 50}%, rgba(150,110,50,.18), transparent 55%),
      radial-gradient(ellipse at 80% 90%, rgba(120,80,30,.22), transparent 50%),
      linear-gradient(${170 + k * 13}deg, #efe6d1, #e4d7ba 70%, #d9c8a3);
    color:#211b12;font-family:"Times New Roman",Times,serif;box-sizing:border-box;padding:46px 50px 40px;overflow:hidden}
  .papel::before{content:"";position:absolute;inset:0;opacity:.5;mix-blend-mode:multiply;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='300'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.75' numOctaves='3' seed='${k}'/><feColorMatrix values='0 0 0 0 .45  0 0 0 0 .36  0 0 0 0 .22  0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
  .papel::after{content:"";position:absolute;left:0;right:0;top:${item.formato === "paisagem" ? 52 : 46}%;height:2px;background:linear-gradient(90deg,transparent,rgba(90,60,20,.22),rgba(255,255,255,.35),transparent)}
  .pub{font:600 12px/1 "Times New Roman",serif;letter-spacing:.24em;text-transform:uppercase;color:#5a4a33;border-bottom:1.5px solid #3a2f20;padding-bottom:10px;display:flex;justify-content:space-between}
  h1{font-size:${tam + 7}px;line-height:1.15;text-align:center;text-transform:uppercase;letter-spacing:.02em;margin:22px 0 14px;font-weight:700}
  .ementa{font-style:italic;font-size:${tam - 1}px;line-height:1.35;margin:0 0 18px ${colunas === 2 ? 40 : 28}%;text-align:justify}
  .corpo{font-size:${tam}px;line-height:1.42;text-align:justify;hyphens:auto;columns:${colunas};column-gap:34px}
  .corpo p{margin:0 0 10px;text-indent:2em}
  .fonte{position:absolute;left:50px;right:50px;bottom:22px;font:italic 11px/1.2 "Times New Roman",serif;color:#6b5a40;display:flex;justify-content:space-between}
  </style></head><body><div class="papel" lang="pt-BR">
    <div class="pub"><span>${esc(item.pub)}</span><span>Ato oficial</span></div>
    <h1>${esc(t.ato)}</h1>
    <p class="ementa">${esc(t.ementa)}</p>
    <div class="corpo"><p>${esc(t.artigo)}</p></div>
    <div class="fonte"><span>Texto oficial publicado no Diário Oficial da União</span><span>planalto.gov.br</span></div>
  </div></body></html>`;
  await p.setContent(html);
  const h = Math.ceil(await p.evaluate(() => document.querySelector(".papel")!.getBoundingClientRect().height));
  await p.evaluate((cp) => ((document.querySelector(".papel") as HTMLElement).style.clipPath = cp), rasgo(w, h, 97 + k * 31));
  await p.screenshot({ path: `${saida}/${item.chave}.png`, omitBackground: true, clip: { x: 20, y: 20, width: w, height: h } });
  console.log("ok", item.chave, item.formato);
}
await b.close();
