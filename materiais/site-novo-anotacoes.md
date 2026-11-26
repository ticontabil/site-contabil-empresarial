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
