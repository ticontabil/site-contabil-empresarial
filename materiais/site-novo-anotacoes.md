# Site novo: anotações do Hiago (ainda não implementar)

Plano: construir em página oculta com senha; quando estiver pronta, vira a página principal.

## 1. Design, hero e menu
- O site principal passa a usar o **design da apresentação**.
- A **hero da apresentação substitui a hero do site institucional**.
- Na hero, entra um botão **"Falar com um especialista"**, adaptado ao visual da apresentação.
- Na hero, também uma opção para abrir o **feed de notícias** (a área /noticias continua no site novo).
- Na hero, uma opção escrita **"Portal"**, com link para outro site já montado: https://portal.contabilempresarial.com.br/
- **Menu:** fica no topo e **fixo**, no estilo da apresentação, com mudanças:
  - sai o texto "ATO" com o número das páginas;
  - **a linha continua**;
  - abaixo da linha aparece o **nome de cada página/seção**;
  - os nomes ficam **cinza** e ficam **laranja** quando aquela página/seção estiver sendo mostrada.

- **Menu da logo:** ao clicar na logo da Contábil, abre um menu com **Home** e as demais páginas,
  com **as palavras escritas** (não só ícones, como é na apresentação hoje).
- **Animação na logo** da Contábil ao clicar. Se precisar, o Hiago manda a logo em **SVG**.

## 2. Nossa História (logo depois da hero)
- Usar a **mesma seção da apresentação** (túnel com os recortes de jornal).
- Tirar o **ponto branco no meio** (ponto de fuga).
- Tirar a palavra **"(AVANÇAR)"** do lado direito.
- **Exceção à regra da rolagem:** Nossa História continua **por clique/toque** (cada clique avança um marco).
  Proposta: quem só rola a página passa direto para a próxima seção, sem ficar preso no túnel.
- Nas telas de toque (celular/tablet): avança **tocando**.
- No computador: avança **pela rolagem ou pelo clique**, os dois funcionam (a pessoa escolhe).

## 3. Nossos Serviços (depois de Nossa História)
- Entra a seção de serviços.
- **Pendente:** o Hiago ainda vai procurar uma referência de design para essa seção.

## 4. Números (tela A7 da apresentação)
- "Números que não se improvisam." (40+ anos, 700+ empresas, 40+ cidades, 70+ especialistas, 48 mil+ obrigações por ano, 30+ segmentos), com o contador girando.

## 5. Time (tela A8 da apresentação)
- "Estrutura de grande. Atendimento de perto." com as fotos das gestoras.

## 6. Como Começar (tela A12 da apresentação)
- Usar a tela A12 da apresentação: "Trocar de contabilidade é mais simples do que parece."
  Quatro passos: Conversa, Diagnóstico, Transição, Acompanhamento; fecha com "Vai abrir empresa? Começamos do zero, com você."

## 7. Nossas Unidades (seção 5 do site atual)
- Matriz Itumbiara + Goiânia, Uberlândia e Cachoeira Dourada, cada uma abrindo a rota no Waze.
- Mesmo conteúdo do site atual, no visual novo (da apresentação).

## 8. Perguntas Frequentes (seção 7 do site atual)
- Mesmas perguntas do site atual, no visual novo.

