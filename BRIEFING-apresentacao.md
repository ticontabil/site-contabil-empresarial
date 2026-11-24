# Briefing: página /apresentacao — Contábil Empresarial

> Para o Claude Code. Coloque este arquivo e o `ROTEIRO-apresentacao.md` na raiz do projeto do site e peça:
> "Leia BRIEFING-apresentacao.md e ROTEIRO-apresentacao.md e construa a página /apresentacao."

## 1. O que é

Uma apresentação comercial **em formato de página web**, que fica em `contabilempresarial.com.br/apresentacao`. O Pedro (Gestor Comercial) usa a página nas reuniões com possíveis clientes e também manda o link por WhatsApp.

- É uma **apresentação horizontal**: telas 16:9 que avançam para os lados, como slides. Não é uma página de rolagem vertical.
- Tem **14 telas**, seguindo o `ROTEIRO-apresentacao.md`. O texto do roteiro é a fonte do conteúdo.
- É uma **página oculta**: fica fora do menu do site, tem `noindex, nofollow` e não entra no sitemap.

### Links das referências (só a mecânica; detalhes na seção 6)

| Ref. | Link | O que aproveitar | Onde entra |
|---|---|---|---|
| A | https://substancetm.framer.website/ | **Só o começo (hero):** imagens vindo do fundo em túnel, contador de camadas, granulado, nome gigante na base | Telas 01 e 06 |
| B | https://rovellestudio.framer.website/ | **Só o hero:** carrossel curvo em cilindro + lista lateral com o item ativo em destaque | Tela 09 |
| C | https://avero.framer.media/ | **Só a faixa da equipe:** retratos P&B em cards escuros passando em loop | Tela 08 |
| D | https://atlasdesign.framer.ai/ | **Só o final:** bloco com gradiente e feixes de luz, chamada grande, botão em pílula, faixa de serviços e rodapé | Tela 14 |

Site atual da Contábil (dados e contatos oficiais): https://contabilempresarial.com.br

## 2. Onde construir

- Dentro do mesmo projeto Astro do site, em `src/pages/apresentacao/`, com **layout próprio** (sem o cabeçalho e o rodapé do site).
- Se o clone do site ainda não estiver pronto, construa em `apresentacao/` como projeto independente, organizado para ser movido para dentro do site depois.
- Todo o conteúdo fica em `src/data/apresentacao.json` (ou `.ts`): textos, falas, dados, datas de rodapé, contatos e caminhos de imagem. Para trocar um número, edita-se o arquivo de dados, não o layout.

## 3. Identidade visual (obrigatória)

As referências da seção 6 mostram **como** os efeitos funcionam. **Não copie as cores, as fontes, as imagens nem o código delas.** Tudo segue a identidade da Contábil:

- **Cores:** preto `#000000`, branco `#FFFFFF`, cinza `#C7C7C7`, cinza-claro `#F2F2F2` e laranja `#FB5D02`. O laranja é o **único** destaque. Não use vermelho nem outras cores das referências.
- **Tipografia:** só **Montserrat**. Os contrastes que as referências fazem misturando fontes (ex.: sem serifa + serifada em itálico) são feitos aqui com pesos diferentes da Montserrat: Black/ExtraBold contra Light/Thin.
- **Granulado:** uma textura de ruído bem sutil sobre o preto, nas telas escuras.
- **Rótulos:** números e marcadores entre parênteses, em caixa alta pequena e espaçada. Ex.: `(ATO 01)`, `(28.02.1986)`, `(03 / 14)`.
- **Slogan:** "Tradição que se traduz em resultados." Fundação em 1984.

## 4. O motor da apresentação

### Palco
- Palco fixo em 16:9 (base 1920×1080), escalado para caber em qualquer tela, com tarja preta quando a proporção for diferente (ex.: notebooks 16:10).
- Cada tela pode ter **passos internos**: elementos que entram um de cada vez antes de passar para a próxima tela.

### Navegação
- **Teclado:** → / ↓ / Espaço / PageDown avançam; ← / ↑ / PageUp voltam. O controle de apresentação (passador de slides) envia PageDown/PageUp, então tem que funcionar com ele.
- **Mouse e touchpad:** rolagem e deslize lateral avançam **um passo por gesto**, com trava para não pular várias telas de uma vez.
- **Toque:** deslizar para o lado.
- **Atalhos:** `F` tela cheia · `B` tela preta (pausa) · `Home`/`End` primeira/última tela · digitar o número + Enter vai para a tela.
- **Link direto:** a URL acompanha a posição (`/apresentacao#06`). Abrir esse link cai direto na tela.

