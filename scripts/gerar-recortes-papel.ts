// Recortes da tela 06 (Nossa história) a partir dos papéis rasgados enviados pela Contábil (materiais/recortes-papel).
// O miolo de cada papel recebe uma página de jornal de época composta aqui: editoria, data, manchete, linha fina
// e colunas com o texto literal do ato oficial (materiais/dou/textos-atos.json; atos oficiais não têm direito
// autoral, Lei 9.610/98, art. 8º, IV). É ilustração: não tem nome, cabeçalho nem diagramação de nenhum
// jornal real, e as manchetes só dizem o que o próprio ato diz. A borda rasgada original fica à mostra.
// Também grava as versões já desfocadas (-b1, -b2), usadas pela animação no lugar de filtros em tempo real.
// uso: bun scripts/gerar-recortes-papel.ts
import { chromium } from "C:/Users/User/.claude/skills/reanimate/scripts/node_modules/playwright";
import { readFileSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";

const pasta = "materiais/recortes-papel";
const saida = "src/assets/apresentacao/recortes";
const tmp = join(tmpdir(), "recortes-papel");
mkdirSync(saida, { recursive: true });
mkdirSync(tmp, { recursive: true });
const textos = JSON.parse(readFileSync("materiais/dou/textos-atos.json", "utf8"));
const png = (arq: string) => `data:image/png;base64,${readFileSync(arq).toString("base64")}`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const util = (...a: string[]) => execFileSync("python", ["scripts/recortes-papel-util.py", ...a], { encoding: "utf8" }).trim();

type Marco = {
  chave: string; papel: number; espelho: boolean; giro: number;
  editoria: string; data: string; manchete: string; fina: string;
  /** onde começa o bloco (fração da altura) e largura do texto (fração da largura) */
  topo?: number; esq?: number; larg?: number; h?: number;
};
// data = dia em que o ato saiu no Diário Oficial (a "edição" do recorte)
const marcos: Marco[] = [
  { chave: "cruzado", papel: 25, espelho: false, giro: -4, editoria: "Economia", data: "1986-02-28", manchete: "Governo cria o cruzado e congela os preços", fina: "Nova moeda vale mil cruzeiros; decreto-lei também institui o seguro-desemprego", topo: 0.15, esq: 0.07, larg: 0.6, h: 0.85 },
  { chave: "cruzado2", papel: 31, espelho: false, giro: 3, editoria: "Economia", data: "1986-11-24", manchete: "Cruzado II muda as regras do plano", fina: "Decretos-leis tratam da desindexação da economia e da legislação tributária" },
  { chave: "bresser", papel: 27, espelho: false, giro: -2, editoria: "Economia", data: "1987-06-13", manchete: "Preços e salários congelados por 90 dias", fina: "Decreto-lei cria a Unidade de Referência de Preços, a URP" },
  { chave: "constituicao", papel: 28, espelho: false, giro: 3, editoria: "Política", data: "1988-10-05", manchete: "Promulgada a nova Constituição", fina: "Texto cria o ICMS no lugar do ICM e redesenha o sistema tributário", esq: 0.08, larg: 0.76, h: 0.9 },
  { chave: "verao", papel: 26, espelho: false, giro: -3, editoria: "Economia", data: "1989-01-16", manchete: "Plano Verão cria o cruzado novo", fina: "Medida provisória congela preços e estabelece regras de desindexação" },
  { chave: "collor1", papel: 30, espelho: false, giro: 2, editoria: "Economia", data: "1990-03-16", manchete: "Cruzeiro volta a ser a moeda nacional", fina: "Medida provisória também dispõe sobre a liquidez dos ativos financeiros" },
  { chave: "collor2", papel: 25, espelho: true, giro: 4, editoria: "Economia", data: "1991-02-01", manchete: "Collor II cria a TR e desindexa a economia", fina: "Banco Central passa a divulgar a Taxa Referencial", topo: 0.36, esq: 0.2, larg: 0.62, h: 0.85 },
  { chave: "cruzeiroreal", papel: 31, espelho: true, giro: -3, editoria: "Economia", data: "1993-07-29", manchete: "Moeda passa a se chamar cruzeiro real", fina: "Medida provisória corta três zeros do cruzeiro" },
  { chave: "real", papel: 30, espelho: true, giro: -2, editoria: "Economia", data: "1994-06-30", manchete: "Real começa a circular amanhã", fina: "Medida provisória define as regras de emissão da nova moeda" },
  { chave: "kandir", papel: 27, espelho: true, giro: 3, editoria: "Tributos", data: "1996-09-16", manchete: "Lei Kandir muda as regras do ICMS", fina: "Lei complementar define normas gerais do imposto estadual", topo: 0.13, esq: 0.15, larg: 0.75 },
  { chave: "cpmf", papel: 26, espelho: true, giro: 2, editoria: "Tributos", data: "1996-10-25", manchete: "Lei cria a CPMF", fina: "Contribuição incide sobre a movimentação financeira" },
  { chave: "simples", papel: 28, espelho: true, giro: -3, editoria: "Empresas", data: "2006-12-15", manchete: "Lei cria o Simples Nacional", fina: "Estatuto dá tratamento diferenciado à microempresa e à empresa de pequeno porte" },
  { chave: "esocial", papel: 31, espelho: false, giro: -5, editoria: "Trabalho", data: "2014-12-12", manchete: "Decreto institui o eSocial", fina: "Obrigações fiscais, previdenciárias e trabalhistas vão para o meio digital" },
  { chave: "reforma", papel: 25, espelho: false, giro: 2, editoria: "Tributos", data: "2023-12-21", manchete: "Congresso promulga a Reforma Tributária", fina: "Emenda constitucional altera o Sistema Tributário Nacional", topo: 0.15, esq: 0.12, larg: 0.6, h: 0.9 },
];
const tamanhos: Record<number, [number, number]> = { 25: [1156, 1637], 26: [1204, 845], 27: [1693, 1016], 28: [1040, 1853], 30: [1146, 1608], 31: [1598, 1106] };
const M = 200; // margem transparente em volta (cabe o desfoque das versões -b1/-b2 sem cortar)

const dataExtensa = (iso: string) => {
  const s = new Date(`${iso}T12:00:00Z`).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
// papel mais amarelado quanto mais antigo
const idade = (iso: string) => Math.max(0, Math.min(1, (2024 - Number(iso.slice(0, 4))) / 38));

const b = await chromium.launch();
const p = await b.newPage({ deviceScaleFactor: 1 });
for (const m of marcos) {
  const [W0, H0] = tamanhos[m.papel];
  const k = 1000 / Math.max(W0, H0); // maior lado = 1000 px
  const [Wb, Hb] = m.espelho ? [W0, H0] : [W0, H0];
  const W = Math.round(Wb * k), H = Math.round(Hb * k);
  const pref = join(tmp, m.chave);
  const cor = util("prep", `${pasta}/papel-${m.papel}.png`, m.espelho ? "1" : "0", String(W), String(H), pref);
  const t = textos[m.chave];
  const corpo = `<b>BRASÍLIA</b> — O Diário Oficial da União publica ${m.chave === "constituicao" ? "hoje a" : "o"} ${esc(t.ato)}, que ${esc(t.ementa.charAt(0).toLowerCase() + t.ementa.slice(1).replace(/\.$/, ""))}. Diz o texto: “${esc(t.artigo)}”`;
  const paisagem = W > H * 1.15;
  const u = Math.min(W, H * 1.25); // unidade de tamanho do texto
  const amarelo = idade(m.data);
  const topo = m.topo ?? (paisagem ? 0.12 : 0.2), esq = m.esq ?? 0.1, larg = m.larg ?? 0.8;
  await p.setViewportSize({ width: W + 2 * M, height: H + 2 * M });
  await p.setContent(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Libre+Caslon+Text:ital,wght@0,400;0,700;1,400&family=Oswald:wght@500&display=block" rel="stylesheet">
  <style>
    html,body{margin:0;background:transparent}
    .peca{position:absolute;left:${M}px;top:${M}px;width:${W}px;height:${H}px;transform:rotate(${m.giro}deg)}
    .peca>*,.miolo>*{position:absolute;inset:0}
    .papel{background:url(${png(pref + "-papel.png")}) 0 0/100% 100%;filter:drop-shadow(0 12px 20px rgba(0,0,0,.38))}
    .miolo{-webkit-mask:url(${png(pref + "-mascara.png")}) 0 0/100% 100%;mask:url(${png(pref + "-mascara.png")}) 0 0/100% 100%}
    .fundo{background:
      radial-gradient(ellipse at 22% 30%, rgba(150,110,50,${(0.08 + amarelo * 0.14).toFixed(2)}), transparent 60%),
      radial-gradient(ellipse at 80% 85%, rgba(120,80,30,${(0.06 + amarelo * 0.16).toFixed(2)}), transparent 55%),
      ${cor}}
    .fundo::before{content:"";position:absolute;inset:0;opacity:.55;mix-blend-mode:multiply;background-image:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='260' height='260'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' seed='${m.papel}'/><feColorMatrix values='0 0 0 0 .42  0 0 0 0 .34  0 0 0 0 .22  0 0 0 .5 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")}
    .dobra{background:linear-gradient(${paisagem ? 90 : 0}deg,transparent 47%,rgba(90,60,20,.14) 49.6%,rgba(255,255,255,.22) 50.4%,transparent 53%)}
    .texto{color:#1f1a14;mix-blend-mode:multiply;filter:blur(.35px)}
    .bloco{position:absolute;left:${(esq * 100).toFixed(1)}%;width:${(larg * 100).toFixed(1)}%;top:${(topo * 100).toFixed(1)}%;font-family:"Libre Caslon Text",Georgia,serif}
    .cab{display:flex;justify-content:space-between;align-items:baseline;border-top:${Math.max(2, u * 0.004)}px solid;border-bottom:1px solid;padding:${u * 0.008}px 0;font:500 ${u * 0.026}px/1 Oswald,"Arial Narrow",sans-serif;letter-spacing:.14em;text-transform:uppercase}
    .cab i{font:italic 400 ${u * 0.024}px/1 "Libre Caslon Text",Georgia,serif;letter-spacing:0;text-transform:none}
    h1{font-weight:700;font-size:${u * 0.085 * (m.h ?? 1)}px;line-height:1.02;letter-spacing:-.015em;margin:${u * 0.03}px 0 ${u * 0.018}px}
    .fina{font-style:italic;font-size:${u * 0.034}px;line-height:1.25;margin:0 0 ${u * 0.022}px;padding-bottom:${u * 0.018}px;border-bottom:1px solid}
    .col{columns:${paisagem ? 3 : 2};column-gap:${u * 0.03}px;column-rule:1px solid rgba(31,26,20,.5);font-size:${u * 0.024}px;line-height:1.38;text-align:justify;hyphens:auto}
    .col b{font-weight:700}
  </style></head><body><div class="peca">
    <div class="papel"></div>
    <div class="miolo"><div class="fundo"></div><div class="dobra"></div>
      <div class="texto"><div class="bloco">
        <div class="cab"><span>${m.editoria}</span><i>${dataExtensa(m.data)}</i></div>
        <h1>${esc(m.manchete)}</h1>
        <p class="fina">${esc(m.fina)}</p>
        <div class="col">${corpo}</div>
      </div></div>
    </div>
  </div></body></html>`, { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  const fontes = await p.evaluate(() => document.fonts.check('700 40px "Libre Caslon Text"'));
  if (!fontes) console.warn("aviso: fonte Libre Caslon não carregou (usando Georgia)");
  await p.waitForTimeout(150);
  const arq = `${saida}/${m.chave}.png`;
  await p.screenshot({ path: arq, omitBackground: true });
  util("desfoque", arq, `${saida}/${m.chave}`);
  console.log("ok", m.chave);
}
await b.close();
rmSync(tmp, { recursive: true, force: true });
