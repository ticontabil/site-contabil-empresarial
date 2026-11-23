# Site da Contábil Empresarial

Código do site público [contabilempresarial.com.br](https://contabilempresarial.com.br), recriado em Astro + Tailwind a partir do site publicado pela Lovable (23/11/2026). Nesta etapa é um **clone fiel**: mesmo visual, mesmos textos, mesmo comportamento. Os problemas encontrados estão em [PENDENCIAS.md](PENDENCIAS.md).

## Como rodar

Precisa do [Node.js](https://nodejs.org) 22.23 ou mais novo.

```bash
npm install
npm run dev       # abre em http://localhost:4321 e atualiza ao salvar
npm run build     # gera o site estático em dist/
npm run preview   # serve o dist/ para conferir antes de publicar
```

## Páginas

| Rota | Arquivo | Observação |
|---|---|---|
| `/` | `src/pages/index.astro` | Página inicial |
| `/trabalheconosco` | `src/pages/trabalheconosco.astro` | Vagas + formulário de candidatura |
| `/apresentacao` | `src/pages/apresentacao.astro` | Reservada para a apresentação comercial. Fora do menu, `noindex`, fora do sitemap |
| 404 | `src/pages/404.astro` | Igual à do original |

## Onde editar o conteúdo

Todo o texto fica em `src/data/`. Não é preciso mexer nos componentes para trocar conteúdo.

| Arquivo | O que tem |
|---|---|
| `src/data/site.ts` | Título e meta tags, menu, links de WhatsApp (com as mensagens prontas), texto do topo, telefone, e-mails, razão social, CNPJ, endereços, rodapé |
| `src/data/secoes.ts` | Serviços, Como Funciona, Filiais, Depoimentos, Área do Cliente (ONVIO) |
| `src/data/faq.ts` | Perguntas Frequentes (8) e Dúvidas Rápidas do rodapé (3) |
| `src/data/vagas.ts` | Vagas abertas e opções de estado civil do formulário. Lista vazia `[]` = nenhuma vaga |
| `src/data/icons.ts` | Ícones (lucide) copiados do site original. Gerado, não editar à mão |

Os links de WhatsApp levam a mensagem já codificada para URL (`%20` = espaço etc.). Para mudar uma mensagem, use um codificador de URL ou `encodeURIComponent("texto")` no console do navegador.

Imagens ficam em `public/`: `logo.png`, `logo-negative.png` (versão para fundo escuro), `josiney.png` (foto do topo), `favicon.ico` e `og-image.png` (imagem de compartilhamento).

## Estrutura

```
src/
  components/   Header, Hero, Servicos, ComoFunciona, Filiais, Depoimentos,
                AreaCliente, FAQ, Footer, WhatsAppFlutuante, FormCandidatura,
                Accordion, SectionTitle, Icon
  data/         conteúdo (ver acima)
  layouts/      Base.astro (head, meta tags, tema, área do aviso/toast)
  pages/        rotas
  scripts/      site.ts: interatividade em JS puro (tema, menu mobile, acordeões,
                carrossel de depoimentos, brilho do topo, formulário e aviso)
  styles/       global.css: cores, gradiente laranja e animações extraídos do CSS original
tailwind.config.mjs  mesma configuração (shadcn/ui) do original
```

Sem scripts de terceiros: o script de analytics da Lovable (`/__l5e/...`) e o Supabase não foram copiados. O único recurso externo é a fonte Inter (Google Fonts), igual ao original.

## Fidelidade ao original

Comparação feita com Playwright no Chromium, nas larguras 1440 px e 375 px. As capturas e os relatórios estão em [`docs/comparacao/`](docs/comparacao/):

- **Páginas inteiras** (`/` e `/trabalheconosco`, desktop e celular): 0,00% de pixels diferentes, mesma altura de página.
- **Estados interativos** (`docs/comparacao/estados/`): modo escuro, troca de tema, acordeões abertos e trocando, Dúvidas Rápidas no celular, menu mobile, setas dos depoimentos, hover dos cards, brilho do topo seguindo o mouse e os dois avisos do formulário. Todos com 0,00% (a única diferença é de 17 px de suavização de fonte numa linha).
- **Animação de entrada do topo:** 37 quadros a 30 fps, 0,00% de diferença e erro de tempo 0 s.
- **Links:** todos os `href`/`target` idênticos ao original (WhatsApp com a mensagem certa, ONVIO, âncoras, e-mail).
- **Lighthouse** ([`docs/comparacao/lighthouse.md`](docs/comparacao/lighthouse.md)): celular 37 → 89 em Performance (LCP 5,5 s → 3,0 s); desktop 74 → 75; Acessibilidade, Boas práticas e SEO iguais.

Única diferença técnica (invisível) em relação ao original: a foto do topo e a logo da versão escura usam `loading="lazy"`. No celular a foto fica escondida, e sem isso ela (3 MB) era baixada logo de início e atrasava a fonte.

## Como publicar

> **Não publique nem altere o DNS** sem aprovação do Hiago e sem resolver a questão da Auditoria Fiscal (ver [PENDENCIAS.md](PENDENCIAS.md)).

### Situação atual do domínio (verificado em 23/11/2026)

- Os **servidores de DNS** do domínio estão na **VPS da Hostgator** (`ns1.vpsbr-15913445.vpshostgator.com.br` e `ns2...`). Então os registros são editados no painel da VPS (WHM/cPanel), não no Registro.br.
- O **e-mail** também está na VPS (MX `mail.contabilempresarial.com.br`). Não mexer nos registros MX e de e-mail.
- O **site** responde pela Cloudflare da Lovable. Só o registro do site (`@` e `www`) aponta para lá.

### Opção A: Hostgator (FTP), mesmo servidor do e-mail

O workflow `.github/workflows/deploy-hostgator-ftp.yml` está pronto, mas **só roda manualmente** e pede que se digite `PUBLICAR`.

1. A empresa cadastra no GitHub (Settings → Secrets and variables → Actions): `FTP_SERVER`, `FTP_USERNAME`, `FTP_PASSWORD` e, se a pasta não for `public_html`, `FTP_REMOTE_DIR`. **Nunca** colocar senhas no código, em commits ou no chat.
2. Rodar o workflow em Actions → "Publicar na Hostgator (FTP)".
3. O arquivo `public/.htaccess` já faz `/trabalheconosco` funcionar e usa a página 404 no Apache.
4. Testar pelo IP/URL temporária da hospedagem e só então apontar `@` e `www` para a VPS.

### Opção B: Cloudflare Pages, Netlify ou Vercel

Conectar o repositório no painel do serviço com: comando de build `npm run build`, pasta de saída `dist`, Node 22. O `vercel.json` já liga as URLs sem `.html` na Vercel; Cloudflare Pages e Netlify fazem isso sozinhos. Depois, criar no DNS da VPS o registro que o serviço indicar para `@` e `www`.

O workflow `.github/workflows/build.yml` só confere se o site compila a cada push; não publica nada.

## Ferramentas de verificação

A pasta `.reanimate/` (fora do Git) guarda as capturas brutas e os scripts usados na comparação (`.reanimate/tools/`). Com o `npm run preview` rodando, `bun .reanimate/tools/compare-pages.ts <pasta>` repete a comparação de páginas inteiras.
