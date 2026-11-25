// Efeitos das telas: túnel (01 e 06), contagem (07), carrossel curvo (09), nome gigante (01).
// Cada tela recebe o evento "passo" com { passo, entrou } quando muda.

type DetalhePasso = { passo: number; entrou: boolean };
type IrPara = (tela: number, passo: number) => void;

const reduz = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// posição "espalhada" de cada camada no fundo do túnel (determinística)
function espalhar(k: number) {
  const a = (k * 137.5 * Math.PI) / 180;
  return { x: Math.cos(a) * 560, y: Math.sin(a) * 250 };
}

/** Posiciona as camadas do túnel com a camada `frente` no primeiro plano. */
function posicionarTunel(camadas: HTMLElement[], frente: number) {
  camadas.forEach((c, k) => {
    const d = k - frente;
    const { x, y } = espalhar(k);
    let tf: string, op: number, filtro = "";
    if (d < 0) {
      // já passou: atravessa a tela e some
      tf = `translate3d(${x * 1.8}px, ${y * 1.8}px, 900px)`;
      op = 0;
    } else if (d === 0) {
      tf = "translate3d(0, 0, 0)";
      op = 1;
    } else {
      tf = `translate3d(${x}px, ${y}px, ${-d * 760}px)`;
      op = d > 5 ? 0 : Math.max(0, 0.95 - d * 0.14);
      filtro = `brightness(${Math.max(0.35, 1 - d * 0.16)})`;
    }
    c.style.transform = tf;
    c.style.opacity = String(op);
    c.style.filter = filtro;
    c.style.zIndex = String(100 - Math.abs(d));
    c.classList.toggle("frente", d === 0);
  });
}

/** Túnel automático da capa: uma camada vem para a frente a cada 2,8 s. */
function tunelAuto(tela: HTMLElement) {
  const tunel = tela.querySelector<HTMLElement>("[data-tunel=auto]");
  if (!tunel) return;
  const camadas = [...tunel.querySelectorAll<HTMLElement>(".camada")];
  const contador = tela.querySelector<HTMLElement>("[data-contador]");
  const n = camadas.length;
  let frente = 0;
  let timer: number | undefined;
  // ordem circular: a camada que passou volta para o fundo, sem atravessar a tela de trás para frente
  const ordem = () => camadas.map((_, k) => (k - frente + n) % n);
  const aplicar = () => {
    const dist = ordem();
    camadas.forEach((c, k) => {
      const d = dist[k];
      const { x, y } = espalhar(k);
      if (d === n - 1) {
        // acabou de passar: voa para a frente e some; depois vai para o fundo sem animação
        c.style.transform = `translate3d(${x * 1.8}px, ${y * 1.8}px, 900px)`;
        c.style.opacity = "0";
        window.setTimeout(() => {
          c.style.transition = "none";
          c.style.transform = `translate3d(${x}px, ${y}px, ${-(n - 1) * 760}px)`;
          void c.offsetWidth;
          c.style.transition = "";
          c.style.opacity = "0";
        }, 1400);
        return;
      }
      c.style.transform = d === 0 ? "translate3d(0,0,0)" : `translate3d(${x}px, ${y}px, ${-d * 760}px)`;
      c.style.opacity = d === 0 ? "1" : String(Math.max(0, 0.95 - d * 0.14));
      c.style.filter = d === 0 ? "" : `brightness(${Math.max(0.35, 1 - d * 0.16)})`;
      c.style.zIndex = String(100 - d);
    });
    if (contador) contador.textContent = String(frente + 1).padStart(2, "0");
  };
  posicionarTunel(camadas, 0);
  const parar = () => window.clearInterval(timer);
  const iniciar = () => {
    parar();
    if (reduz() || document.documentElement.classList.contains("estatico")) return;
    timer = window.setInterval(() => {
      frente = (frente + 1) % n;
      aplicar();
    }, 2800);
  };
  tela.addEventListener("passo", ((e: CustomEvent<DetalhePasso>) => {
    if (e.detail.entrou) iniciar();
  }) as EventListener);
  tela.addEventListener("saiu", parar);
}