### Progresso
- Barra fina na base com o contador `(ATO 01) 06 / 14` à esquerda. É discreta e não pode competir com o conteúdo.

### Modo apresentador
- `/apresentacao?modo=apresentador` (ou a tecla `N`) abre uma **segunda janela** com a tela atual, a próxima, a **Fala** do roteiro e um cronômetro. As duas janelas ficam sincronizadas (BroadcastChannel).
- **A Fala nunca aparece na tela do cliente.**

### Celular
- **Celular deitado:** funciona como no computador, com toque.
- **Celular em pé:** mostra um aviso "Gire o celular para ver a apresentação" e o botão "Ver versão em pé". A versão em pé empilha as telas na vertical, com os efeitos simplificados (sem túnel 3D, carrossel vira lista, faixa continua passando).

### Outros
- **`prefers-reduced-motion`:** todos os efeitos têm versão sem movimento (aparece/desaparece).
- **Sem internet:** um service worker guarda a página e as imagens depois da primeira visita, para o Pedro conseguir apresentar mesmo se a internet do cliente cair. Prever também uma rota de impressão (`?imprimir=1`) com uma tela por página A4 deitada, para gerar PDF de reserva.

## 5. Mapa das 14 telas

O conteúdo de cada tela (Na tela + Fala) está no `ROTEIRO-apresentacao.md`. Esta é a direção de cada uma:

| Tela | Conteúdo | Tratamento |
|---|---|---|
| 01 Capa | Tradição que se traduz em resultados | **Túnel** (ref. A): fotos reais da Contábil vindo do fundo; "CONTÁBIL EMPRESARIAL" enorme em laranja na base; fundo preto granulado |
| 02 A Reforma já começou | 5 → 3 tributos, CBS em jan/2027, 7 anos de transição | Tela escura; cada dado entra em um passo; números gigantes em laranja; linha do tempo 2026→2033 com marcador "Você está aqui" |
| 03 As datas mudam | "Já mudou" × "Em disputa" | Duas colunas como quadro de manchetes, data de cada item em destaque; itens entram em passos |
| 04 O que muda para sua empresa | Simples / Presumido e Real / Qualquer regime | Três blocos em passos; o contraste 1,84% × 11% em destaque grande |
| 05 A virada | "Quem espera a certeza chega atrasado." | Uma frase só, tela inteira, peso Black |
| 06 Nossa história | 1984 → 2026: moedas, planos, leis | **Túnel** (ref. A) com cédulas e páginas do DOU; ver seção 7 |
| 07 A força em números | 40+ anos, [500+] clientes, 40+ cidades, 70+ especialistas, 48 mil+ obrigações, 30+ segmentos | Números grandes em laranja com contagem animada; destaque "uma a cada 2 minutos e meio" |
| 08 O time | Estrutura de grande. Atendimento de perto. | Foto da equipe em tela cheia (revelação) → no passo seguinte, **faixa das gestoras** (ref. C) |
| 09 Quatro departamentos | Legalização, Pessoal, Fiscal, Contábil | **Carrossel curvo** (ref. B) em fundo claro `#F2F2F2` |
| 10 Preparação para a Reforma | "A gente acompanha por você." | Lista de entregas em passos. Só entram os itens com `ativo: true` no JSON (validação do Fiscal) |
| 11 Ecossistema de parceiros | 4 grupos de parceiros | Grupos em grade; logos dos parceiros quando houver |
| 12 Quem cresce com a gente | Resultados e depoimentos | **Desligada por padrão** (`ativo: false`). Só liga com dado real e autorizado. Nunca inventar depoimento |
| 13 Como começar | Conversa → Diagnóstico → Transição → Acompanhamento | 4 etapas numeradas `(01)`–`(04)` em passos |
| 14 Próximo passo | "Sua empresa está pronta para 2027?" | **Fechamento em gradiente** (ref. D) + rodapé com contatos |

Quando uma tela estiver desligada, o contador e a navegação se ajustam sozinhos (ex.: 13 telas).

## 6. Os quatro efeitos de referência

As referências são modelos do Framer. Use-as **só para entender a mecânica**.

