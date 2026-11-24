// Telas que o Pedro escolheu NÃO mostrar (página /apresentacao/configurar). Guardado só no aparelho.
// Guarda as ocultas (e não as visíveis) para que uma tela nova apareça sozinha.
export const CHAVE_TELAS = "contabil-apresentacao-telas-ocultas";

export function lerOcultas(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_TELAS) || "[]");
    return new Set(Array.isArray(v) ? v.map(String) : []);
  } catch {
    return new Set();
  }
}

export function salvarOcultas(ocultas: Iterable<string>) {
  try {
    localStorage.setItem(CHAVE_TELAS, JSON.stringify([...ocultas]));
  } catch {}
}