/** Túnel por passos da linha do tempo (tela 06). */
function tunelPassos(tela: HTMLElement) {
  const tunel = tela.querySelector<HTMLElement>("[data-tunel=passos]");
  if (!tunel) return;
  const camadas = [...tunel.querySelectorAll<HTMLElement>(".camada")];
  const m = camadas.length;
  const moedas: number[] = JSON.parse(tela.querySelector("[data-moedas]")?.textContent || "[]");
  const contador = tela.querySelector<HTMLElement>("[data-contador-moeda] span");
  const pontos = [...tela.querySelectorAll<HTMLElement>(".faixas .pt")];
  const atualizar = (passo: number) => {
    // passo 0 = título; 1..m = camadas; m+1 = fecho
    const frente = passo === 0 ? -1 : passo > m ? m : passo - 1;
    posicionarTunel(camadas, frente);
    const idx = Math.max(0, Math.min(m - 1, frente));
    if (contador) contador.textContent = String(moedas[idx] ?? 1).padStart(2, "0");
    pontos.forEach((p) => {
      const k = Number(p.dataset.i);
      p.classList.toggle("ativo", k === frente);
      p.classList.toggle("passou", k < frente);
    });
  };
  tela.addEventListener("passo", ((e: CustomEvent<DetalhePasso>) => atualizar(e.detail.passo)) as EventListener);
  atualizar(0);
}

/**
 * Tela 06: câmera avançando pelos recortes (mecânica do hero de referência, medida com o /reanimate em
 * .reanimate/ref-substance/probe/probe.json):
 * - projeção em perspectiva sem inclinação: largura na tela = base × P / profundidade (a medida da
 *   referência cresce exatamente assim: 1/largura cai em linha reta com a rolagem);
 * - os do fundo acendem devagar (opacidade 0 → 1 enquanto ficam de ~12% a ~18% do tamanho de leitura);
 * - os que chegam perto continuam crescendo, passam pela borda, desfocam e somem (opacidade 1 → 0
 *   entre 1,15× e 1,9× o tamanho de leitura);
 * - cada recorte balança ±0,9° (a referência gira cada imagem nessa faixa);
 * - o nome gigante cresce 1 → 1,8 → 3,4, desfoca 0 → 9 → 20 px e some (mesmos valores da referência),
 *   com origem a 58% da altura.
 */
