// Site novo (/novo): o site inteiro rola na vertical (o modo horizontal saiu a pedido do Hiago em 25/11/2026).
// Mapa da página na lateral esquerda, menu da logo em tela cheia, animações que seguem a rolagem.
import "./site"; // acordeão "Dúvidas rápidas" do rodapé (mesmo rodapé do site atual)
import { tatilNosToques } from "./tatil";

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const html = document.documentElement;
const H = false; // modo horizontal desligado
const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
const faixa = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const limita = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const paginas = $$("[data-pg]");
const ids = paginas.map((p) => p.id);
/** no celular: quanto da seção alta já passou pela tela presa (0 → 1) */
const progressoFixo = (sec: HTMLElement) => {
  const r = sec.getBoundingClientRect();
  return limita(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
};

// ---------------- textos gigantes ocupam a largura toda ----------------
function ajustarGigantes() {
  $$("[data-ajustar]").forEach((g) => {
    const s = g.querySelector("span") as HTMLElement;
    if (!s) return;
    g.style.fontSize = "100px";
    const larg = g.clientWidth, w = s.offsetWidth; // offsetWidth: tamanho real, sem a perspectiva da troca de página
    if (w > 0) g.style.fontSize = `${(100 * larg) / w}px`;
  });
}

// ---------------- logo: animação e menu em tela cheia ----------------
const marca = $("#sn-marca")!;
const marcaBotao = $<HTMLButtonElement>("#sn-marca-botao")!;
const menu = $("#sn-menu")!;
const abrirMenu = (abrir: boolean) => {
  html.classList.toggle("sn-menu-aberto", abrir);
  menu.setAttribute("aria-hidden", String(!abrir));
  marcaBotao.setAttribute("aria-expanded", String(abrir));
  if (abrir) $<HTMLElement>(".sn-menu-lista a", menu)?.focus({ preventScroll: true });
};
// dois toques rápidos na logo: liga/desliga a tela cheia (o primeiro toque abre o menu; o segundo o fecha de volta)
let saiuPelaLogo = false; // quem saiu da tela cheia com os dois toques não é puxado de volta a cada toque
const telaCheia = (ligar?: boolean) => {
  const doc = document as any, el = html as any;
  const esta = !!(doc.fullscreenElement || doc.webkitFullscreenElement);
  if (ligar === true && saiuPelaLogo) return;
  if (ligar === undefined) saiuPelaLogo = esta;
  if (ligar ?? !esta) {
    if (esta) return;
    try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el, { navigationUI: "hide" })?.catch?.(() => {}); } catch {}
  } else if (esta) {
    try { (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(doc)?.catch?.(() => {}); } catch {}
  }
};
let ultimoToqueLogo = 0;
marcaBotao.addEventListener("click", (e) => {
  e.stopPropagation();
  marca.classList.remove("pulsa"); void marca.offsetWidth; marca.classList.add("pulsa");
  const agora = performance.now();
  if (agora - ultimoToqueLogo < 380) {
    ultimoToqueLogo = 0;
    abrirMenu(false);
    telaCheia();
    return;
  }
  ultimoToqueLogo = agora;
  abrirMenu(!html.classList.contains("sn-menu-aberto"));
});
$(".sn-menu-fechar", menu)?.addEventListener("click", () => abrirMenu(false));
$$("#sn-menu a").forEach((a) => a.addEventListener("click", () => abrirMenu(false)));
addEventListener("keydown", (e) => e.key === "Escape" && abrirMenu(false));
// menu compacto (não ocupa a tela): fecha ao tocar/clicar fora dele
addEventListener("pointerdown", (e) => {
  if (!html.classList.contains("sn-menu-aberto")) return;
  const t = e.target as Node;
  if (!menu.contains(t) && !marca.contains(t)) abrirMenu(false);
});

// ---------------- mapa da página (vertical) + item ativo do menu ----------------
const cheio = $("[data-cheio]");
const nomesMapa = $$<HTMLAnchorElement>("#sn-mapa [data-ir]");
const opcoes = $$<HTMLAnchorElement>("#sn-menu [data-ir]");
function marcarPagina(k: number, fracao?: number) {
  const id = ids[k];
  nomesMapa.forEach((a, i) => { a.classList.toggle("ativo", i === k); a.classList.toggle("passou", i < k); });
  opcoes.forEach((a) => a.classList.toggle("ativo", a.dataset.ir === id));
  const f = fracao ?? (ids.length > 1 ? k / (ids.length - 1) : 1);
  if (cheio) cheio.style.height = `${(f * 100).toFixed(2)}%`;
  html.classList.toggle("sn-clara-atual", paginas[k]?.classList.contains("sn-clara") ?? false);
}

