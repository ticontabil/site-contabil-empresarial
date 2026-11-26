// Site novo (/novo): menu fixo com o nome das seções, menu da logo, entradas ao rolar, túnel da capa,
// Nossa História (câmera pelos recortes, pela rolagem ou clique/toque), vídeo da fachada quadro a quadro
// com a rolagem, números em odômetro, etapas de "Como começar" e a luz do contato.
import "./site"; // acordeão "Dúvidas rápidas" do rodapé (mesmo rodapé do site atual)

const $ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => r.querySelector<T>(s);
const $$ = <T extends Element = HTMLElement>(s: string, r: ParentNode = document) => [...r.querySelectorAll<T>(s)];
const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
const faixa = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));
const limita = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
/** quanto da seção já passou pela tela presa (0 no começo, 1 quando a cena solta) */
const progressoFixo = (sec: HTMLElement) => {
  const r = sec.getBoundingClientRect();
  return limita(-r.top / Math.max(1, r.height - innerHeight), 0, 1);
};

// ---------------- menu fixo: linha de progresso + nome da seção atual ----------------
const trilha = $("[data-trilha]");
const nomes = $$<HTMLAnchorElement>("[data-nome-de]");
const atual = $("[data-atual]");
const opcoes = $$<HTMLAnchorElement>("#sn-marca-menu .sn-op");
const secoes = $$("[data-secao]").map((el) => ({ el, id: el.dataset.secao || el.id }));
let idAtual = "";
function marcarSecao() {
  const max = document.documentElement.scrollHeight - innerHeight;
  if (trilha) trilha.style.width = `${(limita(scrollY / Math.max(1, max), 0, 1) * 100).toFixed(2)}%`;
  let id = secoes[0]?.id || "";
  for (const s of secoes) if (s.el.getBoundingClientRect().top <= innerHeight * 0.4) id = s.id;
  if (scrollY >= max - 4) id = secoes[secoes.length - 1].id; // fim da página: contato
  if (id === idAtual) return;
  idAtual = id;
  nomes.forEach((a) => a.classList.toggle("ativo", a.dataset.nomeDe === id));
  opcoes.forEach((a) => a.classList.toggle("ativo", a.getAttribute("href") === `#${id}`));
  const nome = nomes.find((a) => a.dataset.nomeDe === id)?.textContent;
  if (atual && nome) atual.textContent = nome;
}

// ---------------- logo: animação e menu com as páginas ----------------
const marca = $("#sn-marca");
const marcaBotao = $<HTMLButtonElement>("#sn-marca-botao");
opcoes.forEach((o, k) => o.style.setProperty("--k", String(k)));
$$("#sn-marca-menu a").forEach((o, k) => (o as HTMLElement).style.setProperty("--k", String(k)));
const fecharMenu = () => { marca?.classList.remove("aberto"); marcaBotao?.setAttribute("aria-expanded", "false"); };
marcaBotao?.addEventListener("click", (e) => {
  e.stopPropagation();
  const abrir = !marca!.classList.contains("aberto");
  marca!.classList.remove("pulsa"); void marca!.offsetWidth; marca!.classList.add("pulsa");
  marca!.classList.toggle("aberto", abrir);
  marcaBotao.setAttribute("aria-expanded", String(abrir));
});
$$("#sn-marca-menu a").forEach((a) => a.addEventListener("click", fecharMenu));
addEventListener("click", (e) => { if (!(e.target as Element).closest?.("#sn-marca")) fecharMenu(); });
addEventListener("keydown", (e) => e.key === "Escape" && fecharMenu());

// ---------------- entradas ao rolar ----------------
if (document.documentElement.classList.contains("sn-anima")) {
  // atraso em cascata entre irmãos
  $$(".rv").forEach((el) => {
    const irmaos = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains("rv")) : [];
    el.style.transitionDelay = `${Math.min(6, irmaos.indexOf(el)) * 90}ms`;
  });
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("on"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
  $$(".rv").forEach((el) => io.observe(el));
}

// ---------------- textos gigantes ocupam a largura toda ----------------
function ajustarGigantes() {
  $$("[data-ajustar]").forEach((g) => {
    const s = g.querySelector("span") as HTMLElement;
    if (!s) return;
    g.style.fontSize = "100px";
    const larg = g.clientWidth, w = s.getBoundingClientRect().width;
    if (w > 0) g.style.fontSize = `${(100 * larg) / w}px`;
  });
}

