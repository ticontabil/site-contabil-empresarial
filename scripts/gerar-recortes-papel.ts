// Recortes da tela 06 (Nossa história) a partir dos papéis rasgados enviados pela Contábil (materiais/recortes-papel).
// Cada marco recebe um papel (reaproveitados de cabeça para baixo e com giro diferente; nunca espelhado, para o texto não sair ao contrário) e uma etiqueta com data, nome e ato.
// uso: bun scripts/gerar-recortes-papel.ts
import { chromium } from "C:/Users/User/.claude/skills/reanimate/scripts/node_modules/playwright";
import { readFileSync, mkdirSync } from "node:fs";

const pasta = "materiais/recortes-papel";
const saida = "src/assets/apresentacao/recortes";
mkdirSync(saida, { recursive: true });
// fonte da apresentação (Montserrat) embutida na página de composição
const fonte = readFileSync("node_modules/@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2").toString("base64");
const papel = (n: number) => `data:image/png;base64,${readFileSync(`${pasta}/papel-${n}.png`).toString("base64")}`;

// papel 29 ("LOVE") fica de fora; 30 ("CHANGE") entra duas vezes
const marcos: { chave: string; data: string; titulo: string; ato: string; papel: number; espelho: boolean; giro: number; pos: "baixo" | "meio" | "alto" }[] = [
  { chave: "cruzado", data: "28.02.1986", titulo: "PLANO CRUZADO", ato: "Decreto-Lei nº 2.283", papel: 25, espelho: false, giro: -4, pos: "baixo" },
  { chave: "cruzado2", data: "21.11.1986", titulo: "CRUZADO II", ato: "Decretos-Leis nº 2.290 e 2.303", papel: 31, espelho: false, giro: 3, pos: "meio" },
  { chave: "bresser", data: "12.06.1987", titulo: "PLANO BRESSER", ato: "Decreto-Lei nº 2.335", papel: 27, espelho: false, giro: -2, pos: "baixo" },
  { chave: "constituicao", data: "05.10.1988", titulo: "CONSTITUIÇÃO FEDERAL", ato: "O ICM vira ICMS", papel: 28, espelho: false, giro: 3, pos: "meio" },
  { chave: "verao", data: "16.01.1989", titulo: "PLANO VERÃO", ato: "Medida Provisória nº 32", papel: 26, espelho: false, giro: -3, pos: "meio" },
  { chave: "collor1", data: "16.03.1990", titulo: "PLANO COLLOR I", ato: "Medida Provisória nº 168", papel: 30, espelho: false, giro: 2, pos: "baixo" },
  { chave: "collor2", data: "31.01.1991", titulo: "PLANO COLLOR II", ato: "Medida Provisória nº 294", papel: 25, espelho: true, giro: 4, pos: "meio" },
  { chave: "cruzeiroreal", data: "01.08.1993", titulo: "CRUZEIRO REAL", ato: "Medida Provisória nº 336", papel: 31, espelho: true, giro: -3, pos: "meio" },
  { chave: "real", data: "01.07.1994", titulo: "PLANO REAL", ato: "Medida Provisória nº 542", papel: 30, espelho: true, giro: -2, pos: "baixo" },
  { chave: "kandir", data: "1996", titulo: "LEI KANDIR E SIMPLES", ato: "LC nº 87 · Lei nº 9.317", papel: 27, espelho: true, giro: 3, pos: "baixo" },
  { chave: "cpmf", data: "1997–2007", titulo: "CPMF", ato: "Lei nº 9.311", papel: 26, espelho: true, giro: 2, pos: "meio" },
  { chave: "simples", data: "2006–2007", titulo: "SIMPLES NACIONAL E SPED", ato: "LC nº 123 · Decreto nº 6.022", papel: 28, espelho: true, giro: -3, pos: "meio" },
  { chave: "esocial", data: "2018", titulo: "eSocial", ato: "Decreto nº 8.373", papel: 31, espelho: false, giro: -5, pos: "meio" },
  { chave: "reforma", data: "2023 / 2025", titulo: "REFORMA TRIBUTÁRIA", ato: "EC nº 132 · LC nº 214", papel: 25, espelho: false, giro: 2, pos: "meio" },
];
const tamanhos: Record<number, [number, number]> = { 25: [1156, 1637], 26: [1204, 845], 27: [1693, 1016], 28: [1040, 1853], 30: [1146, 1608], 31: [1598, 1106] };

const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 1 });
for (const m of marcos) {
  const [W0, H0] = tamanhos[m.papel];
  const k = 1000 / Math.max(W0, H0); // maior lado = 1000 px
  const W = Math.round(W0 * k), H = Math.round(H0 * k);
  const top = m.pos === "baixo" ? "62%" : m.pos === "alto" ? "18%" : "40%";
  await p.setViewportSize({ width: W + 240, height: H + 240 });
  await p.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
    @font-face { font-family: M; src: url(data:font/woff2;base64,${fonte}) format("woff2"); font-weight: 100 900; }
    html,body { margin:0; background:transparent; }
    .peca { position:absolute; left:120px; top:120px; width:${W}px; height:${H}px; transform: rotate(${m.giro}deg); }
    .peca img { width:100%; height:100%; display:block; ${m.espelho ? "transform: rotate(180deg);" : ""} filter: drop-shadow(0 10px 18px rgba(0,0,0,.35)); }
    .etiqueta { position:absolute; left:7%; right:7%; top:${top}; transform: rotate(${-m.giro * 0.6 - 1.5}deg);
      background:#111; color:#fff; font-family:M, sans-serif; padding:18px 26px 20px; box-shadow: 0 8px 22px rgba(0,0,0,.45); }
    .etiqueta::before { content:""; position:absolute; left:-14px; top:50%; width:46px; height:22px; margin-top:-11px; background:rgba(240,232,210,.82); transform: rotate(-38deg); }
    .etiqueta::after { content:""; position:absolute; right:-14px; top:50%; width:46px; height:22px; margin-top:-11px; background:rgba(240,232,210,.82); transform: rotate(-38deg); }
    .data { font-weight:700; font-size:${Math.round(W * 0.05)}px; letter-spacing:.06em; color:#fb5d02; }
    .titulo { font-weight:700; font-size:${Math.round(W * 0.085)}px; letter-spacing:-.02em; line-height:1.02; margin-top:6px; }
    .ato { font-weight:500; font-size:${Math.round(W * 0.038)}px; color:#c7c7c7; margin-top:8px; letter-spacing:.02em; }
  </style></head><body><div class="peca"><img src="${papel(m.papel)}"><div class="etiqueta">
    <div class="data">(${m.data})</div><div class="titulo">${m.titulo}</div><div class="ato">${m.ato}</div></div></div></body></html>`);
  await p.waitForTimeout(150);
  await p.screenshot({ path: `${saida}/${m.chave}.png`, omitBackground: true });
  console.log("ok", m.chave);
}
await b.close();
