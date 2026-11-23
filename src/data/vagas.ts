// Vagas da página /trabalheconosco. No original elas vêm do banco (tabela job_openings).
// Em 23/11/2026 havia 3 vagas ativas, copiadas abaixo. Para remover todas, deixe a lista vazia: [].

export type Vaga = {
  titulo: string;
  local: string;
  requisitos?: string;
  descricao: string;
};

export const vagas: Vaga[] = [
  {
    titulo: "Analista Fiscal",
    local: "Goiânia - GO",
    requisitos: "Ensino Superior completo ou em andamento em Ciências Contábeis; Experiência na função.",
    descricao: "Apuração; Escrituração fiscal; Análise de documentação.",
  },
  {
    titulo: "Analista Fiscal",
    local: "Uberlândia - MG",
    requisitos: "Ensino Superior completo ou em andamento em Ciências Contábeis; Experiência na função.",
    descricao: "Apuração; Escrituração fiscal; Análise de documentação.",
  },
  {
    titulo: "Auxiliar de Atendimento",
    local: "Itumbiara - GO",
    requisitos: "Organização e atenção aos detalhes; Experiência prévia em atendimento ao cliente (diferencial).",
    descricao:
      "Atendimento ao cliente via telefone e WhatsApp; Facilidade para trabalhar em equipe; Agilidade na resolução de demandas.",
  },
];

export const trabalheConosco = {
  titulo: "Trabalhe",
  destaque: "Conosco",
  subtitulo: "Faça parte do nosso time! Confira as vagas em aberto e candidate-se.",
  estadosCivis: ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)"],
};
