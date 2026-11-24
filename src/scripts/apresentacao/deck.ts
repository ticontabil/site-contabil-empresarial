// Motor da apresentação: palco 16:9, telas e passos, teclado/passador, rolagem, toque,
// atalhos, link direto (#06), barra de progresso, sincronização com o modo apresentador,
// versão em pé, impressão e cache para uso sem internet.
import { iniciarEfeitos } from "./efeitos.ts";
import { lerOcultas, CHAVE_TELAS } from "./escolha.ts";

const html = document.documentElement;
const q = new URLSearchParams(location.search);

if (q.get("modo") === "apresentador") {
  location.replace(`/apresentacao/apresentador${q.get("rascunho") === "1" ? "?rascunho=1" : ""}${location.hash}`);
}

const palco = document.getElementById("palco") as HTMLElement;
// Telas que o Pedro desligou na configuração saem antes de tudo (numeração, progresso e PDF se ajustam).
// Se ele desligou todas por engano, mostra todas.
{
  const ocultas = lerOcultas();
  const todas = [...document.querySelectorAll<HTMLElement>("#palco > .tela")];
  if (todas.some((t) => !ocultas.has(t.dataset.chave || ""))) todas.forEach((t) => ocultas.has(t.dataset.chave || "") && t.remove());
}
const telas = [...document.querySelectorAll<HTMLElement>("#palco > .tela")];
const passos = telas.map((t) => Number(t.dataset.passos) || 0);
const total = telas.length;
const contador = document.getElementById("contador")!;
const preenchido = document.querySelector<HTMLElement>("#progresso .preenchido")!;
const anuncio = document.getElementById("anuncio")!;
const irPara = document.getElementById("ir-para")!;
const embutido = html.classList.contains("embutido");
const pad = (n: number) => String(n).padStart(2, "0");

let tela = 0;
let passo = 0;

// ---------------- Palco ----------------
function escalar() {
  if (html.classList.contains("estatico")) {
    const z = html.classList.contains("imprimir") ? Math.min(1, innerWidth / 1920) : innerWidth / 1920;
    html.style.setProperty("--zoom-estatico", String(z));
    return;
  }
  // Responsivo: a altura do palco é sempre 1080; a largura acompanha a proporção da tela
  // (iPad 4:3 ≈ 1440, notebook 16:10 = 1728, TV 16:9 = 1920, monitor largo até 2560).
  // Assim o conteúdo ocupa a tela inteira em vez de ganhar faixas pretas.
  const largura = Math.round(Math.min(2560, Math.max(1440, (1080 * innerWidth) / innerHeight)));
  palco.style.width = `${largura}px`;
  html.classList.toggle("palco-estreito", largura < 1700);
  palco.style.setProperty("--escala", String(Math.min(innerWidth / largura, innerHeight / 1080)));
}
addEventListener("resize", escalar);
escalar();

// ---------------- Sincronização (modo apresentador) ----------------
const canal = !embutido && "BroadcastChannel" in window ? new BroadcastChannel("contabil-apresentacao") : null;
canal?.addEventListener("message", (e) => {
  const m = e.data;
  if (m?.tipo === "ir") ir(m.tela, m.passo, true);
  if (m?.tipo === "pedir") canal.postMessage({ tipo: "estado", tela, passo });
  // o Pedro mudou as telas na configuração: recarrega já com a nova seleção
  if (m?.tipo === "telas") location.reload();
});
addEventListener("storage", (e) => e.key === CHAVE_TELAS && location.reload());
// iframes do modo apresentador recebem a posição por postMessage
if (embutido) {
  addEventListener("message", (e) => {
    if (e.origin !== location.origin) return;
    if (e.data?.tipo === "ir") ir(e.data.tela, e.data.passo, true);
  });
}