// ---------------- 1 · túnel automático da capa ----------------
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
        setTimeout(() => {
          c.style.transition = "none";
          c.style.transform = `translate3d(${x}px, ${y}px, ${-(n - 1) * z}px)`;
          void c.offsetWidth;
          c.style.transition = "";
        }, 1400);
        return;
      }
      c.style.transform = d === 0 ? "translate3d(0,0,0)" : `translate3d(${x}px, ${y}px, ${-d * z}px)`;
      c.style.opacity = d === 0 ? "1" : String(Math.max(0, 0.95 - d * 0.14));
      c.style.filter = d === 0 ? "" : `brightness(${Math.max(0.35, 1 - d * 0.16)})`;
      c.style.zIndex = String(100 - d);
    });
    if (contador) contador.textContent = String(frente + 1).padStart(2, "0");
  };
  aplicar(true);
  if (reduz) return;
  const iniciar = () => { clearInterval(timer); timer = window.setInterval(() => { frente = (frente + 1) % n; aplicar(); }, 2800); };
  // só anda com a capa na tela
  new IntersectionObserver(([e]) => (e.isIntersecting ? iniciar() : clearInterval(timer))).observe(tunel);
}

// ---------------- 2 · Nossa História: câmera pelos recortes ----------------
// Mesma mecânica da apresentação (projeção em perspectiva, desfoque em camadas prontas), mas a câmera
// anda com a rolagem. Clique (computador) ou toque (celular/tablet) leva até o próximo marco.
function historia() {
  const sec = $("[data-tunel-hist]");
  if (!sec) return;
  const cena = $(".sn-fixo", sec)!;
  const cartoes = $$(".cartao", sec);
  const n = cartoes.length;
  const P = 1000, D = 640, FUGA_Y = 0.46;
  const FIM = n + 0.5; // passo em que a cena solta (o último recorte já passando pela borda)
  const moedas: number[] = JSON.parse($("[data-moedas]", sec)?.textContent || "[]");
  const contador = $("[data-contador-moeda] span", sec);
  const blocos = $$(".h-bloco", sec);
  const gigante = $(".h-gigante", sec);
  const dica = $("[data-dica]", sec);
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

  let W = 0, H = 0, K = 1, emPe = false;
  const medir = () => {
    W = cena.clientWidth; H = cena.clientHeight; emPe = H > W;
    K = limita(Math.min(W / 1440, H / 900), emPe ? 0.5 : 0.42, 1.7);
    cartoes.forEach((c, i) => (c.style.width = `${largura[i] * K}px`));
  };
  let cam = camDe(0), alvo = cam, passo = 0, bloco = -2, visivel = false, raf = 0, ultimo = 0;

  const desenhar = (agora: number) => {
    const fx = W / 2, fy = H * FUGA_Y;
    cartoes.forEach((c, i) => {
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
      const cx = (x * s) / (W / 2), cy = (fy + y * s - H / 2) / (H / 2);
      const desfoque = Math.min(34, lente + faixa(Math.hypot(cx, cy * 1.2), 0.62, 1.05) * 5);
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
      const g = passo;
      const esc = 1 + 0.395 * g + 0.405 * g * g;
      const op = g <= 1 ? 1 - 0.06 * g : g <= 2 ? 0.94 - 0.7 * (g - 1) : Math.max(0, 0.24 - 0.6 * (g - 2));
      gigante.style.transform = `scale(${esc.toFixed(3)})`;
      gigante.style.filter = g > 0.02 ? `blur(${Math.min(24, 10 * g).toFixed(1)}px)` : "";
      gigante.style.opacity = op.toFixed(3);
    }
  };
  const lerRolagem = () => {
    passo = progressoFixo(sec) * FIM;
    alvo = camDe(passo);
    const b = passo < 0.55 ? -1 : Math.min(n - 1, Math.round(passo) - 1);
    if (b !== bloco) {
      bloco = b;
      blocos.forEach((el) => el.classList.toggle("ativo", Number(el.dataset.bloco) === b));
      if (contador) contador.textContent = String(moedas[Math.max(0, b)] ?? 1).padStart(2, "0");
    }
    if (passo > 1.4) dica?.classList.add("some");
  };
  const laco = (agora: number) => {
    const dt = Math.min(64, agora - (ultimo || agora)); ultimo = agora;
    cam += (alvo - cam) * (reduz ? 1 : 1 - Math.pow(0.86, dt / 16.7)); // a câmera segue a rolagem com suavidade
    desenhar(agora);
    if (visivel) raf = requestAnimationFrame(laco);
  };
  new IntersectionObserver(([e]) => {
    visivel = e.isIntersecting;
    cancelAnimationFrame(raf);
    if (visivel) { medir(); lerRolagem(); ultimo = 0; raf = requestAnimationFrame(laco); }
  }).observe(sec);
  addEventListener("scroll", () => visivel && lerRolagem(), { passive: true });
  addEventListener("resize", () => { medir(); lerRolagem(); cam = alvo; });

  // clique/toque: vai até o próximo marco (no último, segue para a fachada)
  cena.addEventListener("click", () => {
    dica?.classList.add("some");
    const prox = Math.min(FIM, Math.floor(passo + 0.05) + 1);
    const r = sec.getBoundingClientRect();
    const total = r.height - innerHeight;
    const y = scrollY + r.top + (prox / FIM) * total + (prox >= FIM ? 2 : 0);
    scrollTo({ top: y, behavior: reduz ? "auto" : "smooth" });
  });
  medir(); lerRolagem(); cam = alvo; desenhar(performance.now());
}

// ---------------- 2b · fachada: vídeo quadro a quadro com a rolagem ----------------
function fachada() {
  const sec = $("[data-video-rolagem]");
  if (!sec) return;
  const canvas = $<HTMLCanvasElement>("canvas", sec)!;
  const ctx = canvas.getContext("2d")!;
  const texto = $(".sn-fachada-texto", sec);
  const N = Number(sec.dataset.quadros || 0);
  const pasta = innerWidth < 900 ? "fachada-quadros-720" : "fachada-quadros";
  const quadros: HTMLImageElement[] = [];
  let carregou = false, atualQ = -1;
  const carregar = () => {
    if (carregou) return; carregou = true;
    for (let i = 1; i <= N; i++) {
      const im = new Image();
      im.decoding = "async";
      im.src = `/apresentacao/video/${pasta}/q${String(i).padStart(3, "0")}.webp`;
      if (i === 1 || i === N) im.onload = () => { atualQ = -1; desenhar(); };
      quadros.push(im);
    }
  };
  const tamanho = () => {
    const dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
    atualQ = -1;
  };
  const desenhar = () => {
    const t = progressoFixo(sec);
    texto?.style.setProperty("--texto", faixa(t, 0.55, 0.85).toFixed(3));
    let q = Math.round(faixa(t, 0.05, 0.75) * (N - 1));
    // se o quadro ainda não chegou, usa o mais perto já carregado
    for (let d = 0; d < N; d++) { const a = quadros[q - d], b = quadros[q + d]; if (a?.complete && a.naturalWidth) { q -= d; break; } if (b?.complete && b.naturalWidth) { q += d; break; } }
    const im = quadros[q];
    if (!im || !im.complete || !im.naturalWidth || q === atualQ) return;
    atualQ = q;
    const cw = canvas.width, ch = canvas.height, esc = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * esc, h = im.naturalHeight * esc;
    ctx.drawImage(im, (cw - w) / 2, (ch - h) / 2, w, h);
  };
  new IntersectionObserver(([e]) => { if (e.isIntersecting) { carregar(); tamanho(); desenhar(); } }, { rootMargin: "150% 0px" }).observe(sec);
  addEventListener("scroll", () => requestAnimationFrame(desenhar), { passive: true });
  addEventListener("resize", () => { tamanho(); desenhar(); });
}

// ---------------- 4 · números em odômetro ----------------
function numeros() {
  const grade = $("[data-contagem]");
  if (!grade) return;
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
  if (reduz) { grade.classList.add("contou"); return; }
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { grade.classList.add("contou"); io.disconnect(); } }, { threshold: 0.3 });
  io.observe(grade);
}

