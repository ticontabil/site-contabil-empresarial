# Pendências

O site foi clonado **como está** em 23/11/2026. Os itens abaixo foram encontrados no original e **não foram corrigidos**: ficam para decisão da Contábil Empresarial ou para o redesign.

## Conteúdo e textos

- [ ] **Título da aba com erro de grafia:** "Contabil Empres**á**rial". A meta description, o `og:title` e o `og:description` têm o mesmo erro ("Contábil Empresárial").
- [ ] **Depoimentos parecem exemplos.** O original tem **3 depoimentos** num carrossel (o briefing falava em 1, mas os outros 2 aparecem com as setas): "Ricardo Santos, CEO, RS Tecnologia", "Ana Paula Oliveira, Diretora, AP Consultoria" e "Carlos Mendes, Fundador, CM Logística". Confirmar se são clientes reais.
- [ ] **Foto do hero:** o texto alternativo diz "Josiney - Fundador da Contábil Empresarial", e a foto mostra um homem. Confirmar quem é e ajustar o alt.
- [ ] **"Sobre Nós" aponta para "Como Funciona"** (`#sobre`). Não existe seção sobre a empresa.
- [ ] **O FAQ cita serviços que não estão na lista de Serviços:** BPO Financeiro, ITR e LCDPR.
- [ ] **Promessa de redução de imposto:** o FAQ fala em "economia tributária" (Holding), "otimizando o pagamento de impostos" (importância do contador) e "Como posso reduzir os impostos da minha empresa?" (Dúvidas Rápidas). A diretriz da empresa é não prometer redução de imposto.
- [ ] **Fonte:** o site usa Inter. A identidade da marca usa Montserrat.
- [ ] **Filiais × "+40 cidades":** o site lista 6 filiais (Goiânia, Uberlândia, Goiatuba, Buriti Alegre, Cachoeira Dourada, Araporã). A apresentação comercial fala em "+40 cidades". Alinhar.
- [ ] **Itumbiara não aparece em "Nossas Filiais"**, mas é a sede (razão social "CONTABIL EMPRESARIAL ITUMBIARA LTDA", primeiro endereço do rodapé, vaga de Auxiliar de Atendimento e placa na foto do hero).
- [ ] **Idioma da página declarado como inglês** (`<html lang="en">`), e a página 404 está em inglês ("Oops! Page not found / Return to Home").
- [ ] **Copyright fixo em "© 2026"** (não atualiza sozinho).
- [ ] **"Agência Abelha" no rodapé** não é link.

## Comportamento

- [ ] **Bug do modo escuro.** O site tem dois controles de tema que brigam entre si: o do site (`theme`) e o da Auditoria Fiscal (`audit_theme`). O clone reproduz o mesmo comportamento:
  - quem usa o celular/computador em modo escuro abre o site com as **cores claras**, mas com o ícone de sol e a **logo branca, que quase some** no fundo claro;
  - o modo escuro só aparece depois de clicar no botão e **volta ao claro ao recarregar** a página.
- [ ] **Imagem de compartilhamento (OG) expirada.** O `og:image` do original é uma URL assinada do Google Storage que já venceu (responde 403), então o link compartilhado no WhatsApp/redes sai sem imagem. No clone foi colocada uma captura do topo do site original (`public/og-image.png`, 1200×630). Trocar por uma arte oficial.
- [ ] **`twitter:site` = "@Lovable"** e **meta author "Lovable"** no original. No clone ficou só o `twitter:site` (mesmas meta tags de compartilhamento), sem o author.
- [ ] **Formulário "Trabalhe Conosco" não envia o currículo.** Ele só abre o programa de e-mail (`mailto:rh@contabilempresarial.com.br`) com nome, cidade e estado civil. O arquivo escolhido em "Anexar Currículo" **não vai junto**: a pessoa precisa anexar de novo no e-mail. Em celular sem app de e-mail configurado, nada acontece além do aviso.
- [ ] **Foto do hero pesada:** `josiney.png` tem 3,1 MB (1216×1824). Mantida igual ao original.
- [ ] **Telefone/WhatsApp:** todos os botões usam `wa.me/556434316397`, que é um fixo (64) 3431-6397. Confirmar se esse número tem WhatsApp Business ativo.

## Vagas

- [ ] O briefing dizia que a grade de vagas estava **vazia**, mas em 23/11/2026 o site mostrava **3 vagas ativas** (Analista Fiscal em Goiânia, Analista Fiscal em Uberlândia, Auxiliar de Atendimento em Itumbiara). Elas foram copiadas para `src/data/vagas.ts`. Confirmar se continuam abertas; para tirar todas, deixar a lista vazia.
- [ ] No original as vagas eram editadas no painel `/admin/vagas`. No clone, editar `src/data/vagas.ts` e publicar de novo.

## Áreas não clonadas (dependem de login e do banco Supabase)

Estas rotas existem no site da Lovable e **não foram acessadas nem clonadas**:

- `/login`, `/reset-password`
- `/admin`, `/admin/vagas`, `/admin/filiais`: painel para editar vagas, filiais e contatos (tabelas `job_openings` e `site_content`)
- `/auditoria-fiscal`: ferramenta interna **"Auditoria Fiscal · Validador NF-e · PIS/COFINS"**, com usuários, níveis de acesso e histórico (tabelas `user_roles`, `profiles`, `audit_history`)

No clone, essas rotas dão a página 404.

> ⚠️ **Antes de trocar o domínio**, alguém da Contábil precisa confirmar se a equipe usa a Auditoria Fiscal. Se usar, ela não pode sair do ar: ou continua na Lovable num subdomínio (ex.: `auditoria.contabilempresarial.com.br`), ou é migrada à parte. Sem acesso à conta da Lovable, nem o subdomínio pode ser configurado do lado deles. Isso precisa ser resolvido primeiro.

## Contatos e endereços

No original, o telefone, o e-mail, a razão social, o CNPJ e os endereços do rodapé podiam ser alterados pelo painel (tabela `site_content`). O clone usa os valores que estavam publicados em 23/11/2026 (`src/data/site.ts`).
