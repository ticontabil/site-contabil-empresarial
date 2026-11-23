// Dados gerais do site: meta tags, menu, links de WhatsApp e contatos.
// Textos copiados do site publicado em 23/11/2026 (inclusive os erros: ver PENDENCIAS.md).

export const meta = {
  title: "Contabil Empresárial",
  description: "Contábil Empresárial",
  ogTitle: "Contabil Empresárial",
  ogDescription: "Contábil Empresárial",
  ogImage: "/og-image.png",
  twitterSite: "@Lovable",
  lang: "en",
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
  { label: "Serviços", href: "#servicos" },
  { label: "Sobre Nós", href: "#sobre" },
  { label: "Trabalhe Conosco", href: "/trabalheconosco" },
  { label: "Área do Cliente", href: "#cliente" },
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
  enderecos: [
    "R. Rui de Almeida, 180 - St. Central, Itumbiara - GO",
    "Av. Cesário Alvim, 1135 - Centro, Uberlândia - MG",
    "Av. T-63, 1296, Sala 110, Setor Bueno, Goiânia - GO",
  ],
};

export const rodape = {
  slogan: "Contabilidade inteligente para empresas que querem crescer. Desde 1984.",
  copyright: "© 2026 Contábil Empresarial. Todos os direitos reservados.",
  credito: "Agência Abelha",
};