// ---------------- Navegação ----------------
function ir(novaTela: number, novoPasso = 0, remoto = false) {
  novaTela = Math.max(0, Math.min(total - 1, novaTela));
  novoPasso = Math.max(0, Math.min(passos[novaTela], novoPasso));
  const mudouTela = novaTela !== tela || !iniciado;
  const anterior = tela;
  tela = novaTela;
  passo = novoPasso;

  telas.forEach((t, k) => {
    t.classList.toggle("atual", k === tela);
    t.classList.toggle("antes", k < tela);
    const p = k < tela ? passos[k] : k > tela ? 0 : passo;
    t.dataset.passoAtual = String(p);
    t.querySelectorAll<HTMLElement>("[data-passo]").forEach((el) => el.classList.toggle("on", Number(el.dataset.passo) <= p));
    t.setAttribute("aria-hidden", k === tela ? "false" : "true");
    if ("inert" in t) (t as any).inert = k !== tela;
  });
  if (mudouTela && iniciado) telas[anterior].dispatchEvent(new CustomEvent("saiu"));
  telas[tela].dispatchEvent(new CustomEvent("passo", { detail: { passo, entrou: mudouTela } }));

  palco.classList.toggle("tema-clara", telas[tela].dataset.tema === "clara");
  palco.dataset.tela = telas[tela].dataset.chave || "";
  contador.textContent = `${telas[tela].dataset.ato} ${pad(tela + 1)} / ${pad(total)}`;
  const fração = passos[tela] ? passo / (passos[tela] + 1) : 0;
  preenchido.style.width = `${((tela + fração + 1) / total) * 100}%`;

  if (mudouTela) {
    anuncio.textContent = `Tela ${tela + 1} de ${total}: ${telas[tela].dataset.titulo}`;
    antecipar();
  }
  if (!embutido) history.replaceState(null, "", `${location.pathname}${location.search}#${pad(tela + 1)}`);
  if (!remoto) canal?.postMessage({ tipo: "estado", tela, passo });
  iniciado = true;
}
let iniciado = false;

const avancar = () => (passo < passos[tela] ? ir(tela, passo + 1) : tela < total - 1 && ir(tela + 1, 0));
const voltar = () => (passo > 0 ? ir(tela, passo - 1) : tela > 0 && ir(tela - 1, passos[tela - 1]));

/** Carrega as imagens da tela atual e das 2 seguintes. */
function antecipar() {
  for (let k = tela; k <= Math.min(total - 1, tela + 2); k++) {
    telas[k].querySelectorAll<HTMLImageElement>("img").forEach((img) => {
      if (img.loading === "lazy") img.loading = "eager";
      // decodifica antes de a tela aparecer, para a troca não engasgar
      if (k > tela) img.decode?.().catch(() => {});
    });
  }
}

function lerHash() {
  // #06 (número) ou #investimento (nome da tela: continua certo mesmo com telas desligadas)
  const h = decodeURIComponent(location.hash.slice(1));
  const n = parseInt(h, 10);
  if (Number.isFinite(n)) return n - 1;
  const k = telas.findIndex((t) => t.dataset.chave === h);
  return k >= 0 ? k : 0;
}

// ---------------- Teclado e passador de slides ----------------
let buffer = "";
let bufferTimer: number | undefined;
function mostrarBuffer() {
  irPara.textContent = buffer ? `→ ${buffer}` : "";
  irPara.classList.toggle("on", !!buffer);
}

function abrirApresentador() {
  window.open(`/apresentacao/apresentador${q.get("rascunho") === "1" ? "?rascunho=1" : ""}`, "contabil-apresentador", "popup,width=1440,height=900");
}

function alternarTelaCheia() {
  if (document.fullscreenElement) document.exitFullscreen();
  else html.requestFullscreen?.().catch(() => {});
}

