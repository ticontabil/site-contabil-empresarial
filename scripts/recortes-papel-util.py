# Apoio de scripts/gerar-recortes-papel.ts (imagens com PIL + numpy).
#   prep <papel.png> <espelho 0|1> <W> <H> <saida-prefixo>
#       grava <prefixo>-papel.png (girado 180° se espelho, no tamanho W×H) e <prefixo>-mascara.png
#       (o formato do papel "comido" alguns px por dentro: o miolo onde entra o texto novo, deixando
#       a fibra rasgada original na borda). Imprime a cor do papel (#rrggbb).
#   desfoque <nitido.png> <saida-prefixo>
#       grava <prefixo>-b1.png e <prefixo>-b2.png: o recorte já desfocado, com o canal azul deslocado
#       (aberração cromática), em resolução menor. A animação troca de camada em vez de calcular
#       filtro a cada quadro.
import sys
import numpy as np
from PIL import Image, ImageFilter


def prep(arq, espelho, W, H, pref):
    im = Image.open(arq).convert("RGBA")
    if espelho:
        im = im.rotate(180)
    im = im.resize((W, H), Image.LANCZOS)
    im.save(f"{pref}-papel.png")
    a = im.getchannel("A")
    k = max(3, round(min(W, H) * 0.018)) | 1  # borda original que fica à mostra
    miolo = a.point(lambda v: 255 if v > 200 else 0).filter(ImageFilter.MinFilter(k)).filter(ImageFilter.GaussianBlur(2))
    m = Image.new("RGBA", (W, H), (255, 255, 255, 0))
    m.putalpha(miolo)
    m.save(f"{pref}-mascara.png")
    px = np.asarray(im).reshape(-1, 4).astype(float)
    px = px[px[:, 3] > 220]
    lum = px[:, :3].mean(1)
    claros = px[lum >= np.percentile(lum, 75)][:, :3]
    r, g, b = np.median(claros, 0)
    print("#%02x%02x%02x" % (int(r), int(g), int(b)))


def borrar(im, fator, raio, desloca):
    w, h = im.size
    im = im.resize((max(1, round(w * fator)), max(1, round(h * fator))), Image.LANCZOS)
    a = np.asarray(im).astype(float) / 255
    pm = a.copy()
    pm[..., :3] *= pm[..., 3:4]  # pré-multiplicado: o desfoque não escurece a borda
    canais = [np.asarray(Image.fromarray((pm[..., c] * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(raio))).astype(float) / 255 for c in range(4)]
    R, G, B, A = canais
    d = max(1, round(desloca))
    B2 = np.zeros_like(B); A2 = np.zeros_like(A)
    B2[d:, d:] = B[:-d, :-d]; A2[d:, d:] = A[:-d, :-d]
    Af = np.maximum(A, A2)
    out = np.zeros(R.shape + (4,))
    seguro = np.maximum(Af, 1e-4)
    out[..., 0] = R / seguro; out[..., 1] = G / seguro; out[..., 2] = B2 / seguro; out[..., 3] = Af
    return Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), "RGBA")


def desfoque(arq, pref):
    im = Image.open(arq).convert("RGBA")
    # b1: desfoque médio (~13 px no tamanho original), azul 4 px; b2: forte (~45 px), azul 12 px
    borrar(im, 0.4, 13 * 0.4, 4 * 0.4).save(f"{pref}-b1.png")
    borrar(im, 0.16, 45 * 0.16, 12 * 0.16).save(f"{pref}-b2.png")


if __name__ == "__main__":
    c = sys.argv[1]
    if c == "prep":
        prep(sys.argv[2], sys.argv[3] == "1", int(sys.argv[4]), int(sys.argv[5]), sys.argv[6])
    elif c == "desfoque":
        desfoque(sys.argv[2], sys.argv[3])