### A. Túnel de imagens (telas 01 e 06)
Referência: o começo (hero) de https://substancetm.framer.website/
- Imagens espalhadas em profundidade (eixo Z). A cada passo, as imagens avançam em direção à tela; a da vez chega ao primeiro plano, e as outras continuam pequenas ao fundo ou passam pelas bordas.
- Contador de camadas no topo, centralizado, em caixa alta pequena.
- Na tela 01, o nome da empresa fica enorme na base, em laranja.
- Implementar com CSS 3D transforms + GSAP (ou equivalente leve). Sem WebGL, a não ser que o desempenho exija.

### B. Carrossel curvo (tela 09)
Referência: o hero de https://rovellestudio.framer.website/
- Cards dispostos num cilindro, girando no eixo Y. O card da frente fica nítido e os das laterais curvam e esmaecem.
- À direita, uma lista vertical com os itens. O item ativo fica num destaque claro, com categoria pequena em cima e uma linha de descrição embaixo; os vizinhos aparecem esmaecidos.
- Cada passo gira um card. Também aceita arrastar.
- Fundo claro `#F2F2F2`. O título da tela usa o contraste de pesos da Montserrat.
- Itens: os 4 departamentos do roteiro (Legalização, Pessoal, Fiscal, Contábil), cada um com uma foto da equipe do setor. Deixar no JSON a opção de incluir serviços especializados (Contabilidade Rural, Holding, BPO Financeiro, Consultoria), **desligados** até a Contábil confirmar.

### C. Faixa das gestoras (tela 08)
Referência: a faixa de equipe de https://avero.framer.media/
- Faixa horizontal em loop contínuo, com cards escuros de cantos arredondados.
- Cada card tem um retrato em **preto e branco** em cima e, embaixo, o nome, o cargo/setor em cinza e um pequeno ícone do setor (no lugar do ícone de LinkedIn da referência). Pode ter um detalhe em laranja.
- A faixa para quando o mouse passa por cima.
- Conteúdo: **as gestoras de cada setor**. No JSON: `{ nome, setor, foto }`, com placeholders até as fotos chegarem.
- Fotos: aplicar o mesmo tratamento P&B e tom em todas. **Não colocar WhatsApp pessoal** de ninguém.

### D. Fechamento em gradiente (tela 14)
Referência: o bloco final (antes do rodapé) de https://atlasdesign.framer.ai/
- Bloco com fundo em gradiente e feixes de luz diagonais. Aqui, o gradiente é feito **só com o laranja `#FB5D02`**, indo para versões mais escuras dele até o preto. Nada do vermelho da referência.
- Chamada grande em branco: "Sua empresa está pronta para 2027?"
- Botão em pílula: "Agendar meu Diagnóstico de Prontidão", que abre o WhatsApp com a mensagem pronta.
- Faixa passando embaixo: LEGALIZAÇÃO • PESSOAL • FISCAL • CONTÁBIL (e os serviços especializados, se ligados).
- Rodapé escuro: logo, slogan, WhatsApp, e-mail, os três endereços, `@contabilempresarial` e `contabilempresarial.com.br`. Um QR code para o WhatsApp comercial.
- WhatsApp do botão: **[número do Pedro — a definir]**. Até lá, usar o geral (64) 3431-6397.

## 7. Tela 06: a linha do tempo no túnel

A mensagem: *"Desde 1984 a Contábil já atravessou 6 moedas e 7 planos econômicos. A Reforma é a próxima travessia."*

Cada item é uma camada do túnel, com o rótulo de data no estilo `(28.02.1986) PLANO CRUZADO`. O contador no topo mostra a contagem: `MOEDA 03 / 06`.

**Conferir cada data na fonte oficial antes de publicar** (planalto.gov.br, Banco Central, Imprensa Nacional). As datas abaixo são o ponto de partida, não a versão final:

- 1984 — Fundação da Contábil (moeda: Cruzeiro)
- 28/02/1986 — Plano Cruzado: nasce o Cruzado
- 21/11/1986 — Cruzado II
- 12/06/1987 — Plano Bresser
- 16/01/1989 — Plano Verão: nasce o Cruzado Novo
- 05/10/1988 — Constituição Federal (o ICM vira ICMS). Ordenar cronologicamente com os demais
- 16/03/1990 — Plano Collor I: volta o Cruzeiro
- 31/01/1991 — Plano Collor II
- 01/08/1993 — Cruzeiro Real
- 01/07/1994 — Plano Real: nasce o Real
- 1996 — Lei Kandir e Simples Federal
- 1997–2007 — CPMF
- 2006–2007 — Simples Nacional (LC 123) e SPED
- 2018 — eSocial
- 2023 / 2025 — Reforma Tributária (EC 132/2023 e LC 214/2025)
- 2026 → "A Reforma é só a próxima travessia." Transição para a tela 07