if (!embutido) {
  addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const k = e.key;
    let feito = true;
    if (/^[0-9]$/.test(k)) {
      buffer = (buffer + k).slice(-2);
      mostrarBuffer();
      clearTimeout(bufferTimer);
      bufferTimer = window.setTimeout(() => { buffer = ""; mostrarBuffer(); }, 2500);
    } else if (k === "Enter") {
      if (buffer) { ir(parseInt(buffer, 10) - 1, 0); buffer = ""; mostrarBuffer(); }
      else avancar();
    } else if (["ArrowRight", "ArrowDown", " ", "PageDown"].includes(k)) avancar();
    else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(k)) voltar();
    else if (k === "Home") ir(0, 0);
    else if (k === "End") ir(total - 1, 0);
    else if (k === "f" || k === "F") alternarTelaCheia();
    else if (k === "b" || k === "B" || k === ".") html.classList.toggle("pausado");
    else if (k === "n" || k === "N") abrirApresentador();
    else if (k === "Escape") { buffer = ""; mostrarBuffer(); html.classList.remove("pausado"); feito = false; }
    else feito = false;
    if (feito) e.preventDefault();
  });

  // ---------------- Rolagem (mouse e touchpad): um passo por gesto ----------------
  // Um gesto = sequência de eventos com menos de 300 ms entre eles (inclui a inércia do touchpad).
  // Usa o horário em que cada evento aconteceu (e.timeStamp), não quando foi processado,
  // para a página ocupada não partir um gesto em dois.
  let ultimoEvento = -Infinity;
  let gestoUsado = false;
  let ultimoPasso = -Infinity;
  addEventListener("wheel", (e) => {
    if (html.classList.contains("estatico")) return;
    e.preventDefault();
    if (e.timeStamp - ultimoEvento > 300) gestoUsado = false; // começou um gesto novo
    ultimoEvento = e.timeStamp;
    const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
    if (gestoUsado || Math.abs(d) < 6 || e.timeStamp - ultimoPasso < 600) return;
    gestoUsado = true;
    ultimoPasso = e.timeStamp;
    d > 0 ? avancar() : voltar();
  }, { passive: false });

  // ---------------- Toque (tablet) e clique nas bordas ----------------
  // - toque na borda direita (último 22% da largura): avança um passo; borda esquerda: volta um passo;
  // - arrastar o dedo para a esquerda/direita (em qualquer lugar): pula a TELA inteira, sem passar
  //   pelas animações de cada passo.
  let x0 = 0, y0 = 0, t0 = 0, ignorar = false, ativo = false;
  const fora = (el: EventTarget | null) => !!(el as Element)?.closest?.("a, button, input, [data-cilindro], [data-preco], #marca, #gire");
  addEventListener("pointerdown", (e) => {
    if (!e.isPrimary) return;
    ativo = true; x0 = e.clientX; y0 = e.clientY; t0 = e.timeStamp; ignorar = fora(e.target);
  });
  addEventListener("pointerup", (e) => {
    if (!e.isPrimary || !ativo) return;
    ativo = false;
    if (html.classList.contains("estatico") || ignorar || e.button > 0) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.3) {
      // deslizar: tela inteira
      if (dx < 0 && tela < total - 1) ir(tela + 1, 0);
      else if (dx > 0 && tela > 0) ir(tela - 1, 0);
      return;
    }
    if (Math.hypot(dx, dy) > 14 || e.timeStamp - t0 > 600) return;
    const f = e.clientX / innerWidth;
    if (f > 0.78) { avancar(); marcarToque(e.clientX, e.clientY, "dir"); }
    else if (f < 0.22) { voltar(); marcarToque(e.clientX, e.clientY, "esq"); }
  });
  addEventListener("pointercancel", () => (ativo = false));

  function marcarToque(x: number, y: number, lado: string) {
    const m = document.createElement("span");
    m.className = `toque ${lado}`;
    m.style.left = `${x}px`; m.style.top = `${y}px`;
    document.body.append(m);
    setTimeout(() => m.remove(), 700);
  }

  addEventListener("hashchange", () => {
    const n = lerHash();
    if (n !== tela) ir(n, 0);
  });
}

// ---------------- Logo: animação e menu (início / configuração) ----------------
const marca = document.getElementById("marca");
const marcaBotao = document.getElementById("marca-botao");
const fecharMenu = () => { marca?.classList.remove("aberto"); marcaBotao?.setAttribute("aria-expanded", "false"); };
marcaBotao?.addEventListener("click", (e) => {
  e.stopPropagation();
  const abrir = !marca!.classList.contains("aberto");
  marca!.classList.remove("pulsa"); void marca!.offsetWidth; marca!.classList.add("pulsa");
  marca!.classList.toggle("aberto", abrir);
  marcaBotao.setAttribute("aria-expanded", String(abrir));
});
marca?.querySelector("[data-ir-inicio]")?.addEventListener("click", (e) => { e.stopPropagation(); fecharMenu(); ir(0, 0); });
addEventListener("pointerdown", (e) => { if (!(e.target as Element).closest?.("#marca")) fecharMenu(); });
addEventListener("keydown", (e) => e.key === "Escape" && fecharMenu());

// ---------------- Pinça = tela cheia; zoom sempre bloqueado ----------------
// Abrir os dedos (pinça para fora) entra em tela cheia; fechar os dedos sai. O navegador nunca dá zoom:
// pinça, Ctrl + roda do mouse e Ctrl + / Ctrl - ficam bloqueados.
if (!embutido) {
  let d0 = 0, pinca: "abrir" | "fechar" | null = null;
  const distancia = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  addEventListener("touchstart", (e) => {
    if (e.touches.length === 2) { d0 = distancia(e.touches); pinca = null; }
  }, { passive: true });
  addEventListener("touchmove", (e) => {
    if (e.touches.length < 2) return;
    e.preventDefault(); // sem zoom do navegador
    const r = distancia(e.touches) / (d0 || 1);
    if (r > 1.25) pinca = "abrir"; else if (r < 0.8) pinca = "fechar";
  }, { passive: false });
  addEventListener("touchend", () => {
    // o pedido de tela cheia precisa sair de um "toque" do usuário: por isso só quando os dedos saem
    if (!pinca) return;
    const doc = document as any, el = html as any;
    const cheia = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
    if (pinca === "abrir" && !cheia) (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)?.catch?.(() => {});
    if (pinca === "fechar" && cheia) (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc)?.catch?.(() => {});
    pinca = null;
  });
  // Safari (iPad): gestos de zoom próprios
  for (const ev of ["gesturestart", "gesturechange", "gestureend"]) addEventListener(ev, (e) => e.preventDefault(), { passive: false } as any);
  // teclado e mouse
  addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && ["+", "=", "-", "_", "0"].includes(e.key)) e.preventDefault();
  });
}

