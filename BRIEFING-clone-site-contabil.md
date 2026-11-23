# Briefing: clone do site da Contábil Empresarial

> Para o Claude Code. Coloque este arquivo na raiz da pasta do projeto e peça:
> "Leia BRIEFING-clone-site-contabil.md e execute com /reanimate."

## 1. Objetivo

Recriar **de forma fiel (pixel a pixel)** o site público https://contabilempresarial.com.br em código próprio, versionado no GitHub da empresa, para tirar o site da dependência da Lovable.

- Nesta etapa é um **clone**: mesmo visual, mesmo texto, mesmo comportamento. **Não corrigir nem melhorar nada.** Tudo o que estiver errado vai para o `PENDENCIAS.md` (seção 8).
- O redesign do site fica para depois. A próxima etapa é a página `/apresentacao` (seção 9).

## 2. Contexto (levantado em 23/11/2026)

- O site foi feito na **Lovable** (meta author "Lovable", imagens em `gpt-engineer-file-uploads`). A stack é React + Vite + Tailwind (padrão shadcn/ui) + Supabase.
- Ele é **servido pela Lovable via Cloudflare** (cabeçalhos `server: cloudflare` e `x-deployment-id`, além do script `/__l5e/events...js`). Não está na Hostgator. A Hostgator provavelmente cuida só do domínio e/ou dos e-mails. **Confirmar onde está o DNS antes de qualquer publicação.**
- A empresa **perdeu o acesso** à conta da Lovable: ficava com um ex-funcionário. Por isso, o clone tem que ser feito a partir do site publicado.
- Crédito no rodapé: "Site desenvolvido por Agência Abelha".

## 3. Escopo: o que clonar

### Página `/` (seções em ordem)

1. **Header fixo:** logo (versão negativa), menu (Serviços `#servicos`, Sobre Nós `#sobre`, Trabalhe Conosco `/trabalheconosco`, Área do Cliente `#cliente`), um botão de ícone e o botão "Falar com Especialista".
2. **Hero:** "Contabilidade para Empresas que Querem **Crescer**" (a última palavra em laranja), subtítulo, botões "Abra sua Empresa" (preenchido) e "Trocar de Contador" (contorno), e a foto à direita (`josiney-*.png`).
3. **`#servicos` Nossos Serviços:** 6 cards (Contabilidade em Geral, Consultoria, Contabilidade Rural, Assessoria Contábil, Constituição de Holding, Atendimento Personalizado).
4. **`#sobre` Como Funciona:** 3 passos (01 Cadastro, 02 Envio de Documentos, 03 Gestão Completa).
5. **`#filiais` Nossas Filiais:** Goiânia/GO, Uberlândia/MG, Goiatuba/GO, Buriti Alegre/GO, Cachoeira Dourada/GO, Araporã/MG.
6. **Depoimentos:** "O que nossos clientes dizem" (1 depoimento).
7. **`#cliente` Área do Cliente:** cards ONVIO (`https://onvio.com.br/login/#/`) e Portal do Empregado (`https://onvio.com.br/portaldoempregado/auth`).
8. **`#faq` Perguntas Frequentes:** acordeão com 8 perguntas.
9. **Rodapé:** "Dúvidas Rápidas" (acordeão com 3 perguntas), slogan "Contabilidade inteligente para empresas que querem crescer. Desde 1984.", links rápidos, contato, razão social, CNPJ, endereços, copyright e crédito.
10. **Botão flutuante de WhatsApp** (canto inferior direito).

### Página `/trabalheconosco`

- Título "Trabalhe **Conosco**" e subtítulo.
- Grade de vagas: hoje vem do banco (tabela `job_openings`) e **está vazia**. No clone, fica um arquivo de dados `vagas` (vazio), com o componente de card pronto.
- Formulário "Envie sua **Candidatura**": Nome Completo\*, Cidade\* (placeholder "Ex: Goiânia - GO"), Estado Civil\* (Solteiro(a), Casado(a), Divorciado(a), Viúvo(a)) e Anexar Currículo.
- Comportamento original: abre um `mailto:rh@contabilempresarial.com.br` com assunto "…Candidatura - Trabalhe Conosco" e o corpo `Nome: …\nCidade: …\nEstado Civil: …\n\nCurrículo em anexo.`, e mostra o toast "Redirecionando para o envio do e-mail!". Manter igual.

### Links exatos (copiar do site; não reescrever)

Todos usam `https://wa.me/556434316397`, cada um com uma mensagem pronta:

- **Falar com Especialista:** "Olá, gostaria de falar com um especialista da Contábil Empresarial. Podem me ajudar? 😊"
- **Abra sua Empresa:** "Olá! Quero abrir minha empresa com a Contábil Empresarial. Podem me orientar? 🏢"
- **Trocar de Contador:** "Olá! Estou pensando em trocar de contador. Podem me mostrar como a Contábil Empresarial pode ajudar? 🔄"
- **Botão flutuante:** "Oi, vi o site de vocês e quero saber mais sobre os serviços contábeis. 🚀"
- **Telefone do rodapé:** sem mensagem.

E-mail: `mailto:atendimento@contabilempresarial.com.br`.

### Textos do FAQ (copiar exatamente do site)