Os marcos da própria Contábil (passagem de liderança, abertura das unidades) entram da mesma forma quando a Contábil informar os anos. Até lá, ficam desligados no JSON.

### Imagens dessa tela (regras de uso)
- **Páginas do Diário Oficial da União** com as leis e os decretos de cada plano. Atos oficiais não têm direito autoral (Lei 9.610/98, art. 8º, IV). Fonte: acervo da Imprensa Nacional. Usar as páginas reais, sem montagem.
- **Cédulas de cada moeda:** seguir as regras do Banco Central para reprodução de cédulas (em geral, tamanho diferente do original e sem frente e verso juntos). Conferir a norma vigente antes.
- **Proibido:** capas ou recortes de jornais (Folha, Estadão, O Globo etc.) sem licença, e **qualquer recorte falso** imitando jornal real. Se quiserem capas de jornal, elas precisam ser licenciadas nos acervos.

## 8. Regras de conteúdo

- **Colchetes `[ ]` do roteiro** viram placeholders visíveis (contorno laranja tracejado) no modo rascunho (`?rascunho=1`). Crie um script (`npm run checar-apresentacao`) que lista todos os colchetes restantes e faça o build de produção **falhar** enquanto houver algum.
- **Datas da Reforma:** cada tela com dado da Reforma mostra no rodapé a data da informação (campo `atualizadoEm` no JSON). O roteiro tem uma lista de textos que precisam mudar depois de 15/12/2026 e em janeiro de 2027. Deixe isso fácil de editar.
- **Sem percentual de economia de imposto.** Sem "o melhor", "líder", "incrível". Sem falar mal de outros contadores.
- **Depoimentos e casos:** só reais e autorizados. Nunca inventar.
- **Fotos de pessoas:** só funcionários reais, com autorização de uso de imagem. Até as fotos chegarem, use placeholders neutros e claramente marcados (ex.: retângulo cinza com "FOTO — Gestora do Fiscal"). Nada de fotos de banco de imagem com pessoas fingindo ser a equipe.
- **Números:** um único valor em todos os lugares (ex.: clientes: 400, 500 ou 700+ — está em aberto; usar o campo do JSON).

## 9. Desempenho e qualidade

- Primeira tela visível em menos de 2 s numa conexão 4G. Imagens em AVIF/WebP com tamanhos responsivos, carregamento antecipado só das próximas 2 telas.
- Animações a 60 fps num notebook comum. Testar com a CPU limitada (4×) no DevTools.
- Acessibilidade: textos reais (não imagens de texto), contraste AA, navegação toda por teclado, `aria-live` anunciando a tela atual.

## 10. Testes obrigatórios

1. Resoluções: 1920×1080, 1366×768, 1280×800 (tarja), 2560×1440; celular deitado e em pé (iPhone e Android).
2. Navegadores: Chrome, Edge, Safari e Firefox.
3. Teclado, controle de apresentação (PageDown/PageUp), rolagem de mouse, touchpad e toque.
4. Modo apresentador em duas janelas, sincronizado.
5. Funcionamento sem internet após a primeira visita.
6. `prefers-reduced-motion` ligado.
7. Gerar o PDF de reserva pela rota de impressão.
8. Salvar capturas de cada tela em `docs/apresentacao/` para aprovação do Hiago.

## 11. Segurança e publicação

- Não publicar e não alterar o DNS sem aprovação explícita do Hiago.
- Nunca pedir nem gravar senhas em código, commits ou chat.
- A página leva `noindex, nofollow`, fica fora do sitemap e não aparece em nenhum link do site.

## 12. Entregáveis

- A rota `/apresentacao` funcionando no projeto (`npm run dev` / `npm run build`).
- `src/data/apresentacao.json` com todo o conteúdo.
- `README` da apresentação: como editar textos e datas, como ligar e desligar telas e itens, como usar o modo apresentador e como gerar o PDF.
- Lista de pendências: colchetes restantes, fotos faltando e datas a conferir.
- Capturas em `docs/apresentacao/`.
