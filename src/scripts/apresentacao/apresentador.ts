// Modo apresentador: espelha a apresentação (BroadcastChannel), mostra a tela atual,
// o próximo passo, a Fala e o cronômetro. Também controla a apresentação pelo teclado.

import { lerOcultas, CHAVE_TELAS } from "./escolha.ts";

type Info = { chave: string; numero: number; titulo: string; passos: number; fala: string; ato: string };
// mesmas telas que a apresentação mostra (as desligadas na configuração saem daqui também)
const todas: Info[] = JSON.parse(document.getElementById("ap-dados")!.textContent || "[]");
const ocultas = lerOcultas();
const lista = todas.some((t) => !ocultas.has(t.chave)) ? todas.filter((t) => !ocultas.has(t.chave)) : todas;
addEventListener("storage", (e) => e.key === CHAVE_TELAS && location.reload());
const total = lista.length;
const pad = (n: number) => String(n).padStart(2, "0");
const q = new URLSearchParams(location.search);
const extra = q.get("rascunho") === "1" ? "&rascunho=1" : "";

const atual = document.getElementById("ap-atual") as HTMLIFrameElement;
const proxima = document.getElementById("ap-proxima") as HTMLIFrameElement;
atual.src = `/apresentacao?embed=1${extra}`;
proxima.src = `/apresentacao?embed=1${extra}`;

let tela = 0, passo = 0;

const seguinte = (t: number, p: number): [number, number] | null =>
  p < lista[t].passos ? [t, p + 1] : t < total - 1 ? [t + 1, 0] : null;
const anterior = (t: number, p: number): [number, number] | null =>
  p > 0 ? [t, p - 1] : t > 0 ? [t - 1, lista[t - 1].passos] : null;

function escapar(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
}

function mostrar() {
  const info = lista[tela];
  document.getElementById("ap-posicao")!.textContent = `${info.ato} ${pad(tela + 1)} / ${pad(total)} · passo ${passo} de ${info.passos}`;
  document.getElementById("ap-titulo")!.textContent = info.titulo;
  document.getElementById("ap-fala")!.innerHTML = escapar(info.fala).replace(/\[[^\]]+\]/g, (m) => `<span class="ph">${m}</span>`);
  const prox = seguinte(tela, passo);
  document.getElementById("ap-prox-rotulo")!.textContent = prox
    ? prox[0] === tela ? `mesma tela, passo ${prox[1]}` : `tela ${pad(prox[0] + 1)} · ${lista[prox[0]].titulo.slice(0, 48)}`
    : "fim";
  atual.contentWindow?.postMessage({ tipo: "ir", tela, passo }, location.origin);
  if (prox) proxima.contentWindow?.postMessage({ tipo: "ir", tela: prox[0], passo: prox[1] }, location.origin);
}
[atual, proxima].forEach((f) => f.addEventListener("load", () => setTimeout(mostrar, 300)));

const canal = new BroadcastChannel("contabil-apresentacao");
let conectado = false;
canal.addEventListener("message", (e) => {
  if (e.data?.tipo === "telas") location.reload();
  if (e.data?.tipo === "estado") {
    tela = e.data.tela; passo = e.data.passo;
    if (!conectado) {
      conectado = true;
      document.getElementById("ap-conexao")!.textContent = "Conectado à apresentação.";
    }
    iniciarCrono();
    mostrar();
  }
});
canal.postMessage({ tipo: "pedir" });

function ir(pos: [number, number] | null) {
  if (!pos) return;
  [tela, passo] = pos;
  canal.postMessage({ tipo: "ir", tela, passo });
  iniciarCrono();
  mostrar();
}

addEventListener("keydown", (e) => {
  const k = e.key;
  if (["ArrowRight", "ArrowDown", " ", "PageDown", "Enter"].includes(k)) ir(seguinte(tela, passo));
  else if (["ArrowLeft", "ArrowUp", "PageUp"].includes(k)) ir(anterior(tela, passo));
  else if (k === "Home") ir([0, 0]);
  else if (k === "End") ir([total - 1, 0]);
  else return;
  e.preventDefault();
});
document.getElementById("ap-avancar")!.addEventListener("click", () => ir(seguinte(tela, passo)));
document.getElementById("ap-voltar")!.addEventListener("click", () => ir(anterior(tela, passo)));

// ---------------- Cronômetro e hora ----------------
let inicio = 0, acumulado = 0, rodando = false;
const botaoPausar = document.getElementById("ap-pausar")!;
function iniciarCrono() {
  if (rodando || acumulado > 0) return;
  rodando = true; inicio = Date.now();
  botaoPausar.textContent = "Pausar";
}
botaoPausar.addEventListener("click", () => {
  if (rodando) { acumulado += Date.now() - inicio; rodando = false; botaoPausar.textContent = "Continuar"; }
  else { rodando = true; inicio = Date.now(); botaoPausar.textContent = "Pausar"; }
});
document.getElementById("ap-zerar")!.addEventListener("click", () => {
  acumulado = 0; inicio = Date.now();
  if (!rodando) botaoPausar.textContent = "Iniciar cronômetro";
});
setInterval(() => {
  const ms = acumulado + (rodando ? Date.now() - inicio : 0);
  const s = Math.floor(ms / 1000);
  document.getElementById("ap-crono")!.textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
  const d = new Date();
  document.getElementById("ap-hora")!.textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}, 500);
mostrar();