// ---------------- Sem copiar: nada de menu do botão direito nem arrastar imagens para fora ----------------
if (!html.classList.contains("imprimir")) {
  addEventListener("contextmenu", (e) => { if (!(e.target as Element).closest?.("input, textarea")) e.preventDefault(); });
  addEventListener("dragstart", (e) => e.preventDefault());
}

// ---------------- Versão em pé e impressão ----------------
document.getElementById("ver-em-pe")?.addEventListener("click", () => {
  html.classList.add("empe", "estatico");
  escalar();
  scrollTo(0, 0);
});
const botaoImprimir = document.getElementById("botao-imprimir") as HTMLButtonElement | null;
if (html.classList.contains("imprimir") && botaoImprimir) {
  botaoImprimir.hidden = false;
  botaoImprimir.addEventListener("click", () => print());
  addEventListener("beforeprint", () => (botaoImprimir.hidden = true));
  addEventListener("afterprint", () => (botaoImprimir.hidden = false));
  // ?auto=1 (botão "Exportar PDF" da configuração): abre a janela de impressão sozinha
  // depois que a fonte e todas as imagens carregarem; lá, escolher "Salvar como PDF".
  if (q.get("auto") === "1") {
    const imgs = [...document.querySelectorAll<HTMLImageElement>("img")];
    imgs.forEach((i) => (i.loading = "eager"));
    Promise.all([document.fonts.ready, ...imgs.map((i) => (i.complete ? null : i.decode().catch(() => {})))])
      .then(() => setTimeout(() => print(), 600));
  }
}

// ---------------- Início ----------------
iniciarEfeitos(telas, (t, p) => ir(t, p));

// ---------------- Pré-loader ----------------
// Mostra a logo se desenhando enquanto carregam a fonte e as imagens da primeira tela (mínimo 1,8 s,
// máximo 6 s). Ao sair, tudo se fecha numa linha de luz e a primeira tela entra.
const preloader = document.getElementById("preloader");
const semPreloader = embutido || html.classList.contains("estatico") || !preloader;
function abrirApresentacao() {
  if (!iniciado) ir(embutido ? 0 : lerHash(), 0, false);
}
if (semPreloader) {
  preloader?.remove();
  abrirApresentacao();
} else {
  const inicio = performance.now();
  const rapido = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MIN = rapido ? 300 : 1800, MAX = 6000;
  const barra = document.getElementById("pl-progresso")!;
  const porcento = document.getElementById("pl-porcento")!;
  const alvo = lerHash();
  tela = Math.max(0, Math.min(total - 1, alvo)); // o estado já aponta para a tela pedida enquanto carrega
  const imgs = [...telas[tela].querySelectorAll<HTMLImageElement>("img")];
  imgs.forEach((i) => (i.loading = "eager"));
  const tarefas: Promise<unknown>[] = [document.fonts.ready, ...imgs.map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => {})))];
  let prontas = 0;
  tarefas.forEach((t) => t.then(() => prontas++));
  let mostrado = 0;
  const animar = () => {
    // o número anda suave até a fração real carregada (e também com o tempo, para não parar)
    const real = prontas / tarefas.length;
    const tempo = Math.min(1, (performance.now() - inicio) / MIN);
    const meta = Math.min(real, tempo) * 100;
    mostrado += (meta - mostrado) * 0.12;
    barra.style.transform = `scaleX(${(mostrado / 100).toFixed(3)})`;
    porcento.textContent = String(Math.round(mostrado)).padStart(2, "0");
    if (!preloader!.classList.contains("saindo")) requestAnimationFrame(animar);
  };
  requestAnimationFrame(animar);
  const sair = () => {
    if (preloader!.classList.contains("saindo")) return;
    barra.style.transform = "scaleX(1)"; porcento.textContent = "100";
    preloader!.classList.add("saindo");
    // a tela entra enquanto o pré-loader se fecha na linha
    setTimeout(abrirApresentacao, rapido ? 0 : 650);
    setTimeout(() => preloader!.remove(), rapido ? 300 : 1500);
  };
  Promise.all([Promise.allSettled(tarefas), new Promise((r) => setTimeout(r, MIN))]).then(sair);
  setTimeout(sair, MAX);
}
if (html.classList.contains("estatico")) {
  // na versão estática todas as imagens carregam
  document.querySelectorAll<HTMLImageElement>("img[loading=lazy]").forEach((img) => (img.loading = "eager"));
}

