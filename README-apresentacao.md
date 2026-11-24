# Apresentação comercial (`/apresentacao`)

Apresentação em formato de página web para o Pedro (Gestor Comercial) usar nas reuniões e mandar por WhatsApp. Telas 16:9 que avançam para os lados, como slides. Briefing: [BRIEFING-apresentacao.md](BRIEFING-apresentacao.md) · conteúdo: [ROTEIRO-apresentacao.md](ROTEIRO-apresentacao.md).

A página é **oculta**: não aparece no menu nem em nenhum link do site, tem `noindex, nofollow` e fica fora do sitemap.

## Ver e testar

```bash
npm run dev
```

| Endereço | O que é |
|---|---|
| `http://localhost:4321/apresentacao` | A apresentação |
| `.../apresentacao?rascunho=1` | Mostra com contorno laranja tudo o que ainda está entre `[colchetes]` |
| `.../apresentacao#06` | Abre direto na tela 06 |
| `.../apresentacao/apresentador` (ou tecla `N`) | Modo apresentador (abre em outra janela) |
| `.../apresentacao?imprimir=1` | Versão para imprimir / salvar PDF (uma tela por página A4 deitada) |

## Onde editar

**Todo o conteúdo fica em [`src/data/apresentacao.ts`](src/data/apresentacao.ts)**: textos, falas, números, datas, contatos e fotos. Não é preciso mexer no layout para trocar um número.

- **Ligar ou desligar uma tela:** `ativo: true` / `ativo: false` na tela. O contador se ajusta sozinho (ex.: 13 telas).
- **Ligar ou desligar um item** (marco da história, serviço especializado, item da preparação etc.): `ativo` no próprio item.
- **Itens a validar:** `validado: false` (tela 10, crédito do Simples na tela 04), `destaqueValidado` (tela 07), `etapasValidadas` (tela 13). Depois de validar com a equipe, mude para `true`.
- **Datas da história (tela 06):** `conferido: false` até a data ser conferida na fonte oficial (planalto.gov.br, Banco Central, Imprensa Nacional).
- **Número de clientes:** um campo só, `numeroClientes`, usado em todos os lugares.
- **Data da informação da Reforma:** `reformaAtualizadoEm` (aparece no rodapé das telas 02 a 04).
- **Textos que vencem:** a lista `revisoes` tem o que mudar e a partir de quando (15/12/2026, janeiro e março de 2027). Quando a data passa, o checador acusa até a revisão ser marcada `feita: true`.
- **WhatsApp do botão final e do QR code:** `geral.whatsapp`. Hoje usa o geral (64) 3431-6397; troque pelo número comercial do Pedro e mude `comercialDefinido` para `true`.

### Fotos

Coloque os arquivos em `src/assets/apresentacao/` (parceiros em `src/assets/apresentacao/parceiros/`) e escreva o nome do arquivo no campo `arquivo` (ou `foto`/`logo`) correspondente. O site gera AVIF/WebP em vários tamanhos sozinho. Enquanto o campo for `null`, aparece um retângulo cinza marcado "FOTO — …".

- Só fotos de funcionários reais, com autorização de uso de imagem. Nada de banco de imagem.
- Retratos das gestoras ficam em preto e branco automaticamente.
- Tela 06: páginas do Diário Oficial (ato oficial, sem direito autoral) e cédulas (seguir as regras do Banco Central). **Nunca** capas ou recortes de jornal.

## Pendências e publicação

```bash
npm run checar-apresentacao
```

Lista tudo o que impede a publicação: colchetes, fotos faltando, itens a validar, datas a conferir e revisões vencidas.

- `publicar = false` (padrão, no topo de `src/data/apresentacao.ts`): o build de produção gera só uma página "em preparação" em `/apresentacao`. O resto do site publica normalmente.
- `publicar = true`: a apresentação vai para o build — e **o build falha** enquanto houver qualquer pendência.

## Como apresentar

| Ação | Tecla |
|---|---|
| Avançar | → · ↓ · Espaço · PageDown · Enter (o passador de slides usa PageDown/PageUp) |
| Voltar | ← · ↑ · PageUp |
| Primeira / última tela | Home / End |
| Ir para uma tela | digite o número e Enter (ex.: `6` Enter) |
| Tela cheia | F |
| Tela preta (pausa) | B (ou `.`, que muitos passadores usam) |
| Modo apresentador | N |

Rolagem do mouse e do touchpad avança **um passo por gesto**. No celular deitado ou no tablet, deslize para o lado. No celular em pé aparece "Gire o celular", com a opção de ver a versão em pé (telas empilhadas).

### Modo apresentador

Aperte `N` na apresentação (ou abra `/apresentacao/apresentador`). Abre uma segunda janela com a tela atual, o próximo passo, a **Fala** do roteiro, cronômetro e hora. As duas janelas ficam sincronizadas: avançar em qualquer uma avança a outra. Leve a apresentação para o projetor/TV (tela cheia com `F`) e deixe o modo apresentador no notebook.

A Fala **só existe** na página do apresentador; ela nunca é enviada para a tela do cliente.

### Sem internet

No site publicado, depois da primeira visita a página guarda sozinha os textos, a fonte e as imagens. Se a internet do cliente cair, a apresentação continua abrindo no mesmo navegador. Dica: abra a apresentação uma vez antes de cada reunião.

### PDF de reserva

Abra `/apresentacao?imprimir=1`, clique em "Imprimir / salvar PDF" (ou Ctrl+P), escolha "Salvar como PDF", papel A4 deitado e margens "Nenhuma". Marque "Gráficos de plano de fundo".