Abra cada item do acordeão e copie a resposta como está. São 11 perguntas no total: 8 na seção FAQ e 3 em "Dúvidas Rápidas".

## 4. Fora do escopo (não acessar, não clonar)

O site tem rotas que dependem de login e do banco de dados Supabase:

- `/login`, `/reset-password`
- `/admin` (subrotas `vagas`, `filiais`): painel de conteúdo
- `/auditoria-fiscal`: ferramenta interna **"Auditoria Fiscal · Validador NF-e · PIS/COFINS"**, com usuários, níveis de acesso e histórico (tabelas `user_roles`, `profiles`, `site_content`, `job_openings`, `audit_history`)

**Não tentar acessar essas áreas nem o Supabase.** Registrar no `PENDENCIAS.md` que elas existem.

⚠️ **Antes de trocar o domínio**, alguém da Contábil precisa confirmar se a equipe usa a Auditoria Fiscal. Se usar, ela não pode sair do ar: ou continua na Lovable num subdomínio, ou é migrada à parte.

## 5. Stack e organização

- **Astro + Tailwind**, gerando um site estático. Componentes: Header, Hero, Servicos, ComoFunciona, Filiais, Depoimentos, AreaCliente, FAQ, Footer, WhatsAppFlutuante, FormCandidatura.
- **Conteúdo separado do layout:** textos, serviços, filiais, FAQ, links e contatos ficam em `src/data/*.json` (ou `.ts`).
- **Tokens visuais extraídos do CSS publicado** (`/assets/index-*.css`): cores (laranja primário e gradiente `#ff4414 → #ff8c00`), raios, sombras, espaçamentos e tipografia (fonte atual: **Inter**).
- **Interatividade mínima em JS puro:** acordeões, menu mobile, header ao rolar, animações de entrada iguais às do original e toast do formulário.
- **Sem scripts de terceiros** além do necessário. Não copiar o script de analytics da Lovable (`/__l5e/...`).
- **Mesmas meta tags** (título, descrição, OG e Twitter). As imagens OG atuais são URLs assinadas e temporárias: baixar e servir localmente.

## 6. Assets

Baixar do site publicado e salvar em `public/`:

- `/assets/logo-negative-*.png` (logo)
- `/assets/josiney-*.png` (foto do hero)
- favicon e imagem OG
- ícones: o original usa ícones de linha no estilo lucide. Usar `lucide` com os mesmos ícones.

## 7. Verificação de fidelidade (obrigatória)

1. Capturar tela inteira do original e do clone em **1440px** (desktop) e **375px** (mobile), nas duas páginas.
2. Comparar lado a lado e ajustar até não haver diferença visível de layout, espaçamento, cor, fonte ou quebra de linha.
3. Testar: todos os links (WhatsApp com a mensagem certa, ONVIO, âncoras do menu), acordeões, menu mobile e o formulário (mailto).
4. Lighthouse: registrar a nota do original e a do clone.
5. Salvar as capturas comparativas em `docs/comparacao/`.

## 8. `PENDENCIAS.md`: registrar, não corrigir

- O título da aba diz "Contabil **Empresárial**" (erro de grafia).
- O depoimento "Ricardo Santos, CEO, RS Tecnologia" parece ser texto de exemplo. Confirmar se é cliente real.
- A foto do hero tem o alt "Josiney - Fundador da Contábil Empresarial", mas mostra um homem. Confirmar quem é.
- O menu "Sobre Nós" aponta para "Como Funciona". Não há seção sobre a empresa.
- O FAQ cita BPO Financeiro, ITR e LCDPR, que não estão na lista de serviços.
- O FAQ fala em "economia tributária" e "reduzir impostos". A diretriz da empresa é não prometer redução de imposto.
- A fonte do site é Inter. A identidade da marca usa Montserrat.
- O site lista 6 filiais. A apresentação comercial fala em "+40 cidades". Alinhar.
- Áreas não clonadas: admin, Auditoria Fiscal, login e vagas dinâmicas.

## 9. Preparar para a próxima etapa

- Reservar a rota `/apresentacao` (página da apresentação comercial do Pedro, Gestor Comercial). Ela não aparece no menu, leva `noindex` e fica fora do sitemap.
- Deixar a publicação preparada, mas **sem executar**: GitHub Actions publicando por FTP na Hostgator **ou** Vercel/Netlify/Cloudflare Pages. A escolha depende de onde estiver o DNS.

## 10. Regras de segurança

- Nunca pedir nem gravar senhas (cPanel, Hostgator, Registro.br, Lovable) em código, commits ou chat. Credenciais de deploy ficam apenas em GitHub Secrets, cadastradas pela própria empresa.
- **Não alterar o DNS nem publicar** sem aprovação explícita do Hiago e confirmação sobre a Auditoria Fiscal.
- Repositório **privado**, dentro da organização da Contábil Empresarial no GitHub.

## 11. Entregáveis

- Repositório com o projeto Astro funcionando (`npm run dev` / `npm run build`)
- `README.md` explicando como rodar, onde editar o conteúdo (`src/data`) e como publicar
- `PENDENCIAS.md`
- `docs/comparacao/` com as capturas original × clone
