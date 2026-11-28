// ============================================================================
// Conteúdo da apresentação comercial (/apresentacao).
// Fonte: ROTEIRO-apresentacao.md (copiado em 23/11/2026).
//
// COMO EDITAR
// - "tela"  = texto que aparece para o cliente.
// - "fala"  = notas do apresentador. Só aparecem no modo apresentador, nunca na tela do cliente.
// - [colchetes] = dado a confirmar com a Contábil. Aparecem com contorno laranja em ?rascunho=1
//   e impedem a publicação enquanto existirem (npm run checar-apresentacao lista todos).
// - ativo: false  = tela ou item desligado (não aparece e não conta no total de telas).
// - validado: false = item que ainda precisa de validação interna (também impede a publicação).
// - foto: null     = foto ainda não recebida; aparece um retângulo cinza marcado "FOTO — ...".
// ============================================================================

/** Liga a apresentação no site publicado.
 *  - false: o build de produção gera só uma página "em preparação".
 *  - "restrito": publica atrás da senha do servidor (public/apresentacao-portao.php). Os trechos entre
 *    colchetes somem da tela; as outras pendências ficam só como aviso. Decisão do Hiago em 24/11/2026.
 *  - true: publica aberta; o build FALHA se houver qualquer pendência. */
export const publicar: boolean | "restrito" = "restrito";

export const geral = {
  titulo: "Apresentação Comercial · Contábil Empresarial",
  slogan: "Tradição que se traduz em resultados.",
  fundacao: 1984,
  // WhatsApp do botão final e do QR code. [número do Pedro — a definir]; até lá, o geral.
  whatsapp: {
    numero: "556434316397",
    exibicao: "(64) 3431-6397",
    comercialDefinido: false, // mude para true quando o número comercial do Pedro entrar acima
    mensagem: "Olá! Vi a apresentação da Contábil Empresarial e quero agendar meu Diagnóstico de Prontidão para a Reforma.",
  },
  email: "atendimento@contabilempresarial.com.br",
  instagram: "@contabilempresarial",
  site: "contabilempresarial.com.br",
  enderecos: [
    "R. Rui de Almeida, 180 - St. Central, Itumbiara - GO",
    "Av. Cesário Alvim, 1135 - Centro, Uberlândia - MG",
    "Av. T-63, 1296, Sala 110, Setor Bueno, Goiânia - GO",
  ],
};

/** Número de clientes: UM valor só, usado em todos os lugares. Confirmado: +700 clientes ativos (23/11/2026). */
export const numeroClientes = { valor: 700, sufixo: "+" };

/** Atos: rótulo do contador na barra de progresso. */
export const atos = {
  abertura: "(ABERTURA)",
  ato1: "(ATO 01)",
  ato2: "(ATO 02)",
  ato3: "(ATO 03)",
} as const;

/** Data da informação da Reforma mostrada no rodapé das telas 02 a 04. */
export const reformaAtualizadoEm = "17/11/2026";

/**
 * Textos que precisam mudar em datas conhecidas. O checador avisa (e bloqueia a publicação)
 * quando a data já passou e a revisão não foi marcada como feita.
 */
export const revisoes = [
  { aPartirDe: "2026-12-16", tela: "03", feita: false, oQue: "Prazo do Senado para a alíquota da CBS passou (15/12). Trocar por: “A alíquota da CBS de 2027 só ficou definida em dezembro, a duas semanas do início.”" },
  { aPartirDe: "2027-01-01", tela: "03", feita: false, oQue: "Se a CBS começou: trocar o item do adiamento por “Pediram adiamento para 2028. Não adiou.”" },
  { aPartirDe: "2027-01-01", tela: "02", feita: false, oQue: "“Janeiro de 2027” vira “desde janeiro de 2027”." },
  { aPartirDe: "2027-01-01", tela: "14", feita: false, oQue: "Título vira “Sua empresa está pronta para a Reforma?”." },
  { aPartirDe: "2027-04-01", tela: "04", feita: false, oQue: "A janela do Simples de março de 2027 passou: apontar a próxima." },
  { aPartirDe: "2026-12-01", tela: "03", feita: false, oQue: "Conferir se o Congresso já decidiu os 30 dias a mais para o primeiro pagamento da CBS." },
];

// ---------------------------------------------------------------------------
// Imagens. caminho relativo a src/assets/apresentacao/ ou null (= placeholder).
// Só fotos reais da Contábil, com autorização de uso de imagem.
// ---------------------------------------------------------------------------

// recorte: true = imagem com o texto literal do ato oficial composto sobre papel (scripts/gerar-recortes.ts).
// Quando a página real do DOU for baixada (materiais/dou/LEIA.md), trocar o arquivo e tirar `recorte`.
export type Foto = { arquivo: string | null; descricao: string; video?: string; ficha?: string; recorte?: boolean };

