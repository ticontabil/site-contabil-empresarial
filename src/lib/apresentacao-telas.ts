// Lista das telas ativas, com número, ato, quantidade de passos e fala.
// Usado pela apresentação, pelo modo apresentador e pelo checador — assim a contagem é a mesma em todo lugar.
import { telas, ordem, atos, type ChaveTela } from "../data/apresentacao.ts";

export type TelaAtiva = {
  chave: ChaveTela;
  numero: number; // posição entre as telas ativas (1, 2, 3...)
  rotuloNumero: string; // "06"
  ato: string; // "(ATO 01)"
  titulo: string; // para leitores de tela e modo apresentador
  passos: number; // passos internos depois da entrada (0 = nenhum)
  fala: string;
};

const ativos = <T extends { ativo?: boolean }>(lista: T[]) => lista.filter((x) => x.ativo !== false);

function passosDe(chave: ChaveTela): number {
  switch (chave) {
    case "capa": return 0;
    case "reforma": return telas.reforma.tela.dados.length + 1; // + linha do tempo
    case "datas": return telas.datas.tela.jaMudou.length + telas.datas.tela.emDisputa.length;
    case "impacto": return telas.impacto.tela.blocos.length;
    case "virada": return 1;
    case "historia": return ativos(telas.historia.marcos).length + 1; // camadas + fecho
    case "numeros": return 1; // destaque
    case "time": return 1; // faixa das gestoras
    case "departamentos": return Math.max(0, ativos(telas.departamentos.tela.itens).length - 1);
    case "preparacao": return ativos(telas.preparacao.tela.itens).length + (telas.preparacao.tela.prova.ativo ? 1 : 0);
    case "parceiros": return telas.parceiros.tela.grupos.length;
    case "resultados": return 0;
    case "comoComecar": return telas.comoComecar.tela.etapas.length + 1; // + apoio
    case "investimento": return 0;
    case "proximoPasso": return 0;
    case "quemSomos": return 0;
    case "missao": return 1; // valores
    case "observacoes": return 0;
    case "obrigado": return 0;
  }
}

function tituloDe(chave: ChaveTela): string {
  const t: any = telas[chave].tela;
  if (chave === "capa") return t.titulo;
  if (chave === "virada") return t.frase;
  if (t.tituloForte) return `${t.tituloForte} ${t.tituloLeve}`;
  return t.titulo;
}

export function telasAtivas(): TelaAtiva[] {
  const lista = ordem.filter((c) => telas[c].ativo);
  return lista.map((chave, i) => ({
    chave,
    numero: i + 1,
    rotuloNumero: String(i + 1).padStart(2, "0"),
    ato: atos[telas[chave].ato as keyof typeof atos],
    titulo: tituloDe(chave),
    passos: passosDe(chave),
    fala: telas[chave].fala,
  }));
}

export { ativos };
