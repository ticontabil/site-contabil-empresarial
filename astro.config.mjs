import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://contabilempresarial.com.br",
  // /trabalheconosco (sem barra final), igual ao original
  trailingSlash: "never",
  // esconde a barra de ferramentas do Astro no npm run dev (ela nunca vai para o site publicado)
  devToolbar: { enabled: false },
  build: { format: "file" },
  integrations: [
    sitemap({
      // /apresentacao é reservada e fica fora do sitemap (noindex)
      filter: (page) => !page.includes("/apresentacao") && !page.includes("/404"),
    }),
  ],
});
