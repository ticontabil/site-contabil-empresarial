// Dados gerais do site: meta tags, menu, links de WhatsApp e contatos.
// Textos copiados do site publicado em 23/11/2026 (inclusive os erros: ver PENDENCIAS.md).

export const meta = {
  // SEO (revisado em 24/11/2026): títulos e descrições escritos para busca, em português.
  title: "Contábil Empresarial | Contabilidade em Itumbiara, Goiânia e Uberlândia",
  description:
    "Escritório de contabilidade desde 1984: abertura de empresas, contabilidade, departamento pessoal, fiscal, planejamento tributário e BPO financeiro em Itumbiara, Goiânia e Uberlândia.",
  ogTitle: "Contábil Empresarial · Contabilidade para empresas que querem crescer",
  ogDescription:
    "Desde 1984 ao lado do empresário. Abertura de empresas, contabilidade, folha, fiscal e consultoria em Itumbiara (GO), Goiânia (GO) e Uberlândia (MG).",
  ogImage: "/og-image.png",
  siteName: "Contábil Empresarial",
  lang: "pt-BR",
  locale: "pt_BR",
  instagram: "https://www.instagram.com/contabilempresarial/",
};

/** Título e descrição de cada página (a home usa `meta`). */
export const paginas = {
  trabalheconosco: {
    title: "Trabalhe Conosco | Contábil Empresarial",
    description: "Vagas na Contábil Empresarial em Itumbiara, Goiânia e Uberlândia. Envie seu currículo e faça parte de um time de contabilidade desde 1984.",
  },
  noticias: {
    title: "Notícias de Contabilidade e Impostos | Contábil Empresarial",
    description: "Novidades da Receita Federal, Reforma Tributária, Simples Nacional, eSocial e obrigações fiscais, reunidas de fontes oficiais e confiáveis, com link para a matéria original.",
  },
};

const WA = "https://wa.me/556434316397";

export const whatsapp = {
  numero: WA,
  especialista: `${WA}?text=Ol%C3%A1%2C%20gostaria%20de%20falar%20com%20um%20especialista%20da%20Cont%C3%A1bil%20Empresarial.%20Podem%20me%20ajudar%3F%20%F0%9F%98%8A`,
  abraEmpresa: `${WA}?text=Ol%C3%A1%21%20Quero%20abrir%20minha%20empresa%20com%20a%20Cont%C3%A1bil%20Empresarial.%20Podem%20me%20orientar%3F%20%F0%9F%8F%A2`,
  trocarContador: `${WA}?text=Ol%C3%A1%21%20Estou%20pensando%20em%20trocar%20de%20contador.%20Podem%20me%20mostrar%20como%20a%20Cont%C3%A1bil%20Empresarial%20pode%20ajudar%3F%20%F0%9F%94%84`,
  flutuante: `${WA}?text=Oi%2C%20vi%20o%20site%20de%20voc%C3%AAs%20e%20quero%20saber%20mais%20sobre%20os%20servi%C3%A7os%20cont%C3%A1beis.%20%F0%9F%9A%80`,
};

export const menu = [
  { label: "Serviços", href: "/#servicos" },
  { label: "Sobre Nós", href: "/#sobre" },
  { label: "Notícias", href: "/noticias" },
  { label: "Trabalhe Conosco", href: "/trabalheconosco" },
  { label: "Área do Cliente", href: "/#cliente" },
];

export const hero = {
  tituloAntes: "Contabilidade para Empresas que Querem",
  tituloDestaque: "Crescer",
  subtitulo:
    "Deixe a burocracia com a gente. Atendimento humanizado, tecnologia de ponta e soluções contábeis que impulsionam o seu negócio.",
  botaoPrincipal: "Abra sua Empresa",
  botaoSecundario: "Trocar de Contador",
  foto: "/josiney.png",
  fotoAlt: "Josiney - Fundador da Contábil Empresarial",
};

export const contato = {
  telefone: "(64) 3431-6397 (WhatsApp)",
  telefoneLink: WA,
  email: "atendimento@contabilempresarial.com.br",
  emailRH: "rh@contabilempresarial.com.br",
  razaoSocial: "CONTABIL EMPRESARIAL ITUMBIARA LTDA",
  cnpj: "44.769.929/0001-55",
  crc: "CRC-GO 003839/O-7", // registro da empresa no Conselho Regional de Contabilidade de Goiás (confirmado pela Contábil em 24/11/2026)
  enderecos: [
    "R. Rui de Almeida, 180 - St. Central, Itumbiara - GO",
    "Av. Cesário Alvim, 1135 - Centro, Uberlândia - MG",
    "Av. T-63, 1296, Sala 110, Setor Bueno, Goiânia - GO",
    "R. Osmar José García, 830, Cachoeira Dourada - GO",
  ],
};

export const rodape = {
  slogan: "Contabilidade inteligente para empresas que querem crescer. Desde 1984.",
  copyright: "© 2026 Contábil Empresarial. Todos os direitos reservados.",
  credito: "equipe Contábil Empresarial", // o site passou a ser mantido pela própria Contábil (24/11/2026)
};

/**
 * Medição. IDs públicos (não são senha). Vazio = desligado.
 * Google Analytics e Pixel só carregam depois que o visitante aceita os cookies (aviso LGPD).
 * O painel próprio (/painel) conta as visitas sem cookies e não depende destes IDs.
 */
export const medicao = {
  ga4: "G-QG0X1YQZVC", // Google Analytics 4 · propriedade "Site Contábil Empresarial" (criada em 24/11/2026)
  googleAds: "", // ID de conversão do Google Ads (AW-XXXXXXXXX), se houver
  googleAdsRotuloWhatsapp: "", // rótulo da conversão "clique no WhatsApp" (AW-XXX/rotulo)
  pixelMeta: "2144755192792318", // Pixel "Site Contábil Empresarial" (Conjuntos de dados > Configurações > Identificação do pixel). 8122980081146757 é a conta da empresa, não o pixel
};
