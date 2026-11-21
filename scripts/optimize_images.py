"""Optimiza las fotos locales y genera js/local-images.js.

Las imágenes se reducen a 800 px para que el proyecto sea liviano sin que
se note en las tarjetas ni en la ficha de cada receta.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
IMG_DIR = ROOT / "assets" / "recipes"
OUT = ROOT / "js" / "local-images.js"
MAX_SIZE = (500, 500)


def main():
    paths = sorted(IMG_DIR.glob("*.jpg"), key=lambda p: int(p.stem))
    for path in paths:
        with Image.open(path) as image:
            image = image.convert("RGB")
            image.thumbnail(MAX_SIZE, Image.LANCZOS)
            image.save(path, "JPEG", quality=70, optimize=True)

    entries = ",\n".join(
        '    "%s": "assets/recipes/%s"' % (path.stem, path.name)
        for path in paths
    )
    content = (
        "/* Mapa generado: imágenes de recetas guardadas en el proyecto.\n"
        "   Es un detalle interno; no se muestra en la interfaz. */\n"
        "(function (global) {\n"
        "  'use strict';\n"
        "  global.CocuLocalImages = {\n" + entries + "\n  };\n"
        "})(window);\n"
    )
    OUT.write_text(content, encoding="utf-8")
    total = sum(p.stat().st_size for p in paths) / 1024 / 1024
    print("Optimizadas %d imágenes (%.1f MB). Mapa: %s" % (len(paths), total, OUT))


if __name__ == "__main__":
    main()