// ---------------- 6 · como começar: a etapa da vez acende com a rolagem ----------------
function etapas() {
  const box = $("[data-etapas]");
  if (!box) return;
  const itens = $$(".etapa", box);
  let ultimo = -2;
  const ver = () => {
    const r = box.getBoundingClientRect();
    const p = faixa(innerHeight * 0.78 - r.top, 0, innerHeight * 0.75);
    const k = p <= 0 ? -1 : Math.min(itens.length - 1, Math.floor(p * itens.length));
    if (k === ultimo) return;
    ultimo = k;
    itens.forEach((el, i) => el.classList.toggle("destaque", i === k));
  };
  addEventListener("scroll", () => requestAnimationFrame(ver), { passive: true });
  ver();
}

// ---------------- 10 · contato: a luz acende conforme a seção chega ----------------
function luz() {
  const sec = $("#contato");
  if (!sec) return;
  const ver = () => {
    const r = sec.getBoundingClientRect();
    sec.style.setProperty("--luz", faixa(innerHeight - r.top, innerHeight * 0.1, innerHeight * 0.9).toFixed(3));
  };
  addEventListener("scroll", () => requestAnimationFrame(ver), { passive: true });
  ver();
}

addEventListener("scroll", () => requestAnimationFrame(marcarSecao), { passive: true });
addEventListener("resize", () => { ajustarGigantes(); marcarSecao(); });
document.fonts?.ready.then(ajustarGigantes);
ajustarGigantes();
marcarSecao();
tunelCapa();
historia();
fachada();
numeros();
etapas();
luz();
