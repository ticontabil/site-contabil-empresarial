// npm run checar-apresentacao
// Lista colchetes, fotos faltando, itens a validar, datas a conferir e revisões vencidas.
// Sai com código 1 se houver alguma pendência que impede a publicação.
import { coletarPendencias, resumoPendencias } from "../src/lib/apresentacao-pendencias.ts";

const lista = coletarPendencias();
console.log(resumoPendencias(lista));
process.exit(lista.some((p) => p.bloqueia) ? 1 : 0);