function tunelHero(tela: HTMLElement) {
  const raiz = tela.querySelector<HTMLElement>("[data-tunel-hero]");
  if (!raiz) return;
  const cartoes = [...raiz.querySelectorAll<HTMLElement>(".cartao")];
  const n = cartoes.length;
  const P = 1000; // distância focal: na profundidade P o recorte aparece no tamanho de leitura (escala 1)
  const D = 640; // distância entre um recorte e o seguinte
  const FUGA_Y = 0.44; // ponto de fuga (fração da altura)
  const moedas: number[] = JSON.parse(tela.querySelector("[data-moedas]")?.textContent || "[]");
  const contador = tela.querySelector<HTMLElement>("[data-contador-moeda] span");
  const blocos = [...tela.querySelectorAll<HTMLElement>(".h-bloco")];
  const gigante = tela.querySelector<HTMLElement>(".h-gigante");
  // deslocamento de cada recorte em relação ao ponto de fuga, na escala 1. Alterna os lados como a
  // referência e evita o canto inferior esquerdo (texto) e a base (nome gigante).
  const nuvem = [[560, -140], [-620, -300], [520, 190], [-480, -360], [680, -20], [-700, -260], [400, -330], [600, 170],
    [-560, -330], [700, -220], [-440, -380], [520, 150], [-660, -280], [620, -300], [-520, -340], [680, 90]];
  const pos = cartoes.map((c, i) => {
    const [x, y] = nuvem[i % nuvem.length];
    return { x, y, z: i * D, gira: 0.4 + (i % 4) * 0.13, fase: i * 1.7 };
  });
  const camadas = cartoes.map((c) => {
    const l = [".c0", ".c1", ".c2"].map((q) => c.querySelector<HTMLElement>(q));
    return l.every(Boolean) ? (l as HTMLElement[]) : null;
  });
  const nums = cartoes.map((c) => c.querySelector<HTMLElement>(".num"));
  // largura de leitura conforme o formato da imagem (paisagem, retrato, quadrada)
  cartoes.forEach((c) => {
    const img = c.querySelector("img");
    const r = img && img.width && img.height ? img.width / img.height : 0.8;
    c.style.width = `${(r > 1.2 ? 700 : r < 0.85 ? 460 : 560) * (c.classList.contains("recorte") ? 1.13 : 1)}px`; // recortes têm 200 px de margem transparente
  });

  // câmera: posição em que o recorte k (1..n) fica no tamanho de leitura
  // no passo k o recorte k fica a 80% do tamanho de leitura (inteiro na tela, já vindo para a borda)
  const camDe = (passo: number) => (passo === 0 ? -1350 : passo > n ? (n - 1) * D + 1500 : (passo - 1) * D - 250);
  let cam = camDe(0), de = cam, para = cam, t0 = 0, dur = 1;
  let raf = 0, rodando = false;
  const suave = (p: number) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2); // ease-in-out cúbico
  const faixa = (v: number, a: number, b: number) => Math.min(1, Math.max(0, (v - a) / (b - a)));

  // tamanho da tela e "reduzir movimento" ficam guardados: ler clientWidth a cada quadro, logo depois
  // de mexer nos estilos, obrigava o navegador a recalcular a página inteira 60 vezes por segundo
  let W = 0, H = 0, balanca = true;
  const medir = () => { W = tela.clientWidth; H = tela.clientHeight; balanca = !reduz(); };
  const desenhar = (agora: number) => {
    if (!W) medir();
    const fx = W / 2, fy = H * FUGA_Y;
    cartoes.forEach((c, i) => {
      const prof = pos[i].z - cam + P;
      const some = () => { if (c.style.visibility !== "hidden") { c.style.opacity = "0"; c.style.visibility = "hidden"; } };
      if (prof <= 40) { some(); return; }
      const s = P / prof;
      const op = Math.min(faixa(s, 0.12, 0.19), 1 - faixa(s, 1.15, 1.9));
      if (op <= 0.001) { some(); return; }
      const rot = balanca ? Math.sin(agora / 1000 * pos[i].gira + pos[i].fase) * 0.9 : 0;
      c.style.visibility = "visible";
      c.style.opacity = op.toFixed(3);
      c.style.transform = `translate3d(${(fx + pos[i].x * s).toFixed(1)}px, ${(fy + pos[i].y * s).toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(4)}) rotate(${rot.toFixed(2)}deg)`;
      // desfoque de lente: começa logo depois do tamanho de leitura e cresce rápido (até 34 px)
      const lente = Math.max(0, (s - 0.9) * 42);
      // bordas da tela: leve desfoque, como a borda de uma lente (o centro, onde se lê, fica nítido)
      const cx = (pos[i].x * s) / (W / 2), cy = (fy + pos[i].y * s - H / 2) / (H / 2);
      const borda = faixa(Math.hypot(cx, cy * 1.2), 0.62, 1.05);
      const desfoque = Math.min(34, lente + borda * 5);
      // desfoque + aberração cromática já vêm prontos em camadas (-b1 médio, -b2 forte, gerados por
      // scripts/gerar-recortes-papel.ts): aqui só muda a opacidade de cada camada, que a placa de vídeo
      // resolve sozinha. Nada de filtro calculado a cada quadro.
      const cam3 = camadas[i];
      if (cam3) {
        const [c0, c1, c2] = cam3;
        c0.style.opacity = (1 - faixa(desfoque, 0, 6)).toFixed(3);
        c1.style.opacity = (Math.min(faixa(desfoque, 0, 1.5), 1 - faixa(desfoque, 8, 22))).toFixed(3);
        c2.style.opacity = faixa(desfoque, 6, 9).toFixed(3);
        if (nums[i]) nums[i]!.style.opacity = (1 - faixa(desfoque, 0, 4)).toFixed(3); // o ano some junto com a nitidez
      } else c.style.filter = desfoque > 0.4 ? `blur(${desfoque.toFixed(1)}px)` : "";
      c.style.zIndex = String(Math.round(s * 100));
    });
    if (gigante) {
      // g conta passos: 0 no início, 1 no 1º recorte, 2 no 2º...
      const c1 = camDe(1), c0 = camDe(0);
      const g = cam <= c1 ? Math.max(0, (cam - c0) / (c1 - c0)) : 1 + (cam - c1) / D;
      const esc = 1 + 0.395 * g + 0.405 * g * g;
      const op = g <= 1 ? 1 - 0.06 * g : g <= 2 ? 0.94 - 0.7 * (g - 1) : Math.max(0, 0.24 - 0.6 * (g - 2));
      gigante.style.transform = `scale(${esc.toFixed(3)})`;
      gigante.style.filter = g > 0.02 ? `blur(${Math.min(24, 10 * g).toFixed(1)}px)` : "";
      gigante.style.opacity = op.toFixed(3);
    }
  };

  const laco = (agora: number) => {
    const p = Math.min(1, (agora - t0) / dur);
    cam = de + (para - de) * suave(p);
    desenhar(agora);
    if (rodando) raf = requestAnimationFrame(laco);
  };
  const iniciar = () => { if (!rodando) { rodando = true; raf = requestAnimationFrame(laco); } };
  const parar = () => { rodando = false; cancelAnimationFrame(raf); };

  const atualizar = (passo: number, entrou: boolean) => {
    if (entrou) medir();
    de = cam; para = camDe(passo); t0 = performance.now();
    // ao entrar na tela (ou pular direto), a câmera já começa no lugar; entre passos ela anda 1,6 s
    dur = entrou || reduz() ? 1 : passo > n ? 2400 : 1600;
    if (entrou || reduz()) { cam = de = para; }
    const ativo = passo === 0 ? -1 : passo <= n ? passo - 1 : -99;
    blocos.forEach((b) => b.classList.toggle("ativo", Number(b.dataset.bloco) === ativo));
    const idx = Math.max(0, Math.min(n - 1, passo - 1));
    if (contador) contador.textContent = String(moedas[idx] ?? 1).padStart(2, "0");
    tela.classList.toggle("no-fecho", passo > n);
    desenhar(performance.now());
    if (tela.classList.contains("atual")) iniciar();
  };
  tela.addEventListener("passo", ((e: CustomEvent<DetalhePasso>) => atualizar(e.detail.passo, e.detail.entrou)) as EventListener);
  tela.addEventListener("saiu", () => setTimeout(parar, 1300));
  addEventListener("resize", () => { medir(); desenhar(performance.now()); });
  atualizar(0, true);
  parar();
}

