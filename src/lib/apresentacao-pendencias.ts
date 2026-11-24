// Lista tudo o que impede a apresentação de ir ao ar.
// Usado por `npm run checar-apresentacao` e pelo build (astro.config.mjs).
import * as dados from "../data/apresentacao.ts";

export type Pendencia = { tipo: string; onde: string; detalhe: string; bloqueia: boolean };

const ROTULOS: Record<string, string> = {
  validado: "Validar com a equipe",
  conferido: "Conferir data na fonte oficial",
  destaqueValidado: "Validar a conta do destaque (expediente de 8 h?)",
  etapasValidadas: "Validar as etapas com o comercial",
  autorizacaoImagem: "Autorização de uso de imagem dos gestores",
};

export function coletarPendencias(hoje = new Date()): Pendencia[] {
  const out: Pendencia[] = [];

  const visitar = (v: any, onde: string, chave = "") => {
    if (v === null || v === undefined) return;
    if (typeof v === "string") {
      for (const m of v.matchAll(/\[[^\]]+\]/g)) {
        out.push({ tipo: "Colchete", onde, detalhe: m[0], bloqueia: true });
      }
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((x, i) => visitar(x, `${onde}[${i}]`));
      return;
    }
    if (typeof v === "object") {
      if (v.ativo === false) return; // desligado: não vai ao ar
      for (const [k, x] of Object.entries(v)) {
        const aqui = `${onde}.${k}`;
        if (x === false && k in ROTULOS) out.push({ tipo: ROTULOS[k], onde, detalhe: describe(v), bloqueia: true });
        if (k === "arquivo" && x === null && !v.video && !v.ficha) out.push({ tipo: "Foto faltando", onde, detalhe: v.descricao ?? "", bloqueia: true });
        if (k === "arquivo" && x === null && v.ficha) out.push({ tipo: "Imagem do DOU opcional (hoje aparece a ficha do ato)", onde, detalhe: v.descricao ?? "", bloqueia: false });
        if (k === "foto" && x === null) out.push({ tipo: "Foto faltando", onde, detalhe: `${v.setor ?? v.nome ?? ""}`, bloqueia: true });
        if (k === "logo" && x === null) out.push({ tipo: "Logo opcional", onde, detalhe: v.nome ?? "", bloqueia: false });
        if (k === "descricao" || k === "icone" || k === "aPartirDe" || k === "ficha") continue;
        visitar(x, aqui, k);
      }
    }
    void chave;
  };

  for (const chave of dados.ordem) {
    const t: any = dados.telas[chave];
    if (!t.ativo) continue;
    visitar(t, `telas.${chave}`);
  }
  visitar(dados.geral, "geral");

  if (!dados.geral.whatsapp.comercialDefinido) {
    out.push({ tipo: "WhatsApp comercial", onde: "geral.whatsapp", detalhe: "Número do Pedro a definir; usando o geral (64) 3431-6397", bloqueia: false });
  }

  const d = hoje.toISOString().slice(0, 10);
  for (const r of dados.revisoes) {
    if (!r.feita && r.aPartirDe <= d) {
      out.push({ tipo: "Revisão de texto vencida", onde: `tela ${r.tela}`, detalhe: r.oQue, bloqueia: true });
    }
  }
  return out;
}

function describe(v: any): string {
  return String(v.texto ?? v.titulo ?? v.regime ?? v.destaque ?? v.nome ?? "").slice(0, 90);
}

export function resumoPendencias(lista: Pendencia[]): string {
  const bloq = lista.filter((p) => p.bloqueia);
  const linhas = [`Apresentação: ${bloq.length} pendência(s) que impedem a publicação, ${lista.length - bloq.length} aviso(s).`];
  const grupos = new Map<string, Pendencia[]>();
  for (const p of lista) grupos.set(p.tipo, [...(grupos.get(p.tipo) ?? []), p]);
  for (const [tipo, ps] of grupos) {
    linhas.push(`\n${ps[0].bloqueia ? "✗" : "!"} ${tipo} (${ps.length})`);
    for (const p of ps) linhas.push(`   - ${p.onde}: ${p.detalhe}`);
  }
  return linhas.join("\n");
}
