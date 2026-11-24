// Capa de cada notícia: a foto da fonte oficial (com crédito) ou, se não houver, uma capa da Contábil por tema.
// A capa por tema fica sempre por baixo: se a foto não carregar, ela aparece sozinha.

const icones: Record<string, string> = {
  "Reforma Tributária": '<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/>',
  "Imposto de Renda": '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6M9 17h6"/>',
  "Simples e MEI": '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M9 20v-6h6v6"/>',
  Trabalhista: '<circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.85"/>',
  Fiscal: '<path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z"/><path d="M8 8h8M8 12h8M8 16h5"/>',
  "Receita Federal": '<path d="M3 21h18M5 21V9M19 21V9M9 21V9M15 21V9"/><path d="M2 9l10-6 10 6"/>',
  Contabilidade: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h4"/>',
};

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function capaNoticia(n: { tema: string; imagem?: string; credito?: string; titulo: string }, grande = false): string {
  const icone = icones[n.tema] || icones.Contabilidade;
  const foto = n.imagem && /^https:\/\//.test(n.imagem)
    ? `<img src="${esc(n.imagem)}" alt="" loading="${grande ? "eager" : "lazy"}" decoding="async" referrerpolicy="no-referrer"
         class="absolute inset-0 h-full w-full object-cover" onerror="this.parentElement.classList.add('sem-foto');this.remove()" />
       <span class="capa-credito">Foto: ${esc(n.credito || "")}</span>`
    : "";
  return `<div class="capa-noticia" data-tema="${esc(n.tema)}" aria-hidden="true">
      <div class="capa-tema">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icone}</svg>
        <span>${esc(n.tema)}</span>
      </div>
      ${foto}
    </div>`;
}