/**
 * Números crescentes (tela 07): cada algarismo é um rolo (odômetro) que gira de 0 até o valor,
 * depois que a tela termina de chegar. As casas da esquerda giram mais devagar, como num contador.
 */
function contagem(tela: HTMLElement) {
  const nums = [...tela.querySelectorAll<HTMLElement>("[data-contar]")];
  if (!nums.length) return;
  nums.forEach((n, k) => {
    const valor = n.dataset.contar!;
    n.setAttribute("aria-label", valor);
    n.classList.add("odo");
    n.innerHTML = [...valor].map((dig, c) => {
      if (!/\d/.test(dig)) return `<span class="odo-sep">${dig}</span>`;
      const voltas = valor.length - c; // casa mais à esquerda dá mais voltas
      const alvo = voltas * 10 + Number(dig);
      const fita = Array.from({ length: alvo + 1 }, (_, j) => `<b>${j % 10}</b>`).join("");
      return `<span class="odo-col" aria-hidden="true"><span class="odo-fita" style="--alvo:${alvo};--k:${k};--c:${c}">${fita}</span></span>`;
    }).join("");
  });
  tela.addEventListener("passo", ((e: CustomEvent<DetalhePasso>) => {
    if (e.detail.entrou) requestAnimationFrame(() => requestAnimationFrame(() => tela.classList.add("contou")));
  }) as EventListener);
  tela.addEventListener("saiu", () => setTimeout(() => tela.classList.remove("contou"), 1000));
}

