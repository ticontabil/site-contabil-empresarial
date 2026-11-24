// Conteúdo das seções da página inicial. `icon` é o nome do ícone lucide (ver icons.ts).

export const servicos = {
  titulo: "Nossos",
  destaque: "Serviços",
  subtitulo: "Soluções completas para sua empresa crescer com segurança e eficiência.",
  itens: [
    { icon: "BookOpen", titulo: "Contabilidade em Geral", descricao: "Serviços contábeis completos para manter sua empresa em dia com todas as obrigações." },
    { icon: "MessageSquare", titulo: "Consultoria", descricao: "Orientação estratégica para decisões financeiras e tributárias inteligentes." },
    { icon: "Tractor", titulo: "Contabilidade Rural", descricao: "Soluções especializadas para produtores rurais e o agronegócio." },
    { icon: "ClipboardCheck", titulo: "Assessoria Contábil", descricao: "Acompanhamento contínuo para garantir a saúde financeira do seu negócio." },
    { icon: "Building", titulo: "Constituição de Holding", descricao: "Planejamento e estruturação de holdings para proteção patrimonial." },
    { icon: "UserCheck", titulo: "Atendimento Personalizado", descricao: "Cada cliente é único. Oferecemos soluções sob medida para suas necessidades." },
  ],
};

export const comoFunciona = {
  titulo: "Como",
  destaque: "Funciona",
  subtitulo: "Em apenas 3 passos simples, sua empresa estará em boas mãos.",
  passos: [
    { num: "01", icon: "ClipboardList", titulo: "Cadastro", descricao: "Preencha um formulário simples e nossa equipe entra em contato." },
    { num: "02", icon: "FileUp", titulo: "Envio de Documentos", descricao: "Envie seus documentos de forma digital e segura pela nossa plataforma." },
    { num: "03", icon: "Rocket", titulo: "Gestão Completa", descricao: "Pronto! Nós cuidamos de tudo enquanto você foca no que importa: crescer." },
  ],
};

// Unidades atuais (24/11/2026): matriz em Itumbiara; filiais em Goiânia, Uberlândia e Cachoeira Dourada.
// Goiatuba, Buriti Alegre e Araporã saíram (não fazem mais parte da empresa).
// Links do Waze enviados pela Contábil (24/11/2026), sem o parâmetro de rastreamento fbclid.
// lat/lng: coordenadas desses links (vão também para os dados estruturados do Google).
export const filiais = {
  titulo: "Nossas",
  destaque: "Unidades",
  subtitulo: "Matriz em Itumbiara e filiais em Goiânia, Uberlândia e Cachoeira Dourada. Toque para abrir a rota no Waze.",
  cidades: [
    { cidade: "Itumbiara", uf: "GO", tipo: "Matriz", endereco: "R. Rui de Almeida, 180 - St. Central", cep: "75503-090",
      waze: "https://www.waze.com/pt-BR/live-map/directions/br/go/contabil-empresarial?to=place.ChIJob0NBGoNoZQRyWPHlRwZMpU", lat: null as number | null, lng: null as number | null },
    { cidade: "Goiânia", uf: "GO", tipo: "Filial", endereco: "Av. T-63, 1296, Sala 110 - Setor Bueno", cep: "",
      waze: "https://www.waze.com/pt-BR/live-map/directions?to=ll.-16.7139411%2C-49.2706756", lat: -16.7139411 as number | null, lng: -49.2706756 as number | null },
    { cidade: "Uberlândia", uf: "MG", tipo: "Filial", endereco: "Av. Cesário Alvim, 1135 - Centro", cep: "",
      waze: "https://www.waze.com/pt-BR/live-map/directions?to=ll.-18.9140648%2C-48.2708671", lat: -18.9140648 as number | null, lng: -48.2708671 as number | null },
    // endereço, telefone e horário de Cachoeira Dourada: enviados pela Contábil em 24/11/2026 (resumo do Google; conferir a grafia)
    { cidade: "Cachoeira Dourada", uf: "GO", tipo: "Filial", endereco: "R. Osmar José García, 830", cep: "75560-000", telefone: "+55-64-3430-6397", horario: "Mo-Fr 08:00-18:00",
      waze: "https://www.waze.com/pt-BR/live-map/directions?to=ll.-18.4937355%2C-49.4781433", lat: -18.4937355 as number | null, lng: -49.4781433 as number | null },
  ],
};

/** Link do Waze para a rota até a unidade (o link oficial de cada uma; se faltar, busca pelo endereço). */
export const linkWaze = (f: { cidade: string; uf: string; endereco: string; waze?: string }) =>
  f.waze || `https://waze.com/ul?q=${encodeURIComponent(f.endereco ? `${f.endereco}, ${f.cidade} - ${f.uf}` : `Contábil Empresarial, ${f.cidade} - ${f.uf}`)}&navigate=yes`;

// O original tem 3 depoimentos num carrossel (setas anterior/próximo); só o 1º aparece ao carregar.
export const depoimentos = [
  { nome: "Ricardo Santos", cargo: "CEO, RS Tecnologia", texto: "A Contábil Empresarial transformou a gestão da minha empresa. Atendimento impecável e sempre disponível quando preciso." },
  { nome: "Ana Paula Oliveira", cargo: "Diretora, AP Consultoria", texto: "Migrei de contador e foi a melhor decisão. A equipe é extremamente competente e a plataforma digital facilita muito a vida." },
  { nome: "Carlos Mendes", cargo: "Fundador, CM Logística", texto: "Abriram minha empresa em tempo recorde. Profissionais sérios e comprometidos com resultados." },
];

export const areaCliente = {
  titulo: "Área do",
  destaque: "Cliente",
  subtitulo:
    "Acesse nossas plataformas de forma rápida e prática. Utilize os links abaixo para gerenciar suas informações contábeis e trabalhistas.",
  links: [
    { icon: "FileText", titulo: "ONVIO", descricao: "Acesse a plataforma ONVIO para gestão contábil.", url: "https://onvio.com.br/login/#/" },
    { icon: "User", titulo: "Portal do Empregado", descricao: "Acesse o portal do empregado para consultas e documentos.", url: "https://onvio.com.br/portaldoempregado/auth" },
  ],
};
