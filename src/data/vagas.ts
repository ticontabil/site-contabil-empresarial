// Vagas da página /trabalheconosco. No original elas vêm do banco (tabela job_openings).
// Em 23/11/2026 havia 3 vagas ativas, copiadas abaixo. Para mostrar uma vaga no site, mude `ativa` para true.
// Sem nenhuma vaga ativa, a página mostra o convite para o banco de talentos (24/11/2026: sem vagas abertas).

export type Vaga = {
  ativa: boolean;
  titulo: string;
  local: string;
  requisitos?: string;
  descricao: string;
};

export const vagas: Vaga[] = [
  {
    ativa: false,
    titulo: "Analista Fiscal",
    local: "Goiânia - GO",
    requisitos: "Ensino Superior completo ou em andamento em Ciências Contábeis; Experiência na função.",
    descricao: "Apuração; Escrituração fiscal; Análise de documentação.",
  },
  {
    ativa: false,
    titulo: "Analista Fiscal",
    local: "Uberlândia - MG",
    requisitos: "Ensino Superior completo ou em andamento em Ciências Contábeis; Experiência na função.",
    descricao: "Apuração; Escrituração fiscal; Análise de documentação.",
  },
  {
    ativa: false,
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
  // quando não há vaga ativa
  subtituloSemVagas: "Faça parte do nosso time! No momento não temos vagas abertas, mas você pode enviar seu currículo para o nosso banco de talentos.",
  estadosCivis: ["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)"],
};
