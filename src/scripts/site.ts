// Interatividade do site em JS puro (equivalente ao comportamento do original em React).

import { icons } from "../data/icons";

const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel as any)) as T[];

// ---------- Tema claro/escuro (a escolha fica salva e vale ao recarregar) ----------
$$("[data-theme-toggle]").forEach((btn) =>
  btn.addEventListener("click", () => {
    const dark = document.documentElement.classList.toggle("dark");
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {}
  }),
);

// ---------- Menu mobile ----------
const menuBtn = document.querySelector<HTMLButtonElement>("[data-menu-toggle]");
const menu = document.querySelector<HTMLElement>("[data-mobile-menu]");
const setMenu = (open: boolean) => {
  if (!menuBtn || !menu) return;
  menu.classList.toggle("hidden", !open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.querySelector("[data-menu-icon=closed]")?.classList.toggle("hidden", open);
  menuBtn.querySelector("[data-menu-icon=open]")?.classList.toggle("hidden", !open);
};
menuBtn?.addEventListener("click", () => setMenu(menu?.classList.contains("hidden") ?? false));
$$("[data-mobile-link]").forEach((a) => a.addEventListener("click", () => setMenu(false)));

// ---------- Brilho do hero que segue o mouse ----------
const hero = document.querySelector<HTMLElement>("[data-hero]");
const glow = document.querySelector<HTMLElement>("[data-hero-glow]");
if (hero && glow) {
  hero.addEventListener("mousemove", (e) => {
    const r = hero.getBoundingClientRect();
    glow.style.opacity = "1";
    glow.style.background = `radial-gradient(600px circle at ${e.clientX - r.left}px ${e.clientY - r.top}px, hsl(24 100% 50% / 0.12), transparent 70%)`;
  });
  hero.addEventListener("mouseleave", () => (glow.style.opacity = "0"));
}

// ---------- Depoimentos (carrossel com setas) ----------
const dep = document.querySelector<HTMLElement>("[data-depoimentos]");
if (dep) {
  const lista: { nome: string; cargo: string; texto: string }[] = JSON.parse(dep.dataset.depoimentos || "[]");
  let i = 0;
  const show = () => {
    const d = lista[i];
    dep.querySelector("[data-dep-texto]")!.textContent = `"${d.texto}"`;
    dep.querySelector("[data-dep-nome]")!.textContent = d.nome;
    dep.querySelector("[data-dep-cargo]")!.textContent = d.cargo;
  };
  dep.querySelector("[data-dep-prev]")?.addEventListener("click", () => {
    i = i === 0 ? lista.length - 1 : i - 1;
    show();
  });
  dep.querySelector("[data-dep-next]")?.addEventListener("click", () => {
    i = i === lista.length - 1 ? 0 : i + 1;
    show();
  });
}

// ---------- Acordeões (single + collapsible, animação de altura 200ms) ----------
const setState = (el: Element, state: "open" | "closed") => el.setAttribute("data-state", state);

function closeItem(item: HTMLElement) {
  const trigger = item.querySelector<HTMLButtonElement>("[data-acc-trigger]")!;
  const content = item.querySelector<HTMLElement>("[data-acc-content]")!;
  if (item.dataset.state !== "open") return;
  content.style.setProperty("--radix-accordion-content-height", `${content.getBoundingClientRect().height}px`);
  [item, item.querySelector("h3")!, trigger, content].forEach((el) => setState(el, "closed"));
  trigger.setAttribute("aria-expanded", "false");
  const done = () => {
    if (item.dataset.state === "closed") content.hidden = true;
  };
  content.addEventListener("animationend", done, { once: true });
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) done();
}