/** Carrossel curvo em cilindro (tela 09): cada passo gira um card; aceita arrastar. */
function carrossel(tela: HTMLElement, indiceTela: number, ir: IrPara) {
  const cil = tela.querySelector<HTMLElement>("[data-cilindro]");
  if (!cil) return;
  const eixo = cil.querySelector<HTMLElement>(".eixo")!;
  const cards = [...cil.querySelectorAll<HTMLElement>(".card")];
  const itens = [...tela.querySelectorAll<HTMLElement>(".lista-dep li")];
  const PASSO = 34; // graus entre cards
  const RAIO = 980;
  cards.forEach((c, k) => (c.style.transform = `rotateY(${k * PASSO}deg) translateZ(${RAIO}px)`));
  let atual = 0;
  const girar = (idx: number, extra = 0) => {
    eixo.style.transform = `translateZ(${-RAIO}px) rotateY(${-idx * PASSO + extra}deg)`;
  };
  const marcar = (idx: number) => {
    atual = idx;
    girar(idx);
    cards.forEach((c, k) => c.classList.toggle("longe", k !== idx));
    itens.forEach((li, k) => li.classList.toggle("ativo", k === idx));
  };
  tela.addEventListener("passo", ((e: CustomEvent<DetalhePasso>) => marcar(e.detail.passo)) as EventListener);
  marcar(0);

  // arrastar
  let x0 = 0, arrastando = false, dx = 0;
  cil.addEventListener("pointerdown", (e) => {
    arrastando = true; x0 = e.clientX; dx = 0;
    cil.setPointerCapture(e.pointerId);
    cil.classList.add("arrastando");
  });
  cil.addEventListener("pointermove", (e) => {
    if (!arrastando) return;
    const escala = Number(getComputedStyle(document.getElementById("palco")!).getPropertyValue("--escala")) || 1;
    dx = (e.clientX - x0) / escala;
    girar(atual, dx * 0.06);
  });
  const soltar = () => {
    if (!arrastando) return;
    arrastando = false;
    cil.classList.remove("arrastando");
    const novo = Math.max(0, Math.min(cards.length - 1, Math.round(atual - (dx * 0.06) / PASSO)));
    if (novo !== atual) ir(indiceTela, novo);
    else girar(atual);
  };
  cil.addEventListener("pointerup", soltar);
  cil.addEventListener("pointercancel", soltar);
}

/** "CONTÁBIL EMPRESARIAL" ocupa toda a largura da base. */
async function ajustarNome(tela: HTMLElement) {
  const el = tela.querySelector<HTMLElement>("[data-ajustar-largura]");
  if (!el) return;
  await document.fonts.ready;
  const span = el.querySelector("span")!;
  const alvo = el.clientWidth;
  const atual = span.offsetWidth;
  if (atual > 0) el.style.fontSize = `${(parseFloat(getComputedStyle(el).fontSize) * alvo) / atual}px`;
}

/** Títulos entram palavra por palavra, saindo do desfoque. */
function prepararPalavras(tela: HTMLElement) {
  // títulos e também os textos maiores (apoio, destaques, números grandes, nomes de etapas e planos)
  const seletor = "h1.titulo, h2.titulo, .frase, .apoio, .destaque, .oferta, .apoio-final, .reforma .numero, .impacto .contraste .v, " +
    ".datas .item .data, .comoComecar .etapa h3, .preparacao li, .plano h3, .plano-valor, .numeros .r";
  const candidatos = [...tela.querySelectorAll<HTMLElement>(seletor)].filter((el) =>
    !el.closest(".realce, [data-contar], .lista-estatica, .h-bloco") && !el.querySelector(".realce, [data-contar]"));
  // não parte duas vezes um texto que está dentro de outro já escolhido
  const alvos = candidatos.filter((el) => !candidatos.some((o) => o !== el && o.contains(el)));
  alvos.forEach((el) => {
    let i = 0;
    // atraso de partida segue a ordem de entrada (.entra d2/d3/d4) e títulos andam mais devagar que textos
    const d = el.classList.contains("d4") ? 4 : el.classList.contains("d3") ? 3 : el.classList.contains("d2") ? 2 : 1;
    const titulo = el.matches("h1, h2, .frase");
    el.style.setProperty("--base", `${(titulo ? 0.35 : 0.55) + (d - 1) * 0.18}s`);
    el.style.setProperty("--ritmo", titulo ? "55ms" : "18ms");
    const partir = (no: Node) => {
      [...no.childNodes].forEach((filho) => {
        if (filho.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          (filho.textContent || "").split(/(\s+)/).forEach((pedaco) => {
            if (!pedaco) return;
            if (/^\s+$/.test(pedaco)) return frag.append(document.createTextNode(pedaco));
            const p = document.createElement("span");
            p.className = "palavra";
            const dentro = document.createElement("i");
            dentro.style.setProperty("--i", String(i++));
            dentro.textContent = pedaco;
            p.append(dentro);
            frag.append(p);
          });
          filho.replaceWith(frag);
        } else if (filho.nodeType === Node.ELEMENT_NODE) partir(filho);
      });
    };
    partir(el);
    el.classList.remove("entra");
    el.dataset.palavras = "1";
  });
  const atualizar = () => {
    const atual = tela.classList.contains("atual");
    alvos.forEach((el) => {
      const passo = el.closest<HTMLElement>("[data-passo]");
      el.classList.toggle("revelado", atual && (!passo || passo.classList.contains("on")));
    });
  };
  tela.addEventListener("passo", atualizar);
  tela.addEventListener("saiu", () => alvos.forEach((el) => el.classList.remove("revelado")));
}