export const telas = {
  // ======================= ABERTURA =======================
  capa: {
    ativo: true,
    ato: "abertura",
    tela: {
      sobretitulo: "PROPOSTA COMERCIAL 2026",
      titulo: "Tradição que se traduz em resultados.",
      apoio: "Há mais de 40 anos do lado de quem empreende.",
      nomeGigante: "CONTÁBIL EMPRESARIAL",
    },
    // camadas do túnel (fotos reais da Contábil; a foto da equipe fica guardada para a tela 08)
    // Quadros tirados do vídeo institucional (T:\MARKETING\Marketin Interno), sem a marca d'água.
    tunel: [
      { arquivo: "matriz-fachada.jpg", descricao: "Entrada da matriz em Itumbiara, com a placa da Contábil" },
      { arquivo: null, video: "matriz", descricao: "Vídeo: fachada da matriz (vídeo institucional, 6–8,6 s)" },
      { arquivo: "video/equipe-escritorio.jpg", descricao: "Equipe no escritório da matriz" },
      { arquivo: "video/itumbiara-aerea.jpg", descricao: "Vista aérea de Itumbiara" },
      { arquivo: "fachada-josiney.png", descricao: "Josiney em frente à placa da Contábil" },
      { arquivo: "video/filial-uberlandia.jpg", descricao: "Filial de Uberlândia" },
      { arquivo: "video/equipe-atendimento.jpg", descricao: "Equipe em atendimento" },
      { arquivo: "video/filial-cachoeira-dourada.jpg", descricao: "Unidade de Cachoeira Dourada" },
      { arquivo: "video/filial-goiania.jpg", descricao: "Unidade de Goiânia" },
    ] as Foto[],
    fala: "Obrigado pelo tempo. Em poucos minutos eu mostro quem é a Contábil, o que a gente faz pela sua empresa e a proposta que preparamos para você.",
  },

  reforma: {
    ativo: false, // fora da proposta comercial (27/11/2026)
    ato: "abertura",
    tela: {
      rotulo: "(A REFORMA)",
      titulo: "A Reforma Tributária não é mais promessa. Já está nas notas fiscais.",
      dados: [
        { grande: "5 → 3", texto: "5 tributos sobre o consumo dão lugar a 3 novos." },
        { grande: "01.2027", texto: "Janeiro de 2027: PIS e Cofins dão lugar à CBS." },
        { grande: "7 anos", texto: "7 anos com dois sistemas ao mesmo tempo, o antigo e o novo: de 2026 a 2032." },
      ],
      linhaDoTempo: [
        { ano: "2026", texto: "Teste", aqui: true },
        { ano: "2027", texto: "CBS" },
        { ano: "2029–2032", texto: "ICMS e ISS caem ano a ano" },
        { ano: "2033", texto: "Sistema novo completo" },
      ],
      fonte: "Fontes: EC 132/2023 e LC 214/2025.",
    },
    fala: "Muita gente ainda trata a Reforma como coisa do futuro. Ela já começou: desde agosto, as notas fiscais trazem os campos dos novos impostos. Em janeiro de 2027, PIS e Cofins dão lugar à CBS. E até 2032 a sua empresa vai conviver com dois sistemas ao mesmo tempo.",
  },

  datas: {
    ativo: false, // fora da proposta comercial (27/11/2026)
    ato: "abertura",
    tela: {
      rotulo: "(O NOTICIÁRIO)",
      titulo: "As datas mudam. A Reforma continua.",
      jaMudou: [
        { data: "01.2026 → adiada", texto: "Validação de IBS e CBS nas notas: prevista para janeiro de 2026, adiada." },
        { data: "30.09 → 30.10.2026", texto: "Opção do Simples pelo regime regular: de 30/9 para 30/10/2026." },
        { data: "01.12.2026 → 2027", texto: "Obrigações de 1º/12/2026: foram para janeiro ou março de 2027." },
      ],
      emDisputa: [
        { data: "01.2027 × 2028", texto: "Início da CBS: o governo mantém janeiro de 2027; 75 entidades empresariais, a OAB e uma proposta de PEC pedem 2028." },
        { data: "11,3% · até 15.12", texto: "Alíquota da CBS em 2027: 11,3%, calculada pelo TCU. O Senado tem até 15/12 para revisar." },
        { data: "+30 dias", texto: "Primeiro pagamento da CBS: o governo propõe 30 dias a mais." },
      ],
      fonte: "Situação em",
    },
    fala: "Quem acompanha o noticiário vê isso toda semana. Em menos de um ano, prazos da Reforma mudaram pelo menos três vezes. Agora, 75 entidades empresariais pedem para adiar a CBS para 2028, e o governo diz que ela começa em janeiro. Para adiar, Câmara e Senado teriam que aprovar uma emenda à Constituição antes de 1º de janeiro. Até a alíquota ainda está em discussão. Ninguém sabe todas as datas. Mas a Reforma está na Constituição e continua andando.",
  },

  impacto: {
    ativo: false, // fora da proposta comercial (27/11/2026)
    ato: "abertura",
    tela: {
      rotulo: "(SUA EMPRESA)",
      titulo: "A pergunta não é se a Reforma vai afetar a sua empresa. É como.",
      blocos: [
        {
          regime: "No Simples, vendendo para outras empresas",
          texto: "Quem compra de você recupera de 0,62% a 1,84% em crédito. De um fornecedor do regime regular, cerca de 11%. A próxima janela para mudar essa escolha é março de 2027.",
          contraste: { de: "1,84%", para: "11%", legendaDe: "crédito comprando do Simples", legendaPara: "crédito comprando do regime regular" },
          // O Fiscal confere os percentuais (valem para comércio, Anexo I; indústria e serviços têm outros).
          validado: false,
        },
        {
          regime: "No Lucro Presumido ou Real",
          texto: "PIS e Cofins saem, e a CBS entra com alíquota de referência de 11,3% e crédito amplo. O impacto muda de empresa para empresa; só a conta mostra o seu caso.",
          validado: true,
        },
        {
          regime: "Em qualquer regime",
          texto: "O crédito do seu cliente depende de IBS e CBS destacados corretamente na sua nota.",
          validado: true,
        },
      ],
      fonte: "Percentuais do Simples para comércio (Anexo I), em 2027.",
    },
    fala: "Cada empresa vai sentir de um jeito. Se você está no Simples e vende para outras empresas, seu cliente vai fazer conta: no comércio, comprando de você ele recupera no máximo 1,84% em crédito; de um fornecedor do regime regular, cerca de 11%. Isso pode mudar de quem ele prefere comprar. Recolher por fora pode compensar ou não, e a próxima janela para decidir é em março. Se você está no Presumido ou no Real, só a simulação mostra se a sua conta melhora ou piora. E, para todo mundo: se a nota sair com IBS e CBS errados, o seu cliente pode perder o crédito.",
  },

  virada: {
    ativo: false, // fora da proposta comercial (27/11/2026)
    ato: "abertura",
    tela: {
      frase: "Quem espera a certeza chega atrasado.",
      // fotos pequenas dentro da frase (motion de referência)
      imagensNaFrase: [
        { depoisDe: "espera", arquivo: "video/equipe-atendimento.jpg", descricao: "Equipe em atendimento" },
        { depoisDe: "chega", arquivo: "matriz-fachada.jpg", descricao: "Entrada da matriz" },
      ],
      apoio: "Quando a regra muda, faz diferença quem está do seu lado.",
    },
    fala: "Esperar para ver também é uma decisão. A janela do Simples para o primeiro semestre de 2027 fechou em 30 de outubro: quem esperou a poeira baixar perdeu essa janela. Ninguém precisa acompanhar sozinho cada prazo e cada proposta. Mas alguém precisa acompanhar por você. A pergunta é: de que lado você vai estar quando a próxima mudança chegar?",
  },

  // ======================= ATO 1 · TRADIÇÃO =======================
  historia: {
    ativo: false, // fora da proposta comercial (27/11/2026)
    ato: "ato1",
    tela: {
      rotulo: "(NOSSA HISTÓRIA)",
      titulo: "Do lado de quem já atravessou todas.",
      apoio: "Somos mais antigos que a Constituição de 1988. Desde então, o Brasil editou mais de 490 mil normas tributárias, 55 por dia útil. Vimos cada uma chegar.",
      mensagem: "Desde 1984 a Contábil já atravessou 6 moedas e 7 planos econômicos. A Reforma é a próxima travessia.",
      fecho: "A Reforma é só a próxima travessia.",
      // vídeo de fundo do fecho: a fachada antiga virando a de 2026 (vídeo institucional, 23–26,4 s)
      videoFecho: "fachada-2026",
      fonte: "IBPT, normas editadas de 5/10/1988 a 30/9/2023.",
      nomeGigante: "DESDE 1984",
      local: "ITUMBIARA, GO — (C) 1984",
      coordenadas: "18.4192 S / 49.2153 W",
      totalMoedas: 6,
    },
    // Camadas do túnel, em ordem cronológica. faixa: "brasil" (em cima) ou "contabil" (embaixo).
    // conferido: false = data ainda não conferida na fonte oficial (planalto.gov.br, BCB, Imprensa Nacional).
    // imagem: página do DOU (ato oficial, sem direito autoral — Lei 9.610/98, art. 8º, IV) ou cédula
    // (seguir as regras do Banco Central para reprodução). Nunca capa ou recorte de jornal.
    marcos: [
      // ficha: citação do ato oficial (aparece quando ainda não há imagem).
      // imagem.arquivo: página do DOU (materiais/dou) ou recorte de jornal LICENCIADO pelo acervo do jornal.
      // Datas conferidas no LexML (Senado/Câmara) em 23/11/2026. conferido: false = ainda falta conferir.
      { ativo: true, faixa: "contabil", data: "1984", titulo: "FUNDAÇÃO DA CONTÁBIL", texto: "Fundação, com o Dr. Geraldo Augusto Mateus. A moeda era o Cruzeiro.", moeda: 1, conferido: true, imagem: { arquivo: "video/anuncio-1984.jpg", descricao: "Página de jornal de 1984 com o escritório e o anúncio da Contábil (do vídeo institucional)", ficha: "Itumbiara (GO) · 1984" } },
      { ativo: true, faixa: "brasil", data: "28.02.1986", titulo: "PLANO CRUZADO", texto: "Nasce o Cruzado.", moeda: 2, conferido: true, imagem: { arquivo: "recortes/cruzado.png", recorte: true, descricao: "DOU de 28/02/1986, Seção 1, p. 3085", ficha: "Decreto-Lei nº 2.283, de 27/02/1986 · DOU 28/02/1986, Seção 1, p. 3085 (substituído pelo DL 2.284, de 10/03/1986)" } },
      { ativo: true, faixa: "brasil", data: "21.11.1986", titulo: "CRUZADO II", texto: "Novo pacote: reajuste de preços e tributos.", moeda: 2, conferido: true, imagem: { arquivo: "recortes/cruzado2.png", recorte: true, descricao: "DOU de 24/11/1986, p. 17553 e 17561", ficha: "Decretos-Leis nº 2.290 e nº 2.303, de 21/11/1986 · DOU 24/11/1986" } },
      { ativo: true, faixa: "brasil", data: "12.06.1987", titulo: "PLANO BRESSER", texto: "Congelamento de preços e salários.", moeda: 2, conferido: true, imagem: { arquivo: "recortes/bresser.png", recorte: true, descricao: "DOU de 13/06/1987, p. 9214", ficha: "Decreto-Lei nº 2.335, de 12/06/1987 · DOU 13/06/1987, p. 9214" } },
      { ativo: true, faixa: "brasil", data: "05.10.1988", titulo: "CONSTITUIÇÃO FEDERAL", texto: "Nova Constituição. O ICM vira ICMS.", moeda: 2, conferido: true, imagem: { arquivo: "recortes/constituicao.png", recorte: true, descricao: "DOU nº 191-A, de 05/10/1988", ficha: "Constituição da República Federativa do Brasil · DOU nº 191-A, 05/10/1988" } },
      { ativo: true, faixa: "brasil", data: "16.01.1989", titulo: "PLANO VERÃO", texto: "Nasce o Cruzado Novo.", moeda: 3, conferido: true, imagem: { arquivo: "recortes/verao.png", recorte: true, descricao: "DOU de 16/01/1989, p. 845", ficha: "Medida Provisória nº 32, de 15/01/1989 · DOU 16/01/1989, p. 845" } },
      { ativo: true, faixa: "brasil", data: "16.03.1990", titulo: "PLANO COLLOR I", texto: "Volta o Cruzeiro.", moeda: 4, conferido: true, imagem: { arquivo: "recortes/collor1.png", recorte: true, descricao: "DOU de 16/03/1990, Seção 1, p. 5546", ficha: "Medida Provisória nº 168, de 15/03/1990 · DOU 16/03/1990, p. 5546" } },
      { ativo: true, faixa: "brasil", data: "31.01.1991", titulo: "PLANO COLLOR II", texto: "Novo congelamento.", moeda: 4, conferido: true, imagem: { arquivo: "recortes/collor2.png", recorte: true, descricao: "DOU de 01/02/1991, Seção 1, p. 2313", ficha: "Medida Provisória nº 294, de 31/01/1991 · DOU 01/02/1991, p. 2313" } },
      { ativo: true, faixa: "brasil", data: "01.08.1993", titulo: "CRUZEIRO REAL", texto: "Nasce o Cruzeiro Real.", moeda: 5, conferido: false, imagem: { arquivo: "recortes/cruzeiroreal.png", recorte: true, descricao: "DOU de 29/07/1993, Seção 1, p. 10714", ficha: "Medida Provisória nº 336, de 28/07/1993 · DOU 29/07/1993, p. 10714" } },
      { ativo: true, faixa: "brasil", data: "01.07.1994", titulo: "PLANO REAL", texto: "Nasce o Real.", moeda: 6, conferido: true, imagem: { arquivo: "recortes/real.png", recorte: true, descricao: "DOU de 30/06/1994, Edição Extra, p. 9761", ficha: "Medida Provisória nº 542, de 30/06/1994 · DOU 30/06/1994, p. 9761" } },
      { ativo: true, faixa: "brasil", data: "1996", titulo: "LEI KANDIR E SIMPLES FEDERAL", texto: "Novas regras de ICMS e o primeiro regime simplificado.", moeda: 6, conferido: true, imagem: { arquivo: "recortes/kandir.png", recorte: true, descricao: "DOU de 16/09/1996, p. 18261", ficha: "Lei Complementar nº 87, de 13/09/1996 · Lei nº 9.317, de 05/12/1996" } },
      { ativo: true, faixa: "brasil", data: "1997–2007", titulo: "CPMF", texto: "A contribuição sobre movimentação financeira.", moeda: 6, conferido: false, imagem: { arquivo: "recortes/cpmf.png", recorte: true, descricao: "DOU de 25/10/1996, p. 21877", ficha: "Lei nº 9.311, de 24/10/1996 · DOU 25/10/1996, p. 21877" } },
      { ativo: true, faixa: "brasil", data: "2006–2007", titulo: "SIMPLES NACIONAL E SPED", texto: "LC 123 e a escrituração digital.", moeda: 6, conferido: true, imagem: { arquivo: "recortes/simples.png", recorte: true, descricao: "DOU de 15/12/2006, p. 1", ficha: "Lei Complementar nº 123, de 14/12/2006 · Decreto nº 6.022, de 22/01/2007" } },
      { ativo: true, faixa: "brasil", data: "2018", titulo: "ESOCIAL", texto: "Folha e obrigações trabalhistas no digital.", moeda: 6, conferido: false, imagem: { arquivo: "recortes/esocial.png", recorte: true, descricao: "DOU de 12/12/2014, p. 4", ficha: "Decreto nº 8.373, de 11/12/2014 · DOU 12/12/2014, p. 4" } },
      { ativo: false, faixa: "contabil", data: "[ano]", titulo: "CRESCIMENTO E CONSOLIDAÇÃO", texto: "Crescimento e consolidação com Olavo Mateus Tinôco.", moeda: 6, conferido: false, imagem: { arquivo: null, descricao: "Foto histórica da Contábil" } },
      { ativo: false, faixa: "contabil", data: "[ano]", titulo: "NOVA GERAÇÃO", texto: "Nova geração: Olavo Mateus Tinôco Júnior e Josiney Campos Mateus.", moeda: 6, conferido: false, imagem: { arquivo: null, descricao: "Foto da liderança atual" } },
      { ativo: false, faixa: "contabil", data: "[anos]", titulo: "NOVAS UNIDADES", texto: "Unidades de Goiânia e Uberlândia.", moeda: 6, conferido: false, imagem: { arquivo: null, descricao: "Fachadas das unidades" } },
      { ativo: true, faixa: "brasil", data: "2023 / 2025", titulo: "REFORMA TRIBUTÁRIA", texto: "EC 132/2023 e LC 214/2025.", moeda: 6, conferido: true, imagem: { arquivo: "recortes/reforma.png", recorte: true, descricao: "DOU de 21/12/2023, Seção 1, p. 1", ficha: "Emenda Constitucional nº 132, de 20/12/2023 · Lei Complementar nº 214, de 16/01/2025" } },
    ],
    fala: "Quando a Contábil abriu, em 1984, a moeda era o cruzeiro. Depois vieram o cruzado, o cruzado novo, o cruzeiro de novo, o cruzeiro real e, enfim, o real. Veio a Constituição de 88 e, com ela, mais de 490 mil normas tributárias. Vieram o Simples, o SPED, o eSocial. Nossos clientes atravessaram tudo isso com a gente, e a liderança passou de geração em geração com o mesmo padrão. A Reforma é grande. Mas não é a primeira grande mudança que a gente atravessa.",
  },

  numeros: {
    ativo: true,
    ato: "ato1",
    tela: {
      rotulo: "(A FORÇA EM NÚMEROS)",
      titulo: "Números que não se improvisam.",
      itens: [
        { valor: 40, sufixo: "+", rotulo: "anos de mercado" },
        { ...numeroClientes, rotulo: "empresas clientes" },
        { valor: 40, sufixo: "+", rotulo: "cidades atendidas" },
        { valor: 70, sufixo: "+", rotulo: "especialistas" },
        { valor: 48, sufixo: " mil+", rotulo: "obrigações entregues por ano" },
        { valor: 30, sufixo: "+", rotulo: "segmentos" },
      ],
      destaque: "São mais de 190 entregas por dia útil — uma a cada 2 minutos e meio de expediente.",
      // Conta: 48.000 ÷ 250 dias úteis = 192/dia; 480 min (8 h) ÷ 192 = 2,5 min.
      // Se o expediente for 9 h, trocar por "menos de 3 minutos".
      destaqueValidado: false,
    },
    fala: "Esses números resumem o que 40 anos constroem. O que eu mais gosto de mostrar é este: 48 mil obrigações entregues por ano. Dá mais de 190 por dia útil, uma a cada dois minutos e meio. É essa estrutura que vai cuidar da sua empresa.",
  },

  time: {
    ativo: true,
    ato: "ato1",
    tela: {
      rotulo: "(O TIME)",
      // Quadro do vídeo institucional (29,5 s). Trocar por uma foto da equipe reunida quando houver.
      fotoEquipe: { arquivo: "video/equipe-matriz.jpg", descricao: "Equipe da matriz em Itumbiara" } as Foto,
      titulo: "Estrutura de grande. Atendimento de perto.",
      apoio: "70+ especialistas em 4 departamentos",
      apoioComplemento: { ativo: false, texto: "e um time de referência que conhece a sua empresa" },
      faixaLocais: [
        { ativo: true, texto: "Matriz em Itumbiara (GO)" },
        { ativo: true, texto: "Filiais em Goiânia (GO), Uberlândia (MG) e Cachoeira Dourada (GO)" },
        { ativo: false, texto: "[+ demais unidades]" },
        { ativo: true, texto: "40+ cidades atendidas" },
        { ativo: false, texto: "Clientes nas 5 regiões" },
      ],
      // Só se a Contábil puder garantir: canal e tempo de resposta.
      compromisso: { ativo: false, texto: "[Compromisso de atendimento: canal e tempo de resposta]" },
      // Gestores de cada setor (fotos de "Fotos colaboradores/Gestoras", 24/11/2026). Sem WhatsApp pessoal.
      // enquadrar: posição do rosto na foto (object-position), para o recorte do cartão.
      // Autorização de uso de imagem: confirmar com cada um antes de publicar.
      autorizacaoImagem: true, // confirmado por Hiago em 24/11/2026: todos assinaram termo de uso de imagem
      gestoras: [
        { nome: "Márcio", setor: "Gerente Geral", icone: "gestao", foto: "gestores/marcio.jpg" as string | null, enquadrar: "50% 22%" },
        { nome: "Michele", setor: "Legalização", icone: "legalizacao", foto: "gestores/michele.jpg" as string | null, enquadrar: "50% 30%" },
        { nome: "Naiara", setor: "Departamento Pessoal", icone: "pessoal", foto: "gestores/naiara.jpg" as string | null, enquadrar: "50% 22%" },
        { nome: "Bruna", setor: "Fiscal", icone: "fiscal", foto: "gestores/bruna.jpg" as string | null, enquadrar: "50% 24%" },
        { nome: "Ana Julia", setor: "Contábil", icone: "contabil", foto: "gestores/ana-julia.jpg" as string | null, enquadrar: "35% 24%" },
        { nome: "Vanessa", setor: "Departamento Geral", icone: "gestao", foto: "gestores/vanessa.jpg" as string | null, enquadrar: "50% 30%" },
        { nome: "Marina", setor: "Atendimento", icone: "atendimento", foto: "gestores/marina.jpg" as string | null, enquadrar: "50% 30%" },
        { nome: "Pedro", setor: "Comercial", icone: "comercial", foto: "gestores/pedro.jpg" as string | null, enquadrar: "50% 22%" },
      ],
    },
    fala: "E por trás desses números tem gente. Esta é a equipe da matriz, em Itumbiara, e ela é só uma parte do time. Tamanho só vale se chega perto de você: [você tem um time de referência e fala com ele pelo canal X]. Perto de uma das nossas unidades, a gente senta junto. Longe, o atendimento digital resolve com a mesma equipe por trás.",
  },

  // ======================= ATO 2 · QUE SE TRADUZ =======================
  departamentos: {
    ativo: true,
    ato: "ato2",
    tela: {
      rotulo: "(O QUE VOCÊ RECEBE)",
      tituloForte: "Quatro departamentos.",
      tituloLeve: "Um só parceiro.",
      itens: [
        { ativo: true, categoria: "DEPARTAMENTO 01", nome: "Legalização", descricao: "Suporte completo na regularização e gestão legal da sua empresa, realizando abertura, alterações e encerramento de empresas, emissão de certidões, obtenção e renovação de licenças e alvarás, regularização de pendências cadastrais e fiscais, além do acompanhamento do certificado digital e da documentação necessária para manter o negócio em conformidade.", texto: "Sua empresa em dia, da abertura ao encerramento.", linhaFina: "abertura, alterações, certidões, licenças e alvarás", icone: "legalizacao" as Foto },
        { ativo: true, categoria: "DEPARTAMENTO 02", nome: "Pessoal", descricao: "Gestão do Departamento Pessoal, desde a admissão de colaboradores, folha de pagamento, FGTS, férias, rescisões, afastamentos e benefícios, até o envio dos eventos ao eSocial e o cumprimento de todas as obrigações trabalhistas e previdenciárias. Também oferecemos assessoria especializada para garantir conformidade e segurança em todas as rotinas da empresa.", texto: "Folha certa, no prazo, com segurança trabalhista.", linhaFina: "folha, FGTS, férias, rescisões e eSocial", icone: "pessoal" as Foto },
        { ativo: true, categoria: "DEPARTAMENTO 03", nome: "Fiscal", descricao: "Gestão fiscal e tributária da sua empresa, realizando a apuração de impostos, conferência de notas fiscais, entrega das obrigações acessórias e emissão das guias de pagamento dentro dos prazos. Também identificamos possíveis divergências e oferecemos orientação para a escolha do regime tributário mais vantajoso e o melhor aproveitamento de créditos fiscais.", texto: "Imposto certo, no prazo, no regime mais adequado.", linhaFina: "apuração, guias, obrigações acessórias e créditos", icone: "fiscal" as Foto },
        { ativo: true, categoria: "DEPARTAMENTO 04", nome: "Contábil", descricao: "Gestão contábil da sua empresa, com escrituração, fechamento contábil, elaboração de balanços e demonstrações financeiras, apuração de tributos, cumprimento das obrigações acessórias, controle do ativo imobilizado e consultoria contábil e tributária para garantir segurança e conformidade nas operações.", texto: "Números que mostram onde a empresa está e para onde pode ir.", linhaFina: "escrituração, balanços e consultoria", icone: "contabil" as Foto },
        // Serviços especializados: desligados até a Contábil confirmar.
        { ativo: false, categoria: "ESPECIALIZADO", nome: "Contabilidade Rural", texto: "Produtor rural e agronegócio.", linhaFina: "ITR, LCDPR e gestão fiscal do agro", icone: "contabil" as Foto },
        { ativo: false, categoria: "ESPECIALIZADO", nome: "Holding", texto: "Planejamento e estruturação de holdings.", linhaFina: "proteção patrimonial e sucessão", icone: "legalizacao" as Foto },
        { ativo: false, categoria: "ESPECIALIZADO", nome: "BPO Financeiro", texto: "Rotina financeira terceirizada.", linhaFina: "contas a pagar e receber, fluxo de caixa", icone: "fiscal" as Foto },
        { ativo: false, categoria: "ESPECIALIZADO", nome: "Consultoria", texto: "Decisões financeiras e tributárias.", linhaFina: "orientação estratégica", icone: "pessoal" as Foto },
      ],
    },
    fala: "No dia a dia, quatro departamentos integrados cuidam de tudo: da existência legal da sua empresa à folha, aos impostos e aos números. Isso toda empresa precisa, e cada departamento tem gestor próprio, que você conhece pelo nome.",
  },

  preparacao: {
    ativo: false, // fora da proposta comercial (27/11/2026)
    ato: "ato2",
    tela: {
      rotulo: "(PREPARAÇÃO PARA A REFORMA)",
      tituloForte: "Você não precisa acompanhar cada mudança.",
      tituloLeve: "A gente acompanha por você.",
      // Só entra o que o Fiscal já entrega. ativo: true + validado: true depois da validação.
      itens: [
        { ativo: true, validado: false, texto: "Notas e cadastros no padrão de IBS e CBS." },
        { ativo: true, validado: false, texto: "Simulação do impacto em preço, margem e crédito." },
        { ativo: true, validado: false, texto: "No Simples, a escolha entre recolher dentro ou fora do DAS, com números, a cada janela." },
        { ativo: true, validado: false, texto: "Aviso do que muda e quando, antes de virar problema." },
        { ativo: true, validado: false, texto: "Plano ano a ano até 2033." },
      ],
      prova: { ativo: false, texto: "Giro Empresarial · Café com Tributos · Contábil Cast" },
    },
    fala: "A maioria dos empresários não tem tempo de acompanhar cada prazo, cada proposta, cada nota técnica. Nem deveria: o seu tempo é do seu negócio. Esse acompanhamento é trabalho nosso. A gente ajusta as suas notas, simula o impacto no seu preço, faz a conta do Simples e avisa você antes de cada mudança.",
  },

  parceiros: {
    ativo: true,
    ato: "ato2",
    tela: {
      rotulo: "(ECOSSISTEMA)",
      titulo: "Mais que contabilidade: um ecossistema de gestão.",
      apoio: "Parceiros selecionados para gerar redução de custos, mais eficiência na gestão e otimização das vendas.",
      // logo: arquivo em src/assets/apresentacao/parceiros/ (branco, fundo transparente); null = aparece o nome.
      // Os logos passam numa faixa na base da tela. Fonte: "Página 30.pdf" (Empresas Parceiras).
      grupos: [
        { nome: "Pessoas", parceiros: [
          { nome: "PontoAqui", texto: "controle de ponto", logo: "pontoaqui.png" as string | null },
          { nome: "Conecta Pessoas RH", texto: "recrutamento e desenvolvimento de líderes", logo: "conecta-pessoas.png" as string | null },
          { nome: "Capacita Contabilidade", texto: "treinamentos práticos por departamento", logo: null as string | null },
        ] },
        { nome: "Operação", parceiros: [
          { nome: "Emmit Fácil", texto: "entrada e emissão de notas", logo: "emmit-facil.png" as string | null },
          { nome: "Nexxo BPO", texto: "terceirização de rotinas administrativas", logo: "nexxo-bpo.png" as string | null },
        ] },
        { nome: "Conhecimento", parceiros: [
          { nome: "Contábil Cast", texto: "conteúdo leve e prático sobre gestão, legislação e mercado", logo: "contabil-cast.png" as string | null },
        ] },
      ],
    },
    fala: "A gente não para na contabilidade. Ao longo dos anos, selecionamos parceiros que resolvem outras dores do empresário: ponto, RH, notas, rotinas administrativas, treinamento. Você chega a todos eles pela indicação de quem já conhece a sua empresa por dentro.",
  },

  // ======================= ATO 3 · EM RESULTADOS =======================
  resultados: {
    // DESLIGADA por decisão da Contábil (23/11/2026): a apresentação segue sem depoimentos.
    // Só religar com dado real e autorizado. Depoimento inventado nunca.
    ativo: false,
    ato: "ato3",
    tela: {
      rotulo: "(RESULTADOS)",
      titulo: "Quem cresce com a gente.",
      numeros: [
        { valor: "[X anos]", rotulo: "tempo médio que um cliente fica com a Contábil" },
        { valor: "Desde [ano]", rotulo: "o cliente mais antigo da casa" },
      ],
      casos: [] as { problema: string; feito: string; resultado: string }[],
      depoimentos: [] as { frase: string; nome: string; cargo: string; empresa: string; cidade: string }[],
    },
    fala: "Mas quem melhor explica o nosso trabalho são os clientes. [Contar um caso ou ler um depoimento.]",
  },

  comoComecar: {
    ativo: false, // fora da proposta comercial (27/11/2026)
    ato: "ato3",
    tela: {
      rotulo: "(COMO COMEÇAR)",
      titulo: "Trocar de contabilidade é mais simples do que parece.",
      // Validar as etapas com o comercial: precisam bater com o processo real.
      etapasValidadas: false,
      etapas: [
        { nome: "Conversa", texto: "entendemos o momento da sua empresa." },
        { nome: "Diagnóstico", texto: "analisamos a situação fiscal, contábil e trabalhista, e o impacto da Reforma." },
        { nome: "Transição", texto: "cuidamos dos documentos e do contato com a contabilidade anterior." },
        { nome: "Acompanhamento", texto: "rotinas no ar e um time de referência para você." },
      ],
      apoio: "Vai abrir empresa? Começamos do zero, com você.",
    },
    fala: "Muita gente adia a troca de contabilidade porque imagina dor de cabeça. A transição fica com a gente: conversa, diagnóstico, documentos e acompanhamento. E, se você ainda vai abrir a empresa, melhor: ela já nasce preparada para a Reforma.",
  },

  // ======================= PROPOSTA COMERCIAL (27/11/2026) =======================
  // Telas da proposta comercial do Pedro (PROPOSTA COMERCIAL CONTABIL EMPRESARIAL 2026.pptx).
  // Os números seguem o site: na proposta estava "mais de 400 clientes" e "+500 clientes ativos"; vale numeroClientes (+700).
  quemSomos: {
    ativo: true,
    ato: "ato1",
    tela: {
      rotulo: "(QUEM SOMOS)",
      titulo: "Referência em soluções contábeis. Há mais de 40 anos.",
      historia: "Fundada em 1984 pelo Dr. Geraldo Augusto Mateus e fortalecida pela atuação de Olavo Mateus Tinôco, a Contábil Empresarial é referência em soluções contábeis há mais de 40 anos.",
      // {clientes} vira o número de clientes do site (numeroClientes)
      hoje: "Hoje, sob a liderança de Olavo Mateus Tinôco Júnior e Josiney Campos Mateus, une tradição e inovação para atender mais de {clientes} clientes em mais de 5 regiões do Brasil, com cases de sucesso nos principais segmentos do comércio e dos serviços.",
      pilares: ["Compromisso", "Excelência", "Confiança"],
      pilaresTexto: "são os pilares que sustentam a nossa história.",
      foto: { arquivo: "matriz-fachada.jpg", descricao: "Entrada da matriz em Itumbiara, com a placa da Contábil" } as Foto,
    },
    fala: "A Contábil nasceu em 1984, com o Dr. Geraldo. Cresceu com o Olavo e hoje está com a nova geração, o Olavo Júnior e o Josiney. São mais de 40 anos e mais de 700 clientes, do comércio aos serviços.",
  },

  missao: {
    ativo: true,
    ato: "ato1",
    tela: {
      rotulo: "(MISSÃO, VISÃO E VALORES)",
      titulo: "O que nos guia. Todos os dias.",
      missao: "Prestar serviços contábeis de qualidade, garantindo eficácia e dedicação na gestão do patrimônio de nossos clientes, contribuindo para seu crescimento e sucesso no mercado.",
      visao: "Ser referência em serviços contábeis na cidade de Itumbiara-GO e região, reconhecida pela excelência no atendimento e pela capacidade de inovar, adaptando-se às constantes mudanças na legislação e no mercado.",
      valores: [
        { nome: "Qualidade", texto: "Buscamos sempre entregar um trabalho de alta qualidade, para garantir a satisfação de nossos clientes." },
        { nome: "Dedicação", texto: "Nos dedicamos a entender as necessidades de cada cliente para fornecer soluções contábeis personalizadas." },
        { nome: "Eficácia", texto: "Trabalhamos com eficiência e agilidade, para garantir que nossos clientes tenham sempre os melhores resultados." },
        { nome: "Integridade", texto: "Atuamos com transparência e honestidade, valorizando a confiança depositada em nós por nossos clientes." },
        { nome: "Inovação", texto: "Estamos sempre em busca de novas formas de melhorar nossos serviços e nos adaptar às mudanças do mercado." },
      ],
    },
    fala: "Isso é o que guia o nosso dia a dia: cuidar do patrimônio do cliente com qualidade e dedicação, e acompanhar cada mudança da legislação para que você não precise se preocupar com ela.",
  },

  investimento: {
    // Um plano, um valor (como na apresentação atual da Contábil). O Pedro pode trocar nome, texto e valores
    // na página de configuração (/apresentacao/configurar); o que ele salvar vale só naquele aparelho.
    // Na tela: arrastar o dedo sobre o preço risca o valor; tocar no preço riscado mostra o valor com desconto.
    ativo: true,
    ato: "ato3",
    tela: {
      rotulo: "(INVESTIMENTO)",
      titulo: "Investimento",
      plano: {
        nome: "Estratégico",
        descricao: "Mais suporte, orientação e acompanhamento para tomada de decisões.",
        valor: "1.621,00",
        periodo: "", // ex.: "/mês" (a imagem atual não diz; confirmar com o comercial)
      },
      // valor com desconto que aparece depois de riscar o preço; vazio = só risca
      desconto: "",
      fundo: { arquivo: "video/equipe-matriz.jpg", descricao: "Equipe da matriz em Itumbiara" },
    },
    fala: "Para a sua empresa, o plano é o Estratégico: mais suporte, orientação e acompanhamento para as decisões. O investimento é de R$ 1.621,00.",
  },

  proximoPasso: {
    ativo: false, // fora da proposta comercial (27/11/2026)
    ato: "ato3",
    tela: {
      titulo: "Sua empresa está pronta para 2027?",
      oferta: "Diagnóstico de Prontidão para a Reforma",
      ofertaDetalhes: ["[o que entrega: notas e cadastros, simulação do impacto, recomendação de regime]", "[prazo de entrega]", "[sem custo?]"],
      botao: "Agendar meu Diagnóstico de Prontidão",
      assinatura: "Contábil Empresarial · Tradição que se traduz em resultados desde 1984.",
    },
    fala: "O próximo passo é simples: um diagnóstico de prontidão da sua empresa para a Reforma. A gente olha as suas notas, simula o impacto e mostra com clareza o que fazer e quando. Quando a regra muda, faz diferença quem está do seu lado. Posso agendar com você?",
  },
  observacoes: {
    ativo: true,
    ato: "ato3",
    tela: {
      rotulo: "(OBSERVAÇÕES DA PROPOSTA)",
      titulo: "Observações da proposta",
      responsabilidade: "A condução dos serviços sobre demandas são de inteira responsabilidade do cliente, ficando a Contábil Empresarial responsável por fornecer a documentação a partir de solicitação da empresa.",
      exemplo: "Exemplo: cadastros bancários, documentos para licitação e editais.",
      // Enquadramento: muda em cada proposta. O Pedro troca em /apresentacao/configurar (vazio = o quadro some).
      enquadramento: "Abertura de duas empresas no valor de R$ 2.102,00.",
      enquadramentoDetalhe: "Empresa I Simples Nacional; Empresa II Lucro Presumido.",
      extrasTitulo: "Não estão inclusos nos honorários mensais",
      pf: {
        titulo: "Serviços extras · Pessoa Física",
        intro: "São considerados serviços extraordinários, não obrigatórios, isentos de responsabilidade técnica e não inclusos nos valores de honorários pagos pela contratante, tais como:",
        itens: [
          "Preenchimento de cadastros de instituições financeiras;",
          "Serviços da área trabalhista referentes a interesses particulares, como obras, acertos e preenchimento de documentos de domésticos (caseiros, vigias, jardineiros, motoristas etc.);",
          "Soluções e processos em repartições públicas referentes a transtornos com bens particulares, como IPTU, ITBI, ISTI, IPVA, ISSQN Autônomo etc.;",
          "Soluções e processos em repartições públicas referentes a assuntos específicos ao objeto social da contratante, como entidades específicas, conselhos de classe profissional, cartórios específicos e demais repartições não utilizadas pela atuação profissional contábil;",
          "Contratos de compra e venda particular;",
          "Contratos de aluguel particular;",
          "Treinamentos e cursos de aperfeiçoamento.",
        ],
      },
      pj: {
        titulo: "Serviços extras · Pessoa Jurídica",
        texto: "Auditoria Tributária, revisão da base de dados cadastral de produtos, recuperação tributária de impostos pagos indevidamente sobre folha e sobre faturamento, constituição de novas sociedades, alterações contratuais (mudança do endereço empresarial, de atividades econômicas e criação de filiais), transformação societária, fusão, cisão, cisão parcial, incorporação e baixa de empresas, e Defesas Fiscais em qualquer âmbito: Municipal, Estadual, Federal, Procon, Ibama, Inmetro e demais órgãos.",
      },
    },
    fala: "Para ficar tudo claro desde o começo: estes são os serviços que ficam fora da mensalidade. Se precisar de algum deles, a gente orça à parte.",
  },

  obrigado: {
    ativo: true,
    ato: "ato3",
    tela: {
      rotulo: "(OBRIGADO)",
      titulo: "Obrigado pela sua atenção e confiança.",
      apoio: "Estamos à disposição para construir uma parceria sólida, baseada em transparência, excelência e resultados.",
      telefones: ["(64) 3431-6397", "(35) 98424-3358", "(64) 99249-1244"],
      instagram: "@contabilempresarial",
      site: "contabilempresarial.com.br",
      parceiros: [
        { nome: "Ponto Aqui", rede: "@pontoaquibr", logo: "pontoaqui.png" as string | null },
        { nome: "Conecta Pessoas RH", rede: "@conecta_rhbr", logo: "conecta-pessoas.png" as string | null },
        { nome: "Emmit Fácil", rede: "@emmitfacil_", logo: "emmit-facil.png" as string | null },
        { nome: "Nexxo BPO", rede: "@nexxo_bpo", logo: "nexxo-bpo.png" as string | null },
        { nome: "Contábil Cast", rede: "YouTube · @contabil.empresarial", logo: "contabil-cast.png" as string | null },
        { nome: "Capacita Contabilidade", rede: "@capacitacontabilidade", logo: null as string | null },
      ],
    },
    fala: "Obrigado pelo seu tempo. Fico à disposição para qualquer dúvida sobre a proposta. Podemos seguir?",
  },
};

export type ChaveTela = keyof typeof telas;

/** Ordem das telas (a numeração na tela se ajusta sozinha quando uma está desligada). */
// Proposta comercial (27/11/2026): Capa, Quem Somos, Time, Missão/Visão/Valores, Serviços, Números, Parceiros,
// Investimento, Observações e Obrigado. As telas da Reforma ficam no arquivo, desligadas (ativo: false).
export const ordem: ChaveTela[] = [
  "capa", "quemSomos", "time", "missao",
  "departamentos", "numeros", "parceiros",
  "investimento", "observacoes", "obrigado",
  "reforma", "datas", "impacto", "virada", "historia", "preparacao",
  "resultados", "comoComecar", "proximoPasso",
];