// ---------------- ir para uma página longe: em vez de rolar o site inteiro (pesado), um "corte" ----------------
// Se a página escolhida está a mais de ~1,5 tela de distância, a tela atual afunda no preto com desfoque,
// o site pula direto para lá e a página nova surge do desfoque. Perto, rola normal.
(function saltoEntrePaginas() {
  const veu = document.createElement("div");
  veu.className = "sn-salto"; veu.setAttribute("aria-hidden", "true");
  document.body.appendChild(veu);
  let ocupado = false;
  document.addEventListener("click", (e) => {
    const a = (e.target as Element).closest<HTMLAnchorElement>("a[data-ir]");
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey) return;
    const alvo = document.getElementById(a.dataset.ir || "");
    if (!alvo) return;
    const destino = alvo.getBoundingClientRect().top + scrollY;
    if (reduz || Math.abs(destino - scrollY) < innerHeight * 1.5) return; // perto: deixa a rolagem suave
    e.preventDefault();
    if (ocupado) return;
    ocupado = true;
    html.classList.add("sn-saltando");
    setTimeout(() => {
      html.style.scrollBehavior = "auto";
      scrollTo(0, destino);
      history.replaceState(null, "", "#" + alvo.id);
      html.style.scrollBehavior = "";
      requestAnimationFrame(() => requestAnimationFrame(() => {
        html.classList.remove("sn-saltando");
        setTimeout(() => { ocupado = false; }, 600);
      }));
    }, 420);
  });
})();

// ---------------- gestores: faixa que anda sozinha e pode ser arrastada (mais rápido ou mais devagar) ----------------
function arrastar() {
  const faixa = $("[data-arrastar]");
  const trilha = faixa ? $(".trilha", faixa) : null;
  if (!faixa || !trilha) return;
  trilha.style.animation = "none";
  const BASE = reduz ? 0 : 38; // px por segundo, para a esquerda
  let x = 0, vel = BASE, segurando = false, xAnt = 0, tAnt = 0, ultimo = 0, visivel = false, raf = 0;
  const meio = () => trilha.scrollWidth / 2;
  const laco = (t: number) => {
    const dt = Math.min(0.05, (t - (ultimo || t)) / 1000); ultimo = t;
    if (!segurando) {
      x -= vel * dt;
      vel += (BASE - vel) * Math.min(1, dt * 1.6); // o impulso do arraste vai voltando à velocidade normal
    }
    const m = meio();
    if (m > 0) { while (x <= -m) x += m; while (x > 0) x -= m; }
    trilha.style.transform = `translate3d(${x.toFixed(1)}px, 0, 0)`;
    if (visivel) raf = requestAnimationFrame(laco);
  };
  faixa.style.cursor = "grab";
  faixa.style.touchAction = "pan-y";
  faixa.addEventListener("pointerdown", (e) => {
    segurando = true; xAnt = e.clientX; tAnt = e.timeStamp; vel = 0;
    faixa.setPointerCapture(e.pointerId); faixa.style.cursor = "grabbing";
  });
  faixa.addEventListener("pointermove", (e) => {
    if (!segurando) return;
    const dx = e.clientX - xAnt, dt = Math.max(1, e.timeStamp - tAnt);
    x += dx;
    vel = vel * 0.6 + (-dx / dt) * 1000 * 0.4; // velocidade do mouse/dedo (px/s), para continuar depois de soltar
    xAnt = e.clientX; tAnt = e.timeStamp;
  });
  const soltar = () => { if (!segurando) return; segurando = false; faixa.style.cursor = "grab"; vel = limita(vel, -2500, 2500); };
  faixa.addEventListener("pointerup", soltar);
  faixa.addEventListener("pointercancel", soltar);
  faixa.addEventListener("dragstart", (e) => e.preventDefault());
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; cancelAnimationFrame(raf); if (visivel) { ultimo = 0; raf = requestAnimationFrame(laco); } }).observe(faixa);
}