// ---------------- Sem internet: na primeira visita guarda TUDO (telas, imagens, vídeos, configuração, PDF) ----------------
// Depois disso o Pedro apresenta, muda valores e escolhe telas sem conexão.
if (!embutido && import.meta.env.PROD && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/apresentacao-sw.js", { scope: "/apresentacao" }).then(async (reg) => {
    await new Promise((r) => setTimeout(r, 2500)); // depois de a primeira tela aparecer
    // a página inteira carrega de uma vez (não só a tela da frente)
    document.querySelectorAll<HTMLImageElement>("img[loading=lazy]").forEach((img) => (img.loading = "eager"));
    const paginas = ["/apresentacao", "/apresentacao?imprimir=1", "/apresentacao/apresentador", "/apresentacao/configurar"];
    const urls = new Set<string>([...paginas, location.pathname, "/favicon.ico", "/logo.png", "/logo-negative.png"]);
    performance.getEntriesByType("resource").forEach((r) => {
      const u = new URL(r.name);
      if (u.origin === location.origin) urls.add(u.pathname + u.search);
    });
    // tudo o que existe no HTML (inclusive telas desligadas): imagens, fontes, vídeos, pôsteres
    const docs: Document[] = [document];
    for (const pg of paginas.slice(2)) {
      try { docs.push(new DOMParser().parseFromString(await (await fetch(pg)).text(), "text/html")); } catch {}
    }
    for (const d of docs) {
      d.querySelectorAll<HTMLElement>("img[src], source[src], video[poster], script[src], link[rel=stylesheet], link[rel=modulepreload]").forEach((el) => {
        for (const at of ["src", "poster", "href"]) { const v = el.getAttribute(at); if (v && v.startsWith("/")) urls.add(v); }
      });
      d.querySelectorAll("source[srcset], img[srcset]").forEach((el) =>
        (el.getAttribute("srcset") || "").split(",").forEach((c) => { const u = c.trim().split(" ")[0]; if (u.startsWith("/")) urls.add(u); }));
    }
    // fontes e imagens citadas dentro dos CSS
    for (const css of [...urls].filter((u) => u.endsWith(".css"))) {
      try { for (const m of (await (await fetch(css)).text()).matchAll(/url\((\/_astro\/[^)"']+)\)/g)) urls.add(m[1]); } catch {}
    }
    const sw = reg.active || reg.waiting || reg.installing;
    const enviar = (w: ServiceWorker | null) => w?.postMessage({ tipo: "guardar", urls: [...urls] });
    if (sw?.state === "activated") enviar(sw);
    else sw?.addEventListener("statechange", () => sw.state === "activated" && enviar(sw));
  }).catch(() => {});
}

// ---------------- Cursor: círculo laranja que segue o mouse (some quando o mouse fica parado) ----------------
if (!embutido && !html.classList.contains("estatico") && matchMedia("(pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const c = document.createElement("div");
  c.id = "cursor";
  c.setAttribute("aria-hidden", "true");
  c.innerHTML = "<span>→</span>";
  document.body.append(c);
  let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, parado: number | undefined, rodando = false;
  const passo = () => {
    cx += (x - cx) * 0.18; cy += (y - cy) * 0.18;
    c.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    if (Math.abs(x - cx) + Math.abs(y - cy) > 0.3) requestAnimationFrame(passo); else rodando = false;
  };
  addEventListener("pointermove", (e) => {
    x = e.clientX; y = e.clientY;
    c.classList.add("visivel");
    const alvo = (e.target as Element).closest?.("a, button, [data-cilindro], .cartao-gestora, .faixa-logos");
    c.classList.toggle("grande", !!alvo);
    clearTimeout(parado);
    parado = window.setTimeout(() => c.classList.remove("visivel"), 2500);
    if (!rodando) { rodando = true; requestAnimationFrame(passo); }
  });
  addEventListener("pointerleave", () => c.classList.remove("visivel"));
}

// API para depuração e testes
(window as any).apresentacao = { ir, avancar, voltar, estado: () => ({ tela, passo, total, passos }) };