/** Vídeos só tocam com a tela na frente (economiza bateria e processador). */
function controlarVideos(tela: HTMLElement) {
  const videos = [...tela.querySelectorAll<HTMLVideoElement>("video[data-video]")];
  if (!videos.length) return;
  tela.addEventListener("passo", (() => {
    if (reduz() || document.documentElement.classList.contains("estatico")) return;
    videos.forEach((v) => {
      // vídeo dentro de um passo (ex.: fecho da tela 06) só toca quando o passo aparece
      const passo = v.closest<HTMLElement>("[data-passo]");
      if (!passo || passo.classList.contains("on")) {
        if (v.paused) { v.preload = "auto"; v.play().catch(() => {}); }
      } else if (!v.paused) v.pause();
    });
  }) as EventListener);
  tela.addEventListener("saiu", () => videos.forEach((v) => v.pause()));
}

/** Destaque do passo atual (ex.: tela 13, a etapa da vez vira o cartão laranja que sobe). */
function destaquePorPasso(tela: HTMLElement) {
  const els = [...tela.querySelectorAll<HTMLElement>("[data-destaque]")];
  if (!els.length) return;
  const max = Math.max(...els.map((e) => Number(e.dataset.destaque)));
  tela.addEventListener("passo", ((e: CustomEvent<DetalhePasso>) => {
    const alvo = Math.min(e.detail.passo, max);
    els.forEach((el) => el.classList.toggle("destaque", Number(el.dataset.destaque) === alvo));
  }) as EventListener);
}

/** Visor da capa: timecode correndo enquanto a tela está na frente. */
function timecode(tela: HTMLElement) {
  const el = tela.querySelector<HTMLElement>("[data-timecode]");
  if (!el) return;
  let inicio = 0, raf = 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  const quadro = (t: number) => {
    const s = (t - inicio) / 1000;
    el.textContent = `00:${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}:${pad(Math.floor((s % 1) * 24))}`;
    raf = requestAnimationFrame(quadro);
  };
  tela.addEventListener("passo", ((e: CustomEvent<DetalhePasso>) => {
    if (!e.detail.entrou) return;
    cancelAnimationFrame(raf);
    inicio = performance.now();
    if (!reduz()) raf = requestAnimationFrame(quadro);
  }) as EventListener);
  tela.addEventListener("saiu", () => cancelAnimationFrame(raf));
}

/** Chave dos valores que o Pedro salva em /apresentacao/configurar (só naquele aparelho). */
export const CHAVE_VALORES = "contabil-apresentacao-valores";

/**
 * Tela de investimento: aplica os valores salvos e controla o preço riscado.
 * Estados: 0 = preço normal; 1 = riscado (linha vermelha); 2 = valor com desconto, anterior pequeno e riscado.
 * Arrastar sobre o preço desenha o risco seguindo o dedo; tocar no preço riscado mostra o desconto;
 * tocar de novo volta ao normal. Tecla R faz o mesmo (para o passador/teclado).
 */