// ======================= 1 · túnel automático da capa =======================
function tunelCapa() {
  const tunel = $("[data-tunel-auto]");
  if (!tunel) return;
  const camadas = $$(".camada", tunel);
  const contador = $("[data-contador]", tunel);
  const n = camadas.length;
  let frente = 0, timer = 0;
  const espalhar = (k: number) => {
    const a = (k * 137.5 * Math.PI) / 180, K = camadas[0].clientWidth / 720 || 1;
    return { x: Math.cos(a) * 560 * K, y: Math.sin(a) * 250 * K, z: 760 * K };
  };
  const aplicar = (inicio = false) => {
    camadas.forEach((c, k) => {
      const d = (k - frente + n) % n;
      const { x, y, z } = espalhar(k);
      if (d === n - 1 && !inicio) {
        c.style.transform = `translate3d(${x * 1.8}px, ${y * 1.8}px, ${z * 1.2}px)`;
        c.style.opacity = "0";
        setTimeout(() => { c.style.transition = "none"; c.style.transform = `translate3d(${x}px, ${y}px, ${-(n - 1) * z}px)`; void c.offsetWidth; c.style.transition = ""; }, 1400);
        return;
      }
      c.style.transform = d === 0 ? "translate3d(0,0,0)" : `translate3d(${x}px, ${y}px, ${-d * z}px)`;
      c.style.opacity = d === 0 ? "1" : String(Math.max(0, 0.95 - d * 0.14));
      c.style.filter = d === 0 ? "" : `brightness(${Math.max(0.35, 1 - d * 0.16)})`;
      c.style.zIndex = String(100 - d);
    });
    if (contador) contador.textContent = String(frente + 1).padStart(2, "0");
    const local = $("[data-local-visor]", tunel);
    if (local) local.textContent = `(${camadas[frente].dataset.local || ""})`;
  };
  aplicar(true);
  if (reduz) return { entrar() {}, sair() {} };
  const entrar = () => { clearInterval(timer); timer = window.setInterval(() => { frente = (frente + 1) % n; aplicar(); }, 2800); };
  const sair = () => clearInterval(timer);
  if (!H) new IntersectionObserver(([e]) => (e.isIntersecting ? entrar() : sair())).observe(tunel);
  return { entrar, sair };
}

