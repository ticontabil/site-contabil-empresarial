import { defineConfig } from "astro/config";
import { existsSync } from "node:fs";
import sitemap from "@astrojs/sitemap";
import { coletarPendencias, resumoPendencias } from "./src/lib/apresentacao-pendencias.ts";
import { publicar } from "./src/data/apresentacao.ts";

/** Trava da apresentação: com `publicar = true`, o build falha enquanto houver pendências. */
const travaApresentacao = {
  name: "trava-apresentacao",
  hooks: {
    "astro:build:start": ({ logger }) => {
      const lista = coletarPendencias();
      const bloqueantes = lista.filter((p) => p.bloqueia);
      if (publicar === "restrito") {
        // publicada atrás da senha do servidor: o portão precisa ir junto, senão a página ficaria aberta
        if (!existsSync("public/apresentacao-portao.php")) throw new Error("publicar = \"restrito\" exige public/apresentacao-portao.php (senha).");
        logger.warn(`Apresentação publicada COM SENHA (publicar = "restrito"). Colchetes escondidos. ${bloqueantes.length} pendência(s) seguem como aviso — npm run checar-apresentacao.`);
        return;
      }
      if (publicar && bloqueantes.length) {
        throw new Error(
          `A apresentação está marcada para publicar, mas ainda tem pendências.
${resumoPendencias(lista)}
` +
            "Resolva em src/data/apresentacao.ts ou volte `publicar` para false.",
        );
      }
      logger.info(
        publicar
          ? "Apresentação publicada (sem pendências)."
          : `Apresentação NÃO publicada (publicar = false): /apresentacao sai como "em preparação". ${bloqueantes.length} pendência(s) — rode npm run checar-apresentacao.`,
      );
    },
  },
};

export default defineConfig({
  site: "https://contabilempresarial.com.br",
  // /trabalheconosco (sem barra final), igual ao original
  trailingSlash: "never",
  // esconde a barra de ferramentas do Astro no npm run dev (ela nunca vai para o site publicado)
  devToolbar: { enabled: false },
  build: { format: "file" },
  integrations: [
    travaApresentacao,
    sitemap({
      // /apresentacao fica fora do sitemap (noindex)
      filter: (page) => !page.includes("/apresentacao") && !page.includes("/404"),
    }),
  ],
});