## 9. Produtos (antes do rodapé)
- Entram as **páginas dos produtos**, logo antes do rodapé.
- Resposta do Hiago: "pode separar" (entendido como: **cada produto com a sua página**; confirmar).
- **TekZap NÃO entra** (não é produto da Contábil). Tirar de tudo.
- **A confirmar:** quais são (provavelmente a tela A11 da apresentação, "Mais que contabilidade: um
  ecossistema de gestão", com os produtos/parceiros) e se cada produto tem página própria.

## Contato final (página final, junto do rodapé)
- Referência: https://aligno.framer.ai/#testimonials (a parte de contato/hero no fim da página).
- Quer algo parecido: uma **luz iluminando o rodapé**, um feixe de luz "em pé" (vertical) clareando a área de contato.
- Ao copiar: usar o /reanimate. Inspirar no efeito, sem copiar cores, fontes, textos ou código do site de referência.

## 10. Rodapé
- Continua **igual ao do site institucional** por enquanto (contatos, endereços, CRC, links).
- Única mudança: o **slogan** passa a ser **"Menos impostos. Mais inovação. Mais resultados."**

## Regra geral
- Todas as outras páginas do site institucional que forem aproveitadas (Notícias, Trabalhe Conosco,
  Privacidade, 404 etc.) são **adaptadas ao estilo da apresentação**. Só o rodapé fica como está.

## Transição entre seções
- A passagem de uma seção para outra é feita com uma **câmera 3D que se move** (movimento de câmera, não um simples deslizar).
- Referência confirmada: `G:\Meu Drive\Oncominas-completo-v1-1080p.mp4`. Pegar **o movimento da câmera / da visualização** (não o conteúdo do vídeo).
- Ao copiar o movimento da referência: usar o /reanimate.

## Responsividade
- Site responsivo para **desktop, tablet e celular**.
- Também para **telas de tamanhos e proporções diferentes**: monitor comum (16:9), monitor largo (21:9),
  notebook (16:10), TV, iPad (4:3), celular em pé e deitado. Nenhuma seção pode cortar, esticar ou sobrar
  vazia por causa do formato da tela.

## Gestores
- Resolvido: os gestores já estão na **seção 5 (Time, tela A8)**: Márcio, Michele, Naiara, Bruna,
  Ana Julia, Vanessa, Marina e Pedro, com foto, nome e área. Não precisa de seção nova.

## Sem cliques: tudo acontece na rolagem
- Não é mais apresentação: **nada aparece por clique/passo**. Números, textos e animações entram sozinhos
  conforme a pessoa rola a página.

## Vídeo "antes e depois da Contábil" controlado pela rolagem
- O vídeo que já está na apresentação (antes e depois da Contábil) entra no site.
- Ele **avança quando a pessoa rola para baixo e volta quando rola para cima** (scroll video, quadro a quadro).
- Usar a skill scroll-video na hora de construir. Posição na página: a confirmar.

## Revisão de 25/11/2026 (feita)
- Computador e tablet: páginas na **horizontal** (uma por vez); celular: **vertical**.
- Sem barra de rolagem; menu de cima removido; **linha do tempo embaixo** com o nome de cada página
  (cinza; laranja na atual).
- Logo no canto superior direito, **com animação** (nasce de uma linha de luz, brilho de tempos em tempos,
  pulo ao clicar); menu da logo com **ícone + nome**. (Logo em SVG melhoraria a animação: pedir ao Hiago.)
- Hero: slogan "Menos impostos. Mais inovação. Mais resultados." no lugar da frase; **faixa de produtos**
  passando em loop (sem TekZap); página de Produtos do fim removida.
- Vídeo da fachada: só **DESDE 1984** grande, no estilo do design.
- Troca de página: câmera recua, **desfoque de lente** e o **preto engole** o conteúdo.
- Contato: clone do hero da Aligno (/reanimate em .reanimate/aligno-rodape): título que pisca, **luz que pisca
  e acende**, **partículas**, grade de guias, e o **rodapé começa deitado e fica em pé** com a rolagem.
- Sem o botão flutuante do WhatsApp.
- Pendente: referência da transição de câmera (vídeo Oncominas, minuto a confirmar) e referência de Serviços.

## Pacote de mudanças (anotado em 26/11/2026; ainda NÃO fazer)

### 1. Nossa História
- Tirar/trocar o contador **"(MOEDA 01 / 06)"** do canto superior direito: não está interessante.
- **Celular (em pé):** o primeiro recorte começa **maior**, em destaque, com os outros **desfocados atrás**.
  Quando a pessoa avança, ele **passa para a direita desfocando** e a câmera segue normal pelos outros.
  (No computador pode ficar como está.)
- **Celular deitado (horizontal):** está pior ainda; precisa arrumar. Hiago vai mandar o print.
- Observado no print do celular: a logo do canto e a faixa de produtos ficam por cima uma da outra no topo
  da seção; o nome "NOSSA HISTÓRIA" do mapa da esquerda encosta nos recortes.
- **Celular deitado (print do Hiago):** a tela é baixa e tudo se sobrepõe: título "Do lado de quem já
  atravessou todas." por cima do rótulo "(NOSSA HISTÓRIA)", do contador e dos recortes; o texto de apoio
  corre por baixo dos recortes; "ITUMBIARA, GO — (C) 1984 / coordenadas" encosta no recorte; "DESDE 1984"
  gigante cortado embaixo; a faixa de produtos do Início ainda aparece no topo com a logo por cima.
  → **Diminuir os textos** e reorganizar para caber nessa altura.
  → Mesmo comportamento pedido para o celular em pé: **só o primeiro recorte grande**, os outros desfocados
  atrás; ao avançar ele sai para a direita desfocando e segue a câmera normal.

### 2. Bordas da tela: o conteúdo some no preto, desfocando (site inteiro)
- Referência: vídeo do app do Hiago (C:\Users\User\Downloads\Screen_Recording_20261126_100522.mp4, leitura de Lucas 18).
  Nas **duas bordas da tela (topo e base)** o texto vai **sumindo/desvanecendo** (fade), em vez de ser cortado seco:
  embaixo ele vai aparecendo ao subir, em cima ele vai sumindo ao sair.
- No nosso site: além de sumir no preto, o conteúdo **desfoca** perto das bordas e ganha **aberração cromática**
  (o mesmo charme dos recortes). Adaptar ao layout (preto/laranja).
- Vale para **todas as versões**: computador, tablet e celular.
- Ao copiar: usar o /reanimate no vídeo para medir a altura da faixa de fade em cima e embaixo.

### 3. Fotos da capa (túnel da hero): trocar por fachadas das filiais
- Trocar as fotos que passam na capa por **fotos das fachadas das unidades** (matriz e filiais).
- Sair: a foto do **Josiney sozinho** (fachada-josiney.png) e a da **moça sozinha** (provável filial-uberlandia.jpg,
  a moça na calçada; confirmar com o Hiago se é essa ou a equipe-atendimento.jpg).
- O Hiago vai mandar as fotos: **verticais (9:16)**. Recortar cada uma no formato do quadro da capa
  (hoje 720×470, deitado; ele chamou de "quadrado" e disse que pode manter o formato do quadro),
  enquadrando bem a fachada.
- **Fotos recebidas (26/11/2026)**, guardadas em materiais/fachadas/: itumbiara.jpg, goiania.jpg, uberlandia.jpg,
  cachoeira-dourada.jpg (1080×1920, verticais).
  - Cada foto tem o **nome da cidade escrito embaixo** ("Goiânia - GO" etc.): o recorte deve deixar esse texto de fora
    (ou reaproveitar o nome como legenda nossa, no estilo do visor da capa).
  - Enquadramento sugerido: Itumbiara = entrada com o toldo laranja e a placa; Goiânia = prédio + marquise do nº 1296;
    Uberlândia = a esquina com as placas pretas; Cachoeira Dourada = fachada com a placa e a vitrine laranja.
  - Atenção: na vitrine de Cachoeira Dourada aparece a lista antiga de filiais (Goiatuba, Buriti Alegre, Araporã)
    e a placa tem o CRC/GO 026227/O-7; no recorte da capa fica pequeno, mas vale saber.

### 4. Final da página (contato + rodapé) no celular
- O Hiago achou que não está bacana. Conferido em 390×844:
  - o cartão do rodapé fica **mais largo que a tela** e sai cortado à direita (e-mail, endereços, "Uberlândia" cortados);
  - os endereços em 2 colunas não cabem: passar para 1 coluna;
  - o mapa da esquerda (pontos + "CONTATO") fica por cima do conteúdo;
  - os pontinhos laranja da grade de guias caem em cima de "Contabilidade desde 1984";
  - a luz do teto fica pequena e o efeito de deitar/levantar quase não aparece;
  - a lista de links ocupa muito espaço vertical.
  → Refazer o layout do contato/rodapé para o celular (cartão na largura da tela, colunas empilhadas, textos menores,
    luz e cartão em pé proporcionais).
- **Referência (print da Aligno, materiais/ref-aligno-painel-fade.png):** a seta vermelha marca a **parte de baixo do
  painel sumindo no fundo**: o cartão não termina numa borda seca, ele vai **desvanecendo para o preto** de baixo para
  cima (do meio do cartão até a base), com o brilho laranja aparecendo por trás. Fazer igual no nosso cartão do
  rodapé (mesma ideia do item 2, aplicada na base do cartão).
  - (Também aparece na referência, não pedido ainda: etiquetas flutuando em volta do painel e a faixa de logos
    "Trusted by…" embaixo.)
- **Pedido (26/11/2026), para o pacote:** deixar o final igual à referência da Aligno (https://aligno.framer.ai/), com o
  nosso rodapé no lugar do painel:
  1. **Faixa dos nossos produtos passando** embaixo do cartão, como a fileira de logos "Trusted by 2 million+ teams"
     (logos em cinza, passando em loop, sumindo nas pontas). Sem TekZap. Pode ter uma frase curta em cima, no lugar
     do "Trusted by…" (sugestão: "(ECOSSISTEMA CONTÁBIL)" ou "Parceiros e produtos que usamos com você"; confirmar).
  2. **Degradê**: o cartão do rodapé vai sumindo no fundo da metade para baixo, como o painel deles.
  3. **Luz central ATRÁS do cartão** (hoje não aparece bem): o brilho laranja deve ficar por trás do rodapé, vazando
     pelas bordas e pela parte que some no degradê, como na referência.
  4. Ajustar o cartão do rodapé para ficar mais interessante nesse papel de "painel" (medir na referência com o
     /reanimate: posição, largura, raio, borda, sombra).

### 5. Feed de notícias (/noticias e /noticia) no design novo
- Notícia **sem foto**: não mostrar a capa temática/"foto vazia"; o cartão fica só com texto (título, resumo, fonte, data).
- Notícia **com foto** (fontes oficiais): mantém a fotinha, com o crédito.
- Redesenhar a lista e a página da notícia no **estilo do site novo** (preto/laranja, Montserrat, rótulos entre
  parênteses, numeração, desfoque nas entradas), procurando **referências** de feed/jornal/blog editorial para ficar
  mais interessante. Usar o /reanimate se copiar movimento de alguma referência.
- Manter o que já funciona: resumo + link para a fonte, filtros por tema, busca, atualização a cada 15 min, aberto a todos.
- **Pedido (26/11/2026), contato:** tirar a frase **"✦ Contabilidade desde 1984"** que fica debaixo da luz.
  No lugar do título **"Contábil"**, colocar a **logo da Contábil inteira em branco** (inclusive o "EMPRESARIAL",
  hoje laranja na logo). A logo começa **no escuro, apagada**, e **acende junto com a luz** do teto (pisca quando a luz
  pisca e fica acesa quando ela fica). Com a logo em SVG dá para fazer o brilho por partes; com o PNG, faço a
  versão branca e o acende/apaga da logo inteira.
  - **Luz realista e interativa (26/11/2026):** a luz do teto deve **iluminar de fato a logo**: só a parte onde o cone
    bate fica clara (topo mais claro, perdendo força para baixo e para as bordas, tom quente), o que fica fora do cone
    continua escuro. Quando a luz apaga/pisca, a iluminação da logo some/pisca junto. Leve: feito com camadas e
    máscaras (CSS/SVG) e opacidade, sem WebGL nem cálculo por quadro; respeitar "reduzir movimento".
    Opcional a confirmar: a luz acompanhar levemente o mouse/inclinação do celular.

### Pacote de 26/11/2026: FEITO e publicado (itens 1 a 5)
- Pendências que ficaram: logo em SVG (para a luz iluminar por partes), luz seguindo o mouse (opcional, não confirmado), referência da câmera Oncominas e de Serviços.
