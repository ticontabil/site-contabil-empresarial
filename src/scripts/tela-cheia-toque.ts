// Celular e tablet: o primeiro toque já coloca a página em tela cheia (mais imersão).
// Só funciona a partir de um toque da pessoa; o iPhone não permite tela cheia em páginas (iPad e Android sim).
if (matchMedia("(pointer: coarse)").matches) {
  const doc = document as any, el = document.documentElement as any;
  const pedir = () => {
    if (doc.fullscreenElement || doc.webkitFullscreenElement) return;
    try { (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el, { navigationUI: "hide" })?.catch?.(() => {}); } catch {}
  };
  const uma = () => { pedir(); removeEventListener("touchend", uma); removeEventListener("pointerup", umaPonteiro); };
  const umaPonteiro = (e: PointerEvent) => { if (e.pointerType !== "mouse") uma(); };
  addEventListener("touchend", uma, { passive: true });
  addEventListener("pointerup", umaPonteiro);
}