function investimento(tela: HTMLElement) {
  const cartao = tela.querySelector<HTMLElement>("[data-investimento]");
  const preco = tela.querySelector<HTMLElement>("[data-preco]");
  if (!cartao || !preco) return;
  const padrao = JSON.parse(tela.querySelector("[data-investimento-padrao]")?.textContent || "{}");
  const numero = preco.querySelector<HTMLElement>(".inv-numero")!;
  let v = { ...padrao };
  let estado = 0;

  const campo = (nome: string, texto: string) => tela.querySelectorAll<HTMLElement>(`[data-campo="${nome}"]`).forEach((el) => (el.textContent = texto));
  const aplicar = () => {
    try { v = { ...padrao, ...JSON.parse(localStorage.getItem(CHAVE_VALORES) || "{}") }; } catch { v = { ...padrao }; }
    campo("nome", v.nome); campo("descricao", v.descricao); campo("periodo", v.periodo || "");
    mostrar(estado, false);
  };
  const mostrar = (novo: number, animar = true) => {
    if (novo === 2 && !String(v.desconto || "").trim()) novo = 1; // sem desconto cadastrado: fica só riscado
    estado = novo;
    preco.classList.toggle("riscado", estado >= 1);
    preco.classList.toggle("com-desconto", estado === 2);
    preco.classList.toggle("sem-animacao", !animar);
    preco.style.setProperty("--risco", estado >= 1 ? "1" : "0");
    campo("valor", estado === 2 ? v.desconto : v.valor);
    campo("valor-anterior", v.valor);
    if (estado === 2) { numero.classList.remove("trocou"); void numero.offsetWidth; numero.classList.add("trocou"); }
  };

  // arrastar para riscar
  let x0 = 0, arrastando = false, moveu = false;
  const fracao = (x: number) => { const r = numero.getBoundingClientRect(); return Math.max(0, Math.min(1, (x - r.left) / r.width)); };
  preco.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    arrastando = true; moveu = false; x0 = e.clientX;
    preco.setPointerCapture(e.pointerId);
  });
  preco.addEventListener("pointermove", (e) => {
    if (!arrastando || estado !== 0) return;
    if (Math.abs(e.clientX - x0) > 8) moveu = true;
    if (moveu) { preco.classList.add("arrastando"); preco.style.setProperty("--risco", fracao(e.clientX).toFixed(3)); }
  });
  const soltar = (e: PointerEvent) => {
    if (!arrastando) return;
    arrastando = false; preco.classList.remove("arrastando");
    e.stopPropagation();
    if (estado === 0 && moveu) mostrar(Number(preco.style.getPropertyValue("--risco")) > 0.45 ? 1 : 0);
    else if (!moveu) mostrar(estado === 0 ? 0 : estado === 1 ? 2 : 0);
  };
  preco.addEventListener("pointerup", soltar);
  preco.addEventListener("pointercancel", () => { arrastando = false; preco.classList.remove("arrastando"); mostrar(estado); });
  addEventListener("keydown", (e) => {
    if (!tela.classList.contains("atual") || e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.key === "r" || e.key === "R") mostrar(estado === 0 ? 1 : estado === 1 ? 2 : 0);
  });

  tela.addEventListener("saiu", () => setTimeout(() => mostrar(0, false), 1200));
  addEventListener("storage", (e) => e.key === CHAVE_VALORES && aplicar());
  if ("BroadcastChannel" in window) new BroadcastChannel("contabil-apresentacao").addEventListener("message", (e) => e.data?.tipo === "valores" && aplicar());
  aplicar();
}

export function iniciarEfeitos(telas: HTMLElement[], ir: IrPara) {
  telas.forEach((t, k) => {
    investimento(t);
    destaquePorPasso(t);
    timecode(t);
    prepararPalavras(t);
    controlarVideos(t);
    tunelAuto(t);
    tunelPassos(t);
    tunelHero(t);
    contagem(t);
    carrossel(t, k, ir);
    ajustarNome(t);
  });
}
