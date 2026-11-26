// Ajudantes do feed de notícias do site novo (/novo/noticias e /novo/noticia).

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** "há 3 h", "há 2 dias" ou a data */
export function quando(iso: string) {
  const d = new Date(iso), seg = (Date.now() - d.getTime()) / 1000;
  if (seg < 3600) return `há ${Math.max(1, Math.round(seg / 60))} min`;
  if (seg < 86400) return `há ${Math.round(seg / 3600)} h`;
  if (seg < 7 * 86400) return `há ${Math.round(seg / 86400)} dia${seg < 2 * 86400 ? "" : "s"}`;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

/** Foto da notícia (só quando a fonte oficial publicou uma), com o crédito. Sem foto: nada (o cartão fica só com texto).
 *  Se a foto não carregar, o bloco some e o cartão volta a ser só texto. */
export function fotoNoticia(n: { imagem?: string; credito?: string }, grande = false): string {
  if (!n.imagem || !/^https:\/\//.test(n.imagem)) return "";
  return `<figure class="nt-foto"><img src="${esc(n.imagem)}" alt="" loading="${grande ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer"
    onerror="var a=this.closest('article');if(a)a.classList.remove('com-foto','destaque');this.parentElement.remove()" />
    ${n.credito ? `<figcaption>Foto: ${esc(n.credito)}</figcaption>` : ""}</figure>`;
}