// ======================= 2 · Nossa História: câmera pelos recortes =======================
function historia() {
  const sec = $("#historia");
  if (!sec) return null;
  const cena = $(".sn-fixo", sec)!;
  const cartoes = $$(".cartao", sec);
  const n = cartoes.length;
  const P = 1000, D = 640, FUGA_Y = 0.46;
  const FIM = n + 0.5;
  const moedas: number[] = JSON.parse($("[data-moedas]", sec)?.textContent || "[]");
  const contador = $("[data-contador-moeda] span", sec);
  const blocos = $$(".h-bloco", sec);
  const gigante = $(".h-gigante", sec);
  const nuvem = [[560, -140], [-620, -300], [520, 190], [-480, -360], [680, -20], [-700, -260], [400, -330], [600, 170],
    [-560, -330], [700, -220], [-440, -380], [520, 150], [-660, -280], [620, -300], [-520, -340], [680, 90]];
  const pos = cartoes.map((_, i) => ({ x: nuvem[i % nuvem.length][0], y: nuvem[i % nuvem.length][1], z: i * D, gira: 0.4 + (i % 4) * 0.13, fase: i * 1.7 }));
  const camadas = cartoes.map((c) => { const l = [".c0", ".c1", ".c2"].map((q) => $(q, c)); return l.every(Boolean) ? (l as HTMLElement[]) : null; });
  const nums = cartoes.map((c) => $(".num", c));
  const largura = cartoes.map((c) => {
    const img = c.querySelector("img");
    const r = img && img.width && img.height ? img.width / img.height : 0.8;
    return (r > 1.2 ? 700 : r < 0.85 ? 460 : 560) * (c.classList.contains("recorte") ? 1.13 : 1);
  });
  const camDe = (p: number) => (p <= 1 ? -1350 + 1100 * p : (p - 1) * D - 250);
  let W = 0, Hh = 0, K = 1, emPe = false, compacta = false, deitada = false;
  const medir = () => {
    W = cena.clientWidth; Hh = cena.clientHeight; emPe = Hh > W;
    compacta = W < 900 || Hh < 560; // celular (em pé ou deitado)
    deitada = compacta && !emPe;
    K = limita(Math.min(W / 1440, Hh / 900), emPe ? 0.5 : 0.42, 1.7);
    cartoes.forEach((c, i) => (c.style.width = `${largura[i] * K}px`));
  };
  let passo = 0, passoVisto = 0, cam = camDe(0), alvo = cam, bloco = -2, ativo = false, raf = 0, ultimo = 0;
  // no modo horizontal o passo anda por degraus (1,6 s entre um marco e outro), como na apresentação
  let de = 0, para = 0, t0 = 0;
  const suave = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

  const desenhar = (agora: number) => {
    // celular deitado: recortes à direita, texto à esquerda
    const fx = deitada ? W * 0.68 : W / 2, fy = Hh * (deitada ? 0.5 : FUGA_Y);
    // celular: no começo o 1º recorte fica grande e na frente; os outros desfocados atrás.
    // Ao avançar, ele sai para a direita desfocando e a câmera segue normal.
    const foco = compacta ? 1 - faixa(passoVisto, 0, 1) : 0;
    cartoes.forEach((c, i) => {
      // celular: depois que o 1º recorte saiu pela direita, ele não volta no meio da câmera
      if (compacta && i === 0 && foco <= 0) { if (c.style.visibility !== "hidden") { c.style.opacity = "0"; c.style.visibility = "hidden"; } return; }
      if (foco > 0 && i === 0) {
        const larg = largura[0] * K;
        const alvoLarg = deitada ? Math.min(W * 0.36, Hh * 0.62 * 0.8) : W * 0.72;
        const s0 = alvoLarg / larg;
        const sai = 1 - foco;
        const x0 = (deitada ? W * 0.68 : W / 2) + sai * W * 0.75;
        const y0 = deitada ? Hh * 0.5 : Hh * 0.46; // abaixo do rótulo "(NOSSA HISTÓRIA)"
        c.style.visibility = "visible";
        c.style.opacity = Math.max(0, 1 - sai * 1.1).toFixed(3);
        c.style.transform = `translate3d(${x0.toFixed(1)}px, ${y0.toFixed(1)}px, 0) translate(-50%, -50%) scale(${(s0 * (1 + sai * 0.25)).toFixed(4)}) rotate(${(sai * 6).toFixed(2)}deg)`;
        c.style.filter = sai > 0.02 ? `blur(${(sai * 26).toFixed(1)}px)` : "";
        c.style.zIndex = "500";
        if (nums[0]) nums[0]!.style.opacity = (1 - sai * 3).toFixed(3);
        return;
      }
      const some = () => { if (c.style.visibility !== "hidden") { c.style.opacity = "0"; c.style.visibility = "hidden"; } };
      const prof = pos[i].z - cam + P;
      if (prof <= 40) return some();
      const s = P / prof;
      const op = Math.min(faixa(s, 0.12, 0.19), 1 - faixa(s, 1.15, 1.9));
      if (op <= 0.001) return some();
      const rot = reduz ? 0 : Math.sin((agora / 1000) * pos[i].gira + pos[i].fase) * 0.9;
      const x = pos[i].x * K * (emPe ? 0.55 : 1), y = pos[i].y * K * (emPe ? 1.2 : 1);
      c.style.visibility = "visible";
      c.style.opacity = op.toFixed(3);
      c.style.transform = `translate3d(${(fx + x * s).toFixed(1)}px, ${(fy + y * s).toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
      const lente = Math.max(0, (s - 0.9) * 42);
      const cx = (x * s) / (W / 2), cy = (fy + y * s - Hh / 2) / (Hh / 2);
      const desfoque = Math.min(34, lente + faixa(Math.hypot(cx, cy * 1.2), 0.62, 1.05) * 5 + foco * 12);
      const cs = camadas[i];
      if (cs) {
        cs[0].style.opacity = (1 - faixa(desfoque, 0, 6)).toFixed(3);
        cs[1].style.opacity = Math.min(faixa(desfoque, 0, 1.5), 1 - faixa(desfoque, 8, 22)).toFixed(3);
        cs[2].style.opacity = faixa(desfoque, 6, 9).toFixed(3);
        if (nums[i]) nums[i]!.style.opacity = (1 - faixa(desfoque, 0, 4)).toFixed(3);
      } else c.style.filter = desfoque > 0.4 ? `blur(${desfoque.toFixed(1)}px)` : "";
      c.style.zIndex = String(Math.round(s * 100));
    });
    if (gigante) {
      const g = passoVisto;
      const esc = 1 + 0.395 * g + 0.405 * g * g;
      const op = g <= 1 ? 1 - 0.06 * g : g <= 2 ? 0.94 - 0.7 * (g - 1) : Math.max(0, 0.24 - 0.6 * (g - 2));
      gigante.style.transform = `scale(${esc.toFixed(3)})`;
      gigante.style.filter = g > 0.02 ? `blur(${Math.min(24, 10 * g).toFixed(1)}px)` : "";
      gigante.style.opacity = op.toFixed(3);
    }
  };
  const textos = (p: number) => {
    const b = p < 0.55 ? -1 : Math.min(n - 1, Math.round(p) - 1);
    if (b === bloco) return;
    bloco = b;
    blocos.forEach((el) => el.classList.toggle("ativo", Number(el.dataset.bloco) === b));
    if (contador) contador.textContent = String(moedas[Math.max(0, b)] ?? 1).padStart(2, "0");
  };
  const laco = (agora: number) => {
    if (H) {
      const pr = Math.min(1, (agora - t0) / 1600);
      passoVisto = de + (para - de) * suave(pr);
      cam = camDe(passoVisto);
    } else {
      const dt = Math.min(64, agora - (ultimo || agora)); ultimo = agora;
      cam += (alvo - cam) * (reduz ? 1 : 1 - Math.pow(0.86, dt / 16.7));
      passoVisto = passo;
    }
    desenhar(agora);
    if (ativo) raf = requestAnimationFrame(laco);
  };
  const ligar = () => { if (!ativo) { ativo = true; medir(); ultimo = 0; raf = requestAnimationFrame(laco); } };
  const desligar = () => { ativo = false; cancelAnimationFrame(raf); };
  addEventListener("resize", () => { medir(); });

  if (!H) {
    // celular: a câmera segue a rolagem; toque leva ao próximo marco
    new IntersectionObserver(([e]) => (e.isIntersecting ? ligar() : desligar())).observe(sec);
    const ler = () => { passo = progressoFixo(sec) * FIM; alvo = camDe(passo); textos(passo); };
    addEventListener("scroll", () => ativo && ler(), { passive: true });
    cena.addEventListener("click", () => {
      const prox = Math.min(FIM, Math.floor(passo + 0.05) + 1);
      const r = sec.getBoundingClientRect();
      scrollTo({ top: scrollY + r.top + (prox / FIM) * (r.height - innerHeight) + 2, behavior: reduz ? "auto" : "smooth" });
    });
    medir(); ler(); cam = alvo; desenhar(performance.now());
    return null;
  }
  // computador/tablet: passos 0 (título) … n (último marco); clique avança
  const irPasso = (p: number, imediato = false) => {
    passo = limita(p, 0, n);
    de = imediato ? passo : passoVisto; para = passo; t0 = imediato ? -1e9 : performance.now();
    textos(passo);
  };
  medir(); irPasso(0, true); desenhar(performance.now());
  return {
    total: n,
    get passo() { return passo; },
    irPasso, ligar, desligar,
    clique: (cb: () => void) => cena.addEventListener("click", cb),
  };
}

// ======================= 3 · Desde 1984: vídeo quadro a quadro =======================
function fachada() {
  const sec = $("#desde-1984");
  if (!sec) return null;
  const canvas = $<HTMLCanvasElement>("canvas", sec)!;
  const ctx = canvas.getContext("2d")!;
  const texto = $(".sn-fachada-texto", sec);
  const N = Number(sec.dataset.quadros || 0);
  const pasta = innerWidth < 900 ? "fachada-quadros-720" : "fachada-quadros";
  const quadros: HTMLImageElement[] = [];
  let carregou = false, atualQ = -1, prog = 0, visto = 0, raf = 0, ativo = false;
  const carregar = () => {
    if (carregou) return; carregou = true;
    for (let i = 1; i <= N; i++) {
      const im = new Image(); im.decoding = "async";
      im.src = `/apresentacao/video/${pasta}/q${String(i).padStart(3, "0")}.webp`;
      if (i === 1 || i === N) im.onload = () => { atualQ = -1; desenhar(); };
      quadros.push(im);
    }
  };
  const tamanho = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr); atualQ = -1;
  };
  const desenhar = () => {
    const t = H ? visto : progressoFixo(sec);
    texto?.style.setProperty("--texto", faixa(t, 0.6, 0.92).toFixed(3));
    let q = Math.round(faixa(t, 0.02, 0.8) * (N - 1));
    for (let d = 0; d < N; d++) { const a = quadros[q - d], b = quadros[q + d]; if (a?.complete && a.naturalWidth) { q -= d; break; } if (b?.complete && b.naturalWidth) { q += d; break; } }
    const im = quadros[q];
    if (!im || !im.complete || !im.naturalWidth || q === atualQ) return;
    atualQ = q;
    const cw = canvas.width, ch = canvas.height, esc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * esc, h = im.naturalHeight * esc;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  };
  addEventListener("resize", () => { tamanho(); desenhar(); });
  if (!H) {
    new IntersectionObserver(([e]) => { if (e.isIntersecting) { carregar(); tamanho(); desenhar(); } }, { rootMargin: "150% 0px" }).observe(sec);
    addEventListener("scroll", () => requestAnimationFrame(desenhar), { passive: true });
    return null;
  }
  const laco = () => { visto += (prog - visto) * 0.14; desenhar(); if (ativo && Math.abs(prog - visto) > 0.0005) raf = requestAnimationFrame(laco); else if (ativo) raf = requestAnimationFrame(laco); };
  return {
    preparar() { carregar(); },
    get prog() { return prog; },
    mover(d: number) { prog = limita(prog + d, 0, 1); },
    definir(v: number) { prog = v; visto = v; atualQ = -1; desenhar(); },
    ligar() { carregar(); tamanho(); ativo = true; cancelAnimationFrame(raf); raf = requestAnimationFrame(laco); },
    desligar() { ativo = false; cancelAnimationFrame(raf); },
  };
}

// ======================= 5 · números em odômetro =======================
function numeros() {
  const grade = $("[data-contagem]");
  if (!grade) return null;
  $$("[data-contar]", grade).forEach((n, k) => {
    const valor = n.dataset.contar!;
    n.setAttribute("aria-label", valor);
    n.classList.add("odo");
    n.innerHTML = [...valor].map((dig, c) => {
      if (!/\d/.test(dig)) return `<span>${dig}</span>`;
      const alvo = (valor.length - c) * 10 + Number(dig);
      return `<span class="odo-col" aria-hidden="true"><span class="odo-fita" style="--alvo:${alvo};--k:${k};--c:${c}">${Array.from({ length: alvo + 1 }, (_, j) => `<b>${j % 10}</b>`).join("")}</span></span>`;
    }).join("");
    (n.closest(".grade > div") as HTMLElement | null)?.style.setProperty("--k", String(k));
  });
  const contar = () => requestAnimationFrame(() => requestAnimationFrame(() => grade.classList.add("contou")));
  if (reduz) grade.classList.add("contou");
  else if (!H) { const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { contar(); io.disconnect(); } }, { threshold: 0.3 }); io.observe(grade); }
  return { entrar: contar, sair: () => grade.classList.remove("contou") };
}

// ======================= 7 · como começar: a etapa da vez acende =======================
function etapas() {
  const box = $("[data-etapas]");
  if (!box) return null;
  const itens = $$(".etapa", box);
  let timer = 0;
  const acende = (k: number) => itens.forEach((el, i) => el.classList.toggle("destaque", i === k));
  if (!H) {
    let ultimo = -2;
    const ver = () => {
      const r = box.getBoundingClientRect();
      const p = faixa(innerHeight * 0.78 - r.top, 0, innerHeight * 0.75);
      const k = p <= 0 ? -1 : Math.min(itens.length - 1, Math.floor(p * itens.length));
      if (k !== ultimo) { ultimo = k; acende(k); }
    };
    addEventListener("scroll", () => requestAnimationFrame(ver), { passive: true });
    ver();
    return null;
  }
  return {
    entrar() { let k = 0; clearInterval(timer); acende(-1); timer = window.setInterval(() => { acende(k % itens.length); k++; }, 1300); },
    sair() { clearInterval(timer); acende(-1); },
  };
}

// ======================= 10 · contato: clone do hero da Aligno =======================
// Tempos medidos na referência (relógio virtual, 30 fps): título aparece em t0, letras abrem até +0,56 s,
// letras piscam de +0,47 a +0,77 s, luz do teto: acende +0,80, apaga +1,00, acende +1,30, apaga +1,40,
// acende de vez +1,80. Cartão (rodapé): rotateX 40° → 0° e sobe 159 px nos primeiros ~476 px de rolagem.
function contato() {
  const sec = $("#contato");
  if (!sec) return null;
  const palco = $(".ct-palco", sec)!;
  // a logo não tem letras separadas: ela pisca inteira junto com a luz (classe luz-on)
  const letras: HTMLElement[] = [];
  let timers: number[] = [];
  const depois = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms));
  const limpar = () => { timers.forEach(clearTimeout); timers = []; };

  // partículas: ~140 pontos brancos de 1 px, deriva lenta (como o canvas 2D da referência)
  const cv = $<HTMLCanvasElement>(".ct-particulas", sec)!;
  const cx = cv.getContext("2d")!;
  let pts: { x: number; y: number; vx: number; vy: number; a: number; f: number }[] = [];
  let rafP = 0, ligadas = false;
  const iniciarPts = () => {
    const w = cv.clientWidth, h = cv.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(140 * (w * h) / (1440 * 1220));
    pts = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.12, vy: (Math.random() - 0.5) * 0.12 - 0.04, a: 0.25 + Math.random() * 0.6, f: Math.random() * 6.28 }));
  };
  const desenharPts = (t: number) => {
    const w = cv.clientWidth, h = cv.clientHeight;
    cx.clearRect(0, 0, w, h);
    for (const p of pts) {
      p.x = (p.x + p.vx + w) % w; p.y = (p.y + p.vy + h) % h;
      cx.globalAlpha = p.a * (0.7 + 0.3 * Math.sin(t / 900 + p.f));
      cx.beginPath(); cx.arc(p.x, p.y, 1, 0, 6.2832); cx.fillStyle = "#fff"; cx.fill();
    }
    if (ligadas) rafP = requestAnimationFrame(desenharPts);
  };

  // o rodapé fica em pé conforme a rolagem (0 → ~476 px da referência, proporcional à tela)
  const deitar = () => {
    const k = Math.min(1, innerWidth / 1440);
    let rolado: number;
    if (H) rolado = sec.scrollTop;
    else rolado = innerHeight - palco.getBoundingClientRect().top - 0.35 * innerHeight; // começa quando o cartão aparece
    // termina de ficar em pé no máximo quando a página acaba (o rodapé ficou mais curto sem as "Dúvidas Rápidas")
    const falta = H ? 0 : Math.max(0, document.documentElement.scrollHeight - innerHeight - scrollY);
    const fim = Math.max(1, Math.min(476 * Math.max(0.6, k), rolado + falta - 8));
    const d = 1 - faixa(rolado, 0, fim);
    sec.style.setProperty("--deita", (reduz ? 0 : Math.pow(d, 1.3)).toFixed(4));
  };

  const entrar = () => {
    limpar();
    sec.classList.remove("entrou", "luz-on");
    letras.forEach((l) => l.classList.remove("apagada"));
    void sec.offsetWidth;
    if (reduz) { sec.classList.add("entrou", "luz-on"); return; }
    depois(150, () => sec.classList.add("entrou"));
    // letras piscando (+0,47 s a +0,77 s): a cada quadro algumas somem
    for (let f = 0; f < 9; f++) depois(150 + 470 + f * 33, () => letras.forEach((l) => l.classList.toggle("apagada", Math.random() < 0.28)));
    depois(150 + 800, () => { letras.forEach((l) => l.classList.remove("apagada")); sec.classList.add("luz-on"); });
    depois(150 + 1000, () => sec.classList.remove("luz-on"));
    depois(150 + 1300, () => sec.classList.add("luz-on"));
    depois(150 + 1400, () => sec.classList.remove("luz-on"));
    depois(150 + 1800, () => sec.classList.add("luz-on"));
    if (!ligadas) { ligadas = true; iniciarPts(); rafP = requestAnimationFrame(desenharPts); }
    deitar();
  };
  const sair = () => { limpar(); ligadas = false; cancelAnimationFrame(rafP); };
  if (H) sec.addEventListener("scroll", () => requestAnimationFrame(deitar), { passive: true });
  else {
    addEventListener("scroll", () => requestAnimationFrame(deitar), { passive: true });
    new IntersectionObserver(([e]) => (e.isIntersecting ? entrar() : sair()), { threshold: 0.25 }).observe(sec);
  }
  addEventListener("resize", () => { if (ligadas) iniciarPts(); deitar(); });
  deitar();
  return { entrar, sair };
}

// ======================= celular: blocos afundam no preto e desfocam ao passar pelo topo =======================
// bordas da tela: o véu de cada borda acompanha a cor da seção que está passando por ela (preto ou cinza-claro)
function coresDasBordas() {
  const topo = $(".sn-borda.topo"), base = $(".sn-borda.base");
  if (!topo || !base) return;
  const claras = $$(".sn-clara");
  const ver = () => {
    const naBorda = (y: number) => claras.some((c) => { const r = c.getBoundingClientRect(); return r.top <= y && r.bottom >= y; });
    topo.classList.toggle("clara", naBorda(20));
    base.classList.toggle("clara", naBorda(innerHeight - 20));
  };
  addEventListener("scroll", () => requestAnimationFrame(ver), { passive: true });
  ver();
}

function afundarNoPreto() {
  const alvos = $$(".sn-bloco .sn-cab, .sn-bloco .rv, .sn-time .sn-cab");
  alvos.forEach((el) => (el.dataset.sai = ""));
  const ver = () => {
    const lim = innerHeight * 0.16;
    for (const el of alvos) {
      const r = el.getBoundingClientRect();
      if (r.bottom < -50 || r.top > innerHeight) continue;
      el.style.setProperty("--sai", faixa(lim - r.top, 0, Math.max(80, r.height * 0.9)).toFixed(3));
    }
  };
  addEventListener("scroll", () => requestAnimationFrame(ver), { passive: true });
  ver();
}

// ======================= montagem =======================
const capa = tunelCapa();
const hist = historia();
const fach = fachada();
const nums = numeros();
const etp = etapas();
const ctt = contato();

if (!H) {
  // ---------- CELULAR: rolagem vertical ----------
  html.classList.toggle("sn-anima", html.classList.contains("sn-anima"));
  if (html.classList.contains("sn-anima")) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    $$(".rv").forEach((el) => io.observe(el));
  }
  let idAtual = -1;
  const ver = () => {
    let k = 0;
    paginas.forEach((p, i) => { if (p.getBoundingClientRect().top <= innerHeight * 0.4) k = i; });
    const max = document.documentElement.scrollHeight - innerHeight;
    if (scrollY >= max - 4) k = paginas.length - 1;
    marcarPagina(k, limita(scrollY / Math.max(1, max), 0, 1));
    if (k !== idAtual) idAtual = k;
  };
  addEventListener("scroll", () => requestAnimationFrame(ver), { passive: true });
  ver();
  afundarNoPreto();
}
arrastar();
coresDasBordas();

// ---------------- celular e tablet: tela cheia no primeiro toque (mais imersão) ----------------
// O navegador só deixa entrar em tela cheia a partir de um toque da pessoa; por isso o primeiro toque (ou
// o primeiro arraste) já pede a tela cheia. iPhone não permite tela cheia em páginas; iPad e Android sim.
(function telaCheiaNoToque() {
  if (!matchMedia("(pointer: coarse)").matches) return;
  // celular e tablet: todo toque pede a tela cheia de novo se ela não estiver ligada (o navegador só deixa
  // a partir de um toque; o iPhone não deixa páginas ficarem em tela cheia: lá vale "Adicionar à Tela de Início")
  const pedir = () => telaCheia(true);
  addEventListener("touchend", pedir, { passive: true });
  addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") pedir(); });
})();

tatilNosToques();

addEventListener("resize", ajustarGigantes);
document.fonts?.ready.then(ajustarGigantes);
ajustarGigantes();

