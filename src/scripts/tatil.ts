// Resposta tátil (vibração curta) nos toques em telas touch.
// - Android: navigator.vibrate.
// - iPhone (iOS 18+): o Safari não tem vibrate; usa o "switch" do iOS escondido, que dá um toque leve no motor.
// - iPad não tem motor de vibração: lá não há o que fazer.
export const tatil: () => void = (() => {
  if (typeof document === "undefined") return () => {};
  if (typeof navigator.vibrate === "function") return () => { try { navigator.vibrate(12); } catch {} };
  const caixa = document.createElement("div");
  caixa.setAttribute("aria-hidden", "true");
  caixa.style.cssText = "position:fixed;left:-200px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none";
  caixa.innerHTML = '<input type="checkbox" switch id="sn-tatil" tabindex="-1"><label for="sn-tatil"></label>';
  document.body.append(caixa);
  const l = caixa.querySelector("label")!;
  return () => l.click();
})();

// toque em botão, link, item do menu, pergunta (acordeão) etc. dá a vibração curta — só em tela touch
export function tatilNosToques() {
  if (!matchMedia("(pointer: coarse)").matches) return;
  document.addEventListener("click", (e) => {
    if (!e.isTrusted) return;
    if ((e.target as Element)?.closest?.("a, button, summary, [role=button], label:not([for=sn-tatil]), select")) tatil();
  }, true);
}
