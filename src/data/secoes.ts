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

export const filiais = {
  titulo: "Nossas",
  destaque: "Filiais",
  subtitulo: "Estamos presentes em diversas cidades para atender você de perto.",
  cidades: [
    { cidade: "Goiânia", uf: "GO" },
    { cidade: "Uberlândia", uf: "MG" },
    { cidade: "Goiatuba", uf: "GO" },
    { cidade: "Buriti Alegre", uf: "GO" },
    { cidade: "Cachoeira Dourada", uf: "GO" },
    { cidade: "Araporã", uf: "MG" },
  ],
};

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
