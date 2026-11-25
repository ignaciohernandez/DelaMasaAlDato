# De la masa al dato

**TP2 de Frontend — Recreación de una interfaz + consumo de una API REST pública.**

Modelo visual: una boulangerie francesa de Buenos Aires (solo como referencia de diseño).
Fuente interna de las recetas: [TheMealDB](https://www.themealdb.com/api.php) (pública, sin key, sin registro).
Fuente del clima: [Open-Meteo](https://open-meteo.com/), consultada desde el navegador sin clave de API.

## Idea

Se reproduce la estructura visual de una boulangerie porteña (hero, secciones narrativas,
tarjetas de productos, bloque de dato curioso y footer), pero con logo, textos y fotos propios.
Se agrega una funcionalidad nueva: **El Recetario**, una sección que consume recetas
reales de TheMealDB.
También se incorpora **El clima también cocina**, una sección con las condiciones
exteriores actuales de Buenos Aires y un consejo orientativo para la fermentación de masas.

En la página las recetas se presentan como propias y en español: ni la fuente de los
datos ni la traducción se mencionan en ningún texto visible.
El nombre del TP hace referencia al pasaje del oficio panadero (la masa) a los datos
de la API (el dato).

## Funcionalidad nueva

- Grilla de recetas de pastelería (`filter.php?c=Dessert`), paginada: arranca con 12 tarjetas y el botón **Ver más recetas** agrega 12 por vez sin recargar la página. La búsqueda, los filtros y los favoritos reinician la paginación.
- Buscador con debounce de 350 ms (`search.php?s=`).
- Filtros por origen: Francia, Argentina y Uruguay (`filter.php?a=`).
- Modal con la ficha completa: ingredientes con cantidades, preparación y tags
  (`lookup.php?i=`), además de un enlace a la preparación en video.
- **Mis recetas**: guardar favoritos con `localStorage` y contador en el header.
- Textos de las recetas traducidos al español, con caché local.
- Fotos de las recetas guardadas en el proyecto, sin pedirlas al navegar.
- Estados de carga (skeletons), sin resultados y error de conexión.
- Diseño responsive con flexbox y CSS Grid.
- Panel de clima con temperatura, humedad, estado meteorológico e íconos SVG propios,
  además de un consejo de fermentación según la temperatura exterior.

## Estructura

```
├── index.html          # marcado del sitio + secciones El Recetario y Clima
├── css/styles.css      # estilos, responsive y animaciones
├── js/
│   ├── api.js          # requests a TheMealDB
│   ├── local-images.js # mapa de fotos guardadas (generado)
│   ├── translate.js    # traducción al español + caché
│   ├── favorites.js    # localStorage
│   ├── recipes.js      # render de tarjetas, skeletons y modal
│   ├── weather.js      # consulta a Open-Meteo, estado del clima y consejo de fermentación
│   └── app.js          # estado, eventos y coordinación
└── assets/
    ├── logo-dark.svg             # header
    ├── logo-light.svg            # footer
    ├── oficio-pan.jpg
    ├── bolleria-generica.jpg
    ├── dato-cocina.jpg
    ├── producto-panaderia.jpg    # fotos de las cuatro tarjetas
    ├── producto-bolleria.jpg
    ├── producto-pasteleria.jpg
    ├── producto-cocina.jpg
    └── recipes/                  # 793 fotos de recetas, optimizadas (34 MB)
```

Las cuatro fotos de las tarjetas “Lo que hacemos” son imágenes genéricas de stock
guardadas en `assets/`, recortadas a 4:3 y optimizadas (800 × 600 px, calidad 80).
No se piden al navegar y el cambio de “Viennoiserie” por “Bollería” deja los textos
de la interfaz completamente en español.

## Imágenes de las recetas

Las fotos se descargaron una vez y quedaron en `assets/recipes/` con el ID de cada
receta como nombre (`52812.jpg`, etc.). `js/local-images.js` relaciona ese ID con la
ruta local y `js/api.js` reemplaza la URL original por la ruta local antes de pintar
las tarjetas y el modal. Si una imagen no estuviera en el mapa, se usa la URL original
como respaldo.

Las imágenes se optimizaron a 500 px y calidad 70 con `scripts/optimize_images.py`.
Los favoritos guardados con una URL anterior también se actualizan a la ruta local.
Este detalle, al igual que la traducción, no se menciona en la interfaz.

## Cómo ejecutarlo

Se puede abrir `index.html` directamente, pero se recomienda levantar un servidor
local (algunos navegadores restringen `fetch` con `file://`):

```bash
# con Python
python -m http.server 8000
```

Luego entrar a `http://localhost:8000`.

También funciona con la extensión **Live Server** de VS Code.

## Publicación en GitHub Pages

El repo es público y el sitio es estático, así que no hace falta build ni servidor:

1. Copiar esta carpeta al repo y hacer `git push origin main`.
2. En GitHub: **Settings → Pages → Build and deployment**.
3. Elegir **Deploy from a branch**, rama `main`, carpeta `/(root)` y guardar.
4. En 1–2 minutos queda publicado en `https://<usuario>.github.io/<repo>/`.

El archivo `.nojekyll` evita que GitHub procese los archivos con Jekyll.
Cada push a `main` actualiza el sitio automáticamente.

## Endpoints usados

### Recetas (TheMealDB)

| Endpoint | Uso |
| --- | --- |
| `GET /filter.php?c=Dessert` | Grilla inicial |
| `GET /filter.php?a=France` | Filtro Francia |
| `GET /filter.php?a=Argentina` | Filtro Argentina |
| `GET /filter.php?a=Uruguayan` | Filtro Uruguay |
| `GET /search.php?s=<texto>` | Buscador |
| `GET /lookup.php?i=<id>` | Detalle de una receta |

Base URL: `https://www.themealdb.com/api/json/v1/1`

### Clima (Open-Meteo)

Endpoint: `GET https://api.open-meteo.com/v1/forecast`.

| Parámetro | Valor | Uso |
| --- | --- | --- |
| `latitude` | `-34.61` | Latitud fija de Buenos Aires |
| `longitude` | `-58.38` | Longitud fija de Buenos Aires |
| `current` | `temperature_2m,relative_humidity_2m,weather_code,is_day` | Temperatura, humedad, código meteorológico e indicador de día/noche |
| `timezone` | `America/Argentina/Buenos_Aires` | Hora local de los datos |

## Clima y fermentación

`js/weather.js` funciona como un módulo independiente del recetario y consulta
Open-Meteo una vez al cargar la página. No requiere configurar claves, usar
geolocalización ni levantar un backend: la ubicación consultada siempre es Buenos Aires.
Para actualizar los datos, se recarga la página.

- Muestra la temperatura en °C y la humedad relativa en %, con formato numérico argentino.
- Interpreta los códigos meteorológicos WMO con descripciones en español e íconos SVG
  propios; usa sol o luna según el indicador de día/noche. Si el código es desconocido,
  muestra que el estado del clima no está disponible.
- Muestra la fecha y hora de actualización devuelta por la API en horario de Buenos Aires,
  cuando el dato tiene un formato válido.
- Ofrece un consejo orientativo según la temperatura exterior:

| Temperatura | Consejo |
| --- | --- |
| Menos de 18 °C | La fermentación puede ser más lenta; dar tiempo y observar la masa |
| Entre 18 y 26 °C, inclusive | Controlar el desarrollo de la masa durante la fermentación |
| Más de 26 °C | Revisar la masa con mayor frecuencia porque puede fermentar más rápido |

La sección aclara que la temperatura interior y la de la masa pueden diferir de la
exterior. La humedad se muestra como dato informativo; el consejo depende de la temperatura.

La consulta tiene un tiempo límite de 12 segundos y valida la temperatura, el rango
de humedad y sus unidades antes de mostrar los datos. Durante la carga se informa
el estado; si falla la conexión, vence el tiempo límite o los datos no son válidos,
se muestra un mensaje para recargar la página y no se ofrece un consejo sin datos.
El panel comunica sus cambios mediante atributos de accesibilidad (`aria-live` y
`aria-busy`) e incluye un aviso cuando JavaScript está desactivado.

## Traducción (detalle interno)

TheMealDB devuelve los textos en inglés, así que `js/translate.js` los pasa al español
con un servicio público sin clave:

- Endpoint: `GET https://api.mymemory.translated.net/get?q=<texto>&langpair=en|es`.
- Se traduce bajo demanda: títulos y orígenes de la grilla cuando entran en pantalla,
  y ficha completa (nombre, categoría, ingredientes, medidas, pasos y tags) al abrir el modal.
- Cada resultado se guarda en `localStorage` (`cocu:traducciones-v1`) para no repetir pedidos.
- Los textos se parten en bloques de hasta 480 bytes porque el servicio acepta 500 bytes
  por pedido, y las llamadas se limitan a dos en paralelo.
- Si el servicio falla o se agota la cuota, se muestra el texto original y el sitio sigue funcionando.
- Los nombres de países más comunes se resuelven con un diccionario local para ahorrar pedidos.

## Aclaración

Logo, textos y fotografías del sitio son propios; las fotos son imágenes genéricas
de panadería y cocina. Los datos de las recetas provienen de TheMealDB y sus fotos
se copiaron al proyecto; todas son propiedad de sus respectivos autores. La fuente,
las imágenes y la traducción se documentan acá y en el código, pero no se muestran
en la interfaz. La sección de clima sí incluye un enlace de atribución a Open-Meteo.