function openItem(item: HTMLElement) {
  const trigger = item.querySelector<HTMLButtonElement>("[data-acc-trigger]")!;
  const content = item.querySelector<HTMLElement>("[data-acc-content]")!;
  content.hidden = false;
  // mede a altura sem animação, como o Radix faz
  const anim = content.style.animationName;
  content.style.animationName = "none";
  content.style.setProperty("--radix-accordion-content-height", `${content.scrollHeight}px`);
  content.style.setProperty("--radix-accordion-content-width", `${content.scrollWidth}px`);
  void content.offsetHeight;
  content.style.animationName = anim;
  [item, item.querySelector("h3")!, trigger, content].forEach((el) => setState(el, "open"));
  trigger.setAttribute("aria-expanded", "true");
}

$$("[data-accordion]").forEach((acc) => {
  $$<HTMLButtonElement>("[data-acc-trigger]", acc).forEach((trigger) =>
    trigger.addEventListener("click", () => {
      const item = trigger.closest<HTMLElement>("[data-acc-item]")!;
      const wasOpen = item.dataset.state === "open";
      $$<HTMLElement>("[data-acc-item]", acc).forEach((other) => other !== item && closeItem(other));
      wasOpen ? closeItem(item) : openItem(item);
    }),
  );
});

// ---------- Toast (mesmo visual do Toaster shadcn do original; 1 por vez, some em 5s) ----------
const viewport = document.querySelector<HTMLOListElement>("[data-toast-viewport]");
let toastTimer: number | undefined;

function toast(title: string, destructive = false) {
  if (!viewport) return;
  viewport.innerHTML = "";
  const variant = destructive
    ? "destructive group border-destructive bg-destructive text-destructive-foreground"
    : "border bg-background text-foreground";
  const li = document.createElement("li");
  li.setAttribute("role", "status");
  li.setAttribute("aria-live", "off");
  li.setAttribute("data-state", "open");
  li.tabIndex = 0;
  li.style.userSelect = "none";
  li.style.touchAction = "none";
  li.className =
    "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full " +
    variant;
  li.innerHTML = `<div class="grid gap-1"><div class="text-sm font-semibold"></div></div><button type="button" class="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 group-[.destructive]:text-red-300 hover:text-foreground group-[.destructive]:hover:text-red-50 focus:opacity-100 focus:outline-none focus:ring-2 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600" toast-close=""><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x h-4 w-4">${icons.X}</svg></button>`;
  li.querySelector(".text-sm")!.textContent = title;
  viewport.parentElement!.style.pointerEvents = "";
  viewport.appendChild(li);

  const dismiss = () => {
    li.setAttribute("data-state", "closed");
    li.addEventListener("animationend", () => li.remove(), { once: true });
  };
  li.querySelector("[toast-close]")!.addEventListener("click", dismiss);
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(dismiss, 5000);
}

// ---------- Trabalhe Conosco ----------
const form = document.querySelector<HTMLFormElement>("[data-form-candidatura]");
if (form) {
  const wrap = document.querySelector<HTMLElement>("[data-form-wrap]");
  $$("[data-ir-form]").forEach((b) => b.addEventListener("click", () => wrap?.scrollIntoView({ behavior: "smooth" })));

  const cv = form.querySelector<HTMLInputElement>("#cv")!;
  const cvNome = form.querySelector<HTMLElement>("[data-cv-nome]")!;
  cv.addEventListener("change", () => (cvNome.textContent = cv.files?.[0]?.name || "Escolher arquivo"));

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = (form.elements.namedItem("name") as HTMLInputElement).value;
    const city = (form.elements.namedItem("city") as HTMLInputElement).value;
    const marital = (form.elements.namedItem("maritalStatus") as HTMLSelectElement).value;
    if (!name || !city || !marital) {
      toast("Preencha todos os campos obrigatórios.", true);
      return;
    }
    const subject = encodeURIComponent("Candidatura - Trabalhe Conosco");
    const body = encodeURIComponent(`Nome: ${name}\nCidade: ${city}\nEstado Civil: ${marital}\n\nCurrículo em anexo.`);
    window.open(`mailto:${form.dataset.email}?subject=${subject}&body=${body}`, "_blank");
    toast("Redirecionando para o envio do e-mail!");
    form.reset();
    cvNome.textContent = "Escolher arquivo";
  });
}
