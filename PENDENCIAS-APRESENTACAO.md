# Pendências da apresentação

Gerado por `npm run checar-apresentacao` em 23/11/2026. Rode o comando de novo para a lista atualizada.

Enquanto houver itens marcados com ✗, a apresentação não vai ao ar (`publicar = true` faz o build falhar).

```
Apresentação: 27 pendência(s) que impedem a publicação, 18 aviso(s).

✗ Validar com a equipe (6)
   - telas.impacto.tela.blocos[0]: Quem compra de você recupera de 0,62% a 1,84% em crédito. De um fornecedor do regime regul
   - telas.preparacao.tela.itens[0]: Notas e cadastros no padrão de IBS e CBS.
   - telas.preparacao.tela.itens[1]: Simulação do impacto em preço, margem e crédito.
   - telas.preparacao.tela.itens[2]: No Simples, a escolha entre recolher dentro ou fora do DAS, com números, a cada janela.
   - telas.preparacao.tela.itens[3]: Aviso do que muda e quando, antes de virar problema.
   - telas.preparacao.tela.itens[4]: Plano ano a ano até 2033.

! Imagem do DOU opcional (hoje aparece a ficha do ato) (15)
   - telas.historia.marcos[0].imagem: Cédula do Cruzeiro (1984)
   - telas.historia.marcos[1].imagem: DOU de 28/02/1986, Seção 1, p. 3085
   - telas.historia.marcos[2].imagem: DOU de 24/11/1986, p. 17553 e 17561
   - telas.historia.marcos[3].imagem: DOU de 13/06/1987, p. 9214
   - telas.historia.marcos[4].imagem: DOU nº 191-A, de 05/10/1988
   - telas.historia.marcos[5].imagem: DOU de 16/01/1989, p. 845
   - telas.historia.marcos[6].imagem: DOU de 16/03/1990, Seção 1, p. 5546
   - telas.historia.marcos[7].imagem: DOU de 01/02/1991, Seção 1, p. 2313
   - telas.historia.marcos[8].imagem: DOU de 29/07/1993, Seção 1, p. 10714
   - telas.historia.marcos[9].imagem: DOU de 30/06/1994, Edição Extra, p. 9761
   - telas.historia.marcos[10].imagem: DOU de 16/09/1996, p. 18261
   - telas.historia.marcos[11].imagem: DOU de 25/10/1996, p. 21877
   - telas.historia.marcos[12].imagem: DOU de 15/12/2006, p. 1
   - telas.historia.marcos[13].imagem: DOU de 12/12/2014, p. 4
   - telas.historia.marcos[17].imagem: DOU de 21/12/2023, Seção 1, p. 1

✗ Conferir data na fonte oficial (3)
   - telas.historia.marcos[8]: Nasce o Cruzeiro Real.
   - telas.historia.marcos[11]: A contribuição sobre movimentação financeira.
   - telas.historia.marcos[13]: Folha e obrigações trabalhistas no digital.

✗ Validar a conta do destaque (expediente de 8 h?) (1)
   - telas.numeros.tela: Números que não se improvisam.

✗ Colchete (8)
   - telas.time.tela.gestoras[0].nome: [Nome da gestora]
   - telas.time.tela.gestoras[1].nome: [Nome da gestora]
   - telas.time.tela.gestoras[2].nome: [Nome da gestora]
   - telas.time.tela.gestoras[3].nome: [Nome da gestora]
   - telas.time.fala: [você tem um time de referência e fala com ele pelo canal X]
   - telas.proximoPasso.tela.ofertaDetalhes[0]: [o que entrega: notas e cadastros, simulação do impacto, recomendação de regime]
   - telas.proximoPasso.tela.ofertaDetalhes[1]: [prazo de entrega]
   - telas.proximoPasso.tela.ofertaDetalhes[2]: [sem custo?]

✗ Foto faltando (8)
   - telas.time.tela.gestoras[0]: Legalização
   - telas.time.tela.gestoras[1]: Pessoal
   - telas.time.tela.gestoras[2]: Fiscal
   - telas.time.tela.gestoras[3]: Contábil
   - telas.departamentos.tela.itens[0].foto: Equipe de Legalização
   - telas.departamentos.tela.itens[1].foto: Equipe do Pessoal
   - telas.departamentos.tela.itens[2].foto: Equipe do Fiscal
   - telas.departamentos.tela.itens[3].foto: Equipe do Contábil

! Logo opcional (2)
   - telas.parceiros.tela.grupos[0].parceiros[2]: Capacita Contabilidade
   - telas.parceiros.tela.grupos[2].parceiros[0]: TekZap

✗ Validar as etapas com o comercial (1)
   - telas.comoComecar.tela: Trocar de contabilidade é mais simples do que parece.

! WhatsApp comercial (1)
   - geral.whatsapp: Número do Pedro a definir; usando o geral (64) 3431-6397
```

## Também a confirmar (fora do checador)

- **Fachada da matriz (capa):** usei a foto enviada no chat (entrada com a placa da Contábil e a marquise laranja), enquadrando sem a placa do escritório de advocacia.
- **Foto da equipe (tela 08):** hoje é um quadro do vídeo institucional (três vistas do escritório). Uma foto da equipe reunida, horizontal, fica melhor em tela cheia.
- **Gestoras (tela 08):** 8 fotos recebidas no chat; faltam os arquivos, os nomes e o setor de cada uma. Faltam também as fotos dos dois sócios.
- **Tela 06:** datas e atos conferidos no LexML (Senado/Câmara). Cada marco mostra a ficha do ato oficial. As páginas do DOU de 1990 em diante podem ser baixadas à mão (o site tem verificação contra robôs): links em `materiais/dou/LEIA.md`. De 1984 a 1989 não há página oficial digitalizada. Cédulas só com aprovação prévia do Banco Central (Lei 4.511/1964, art. 13). Recortes de jornal (como a página da Folha que aparece no vídeo institucional) não entram sem licença do acervo.
- **Correções feitas no roteiro:** Cruzado II são os Decretos-Leis 2.290 e 2.303 (não 2.288); o DL 2.283 do Cruzado foi substituído pelo DL 2.284; o eSocial é o Decreto 8.373, de 11/12/2014.
- **Safari e Firefox:** não testados (não instalados nesta máquina). Testado em Chrome e Edge.
- ~~Número de clientes~~ — confirmado: +700 clientes ativos (23/11/2026).
- ~~Tela 12 (depoimentos)~~ — decidido: a apresentação segue sem depoimentos; a tela fica desligada.
- **Logos de TekZap e Capacita Contabilidade:** não estavam no PDF; aparecem pelo nome na faixa.
