/* Render puro de la UI del recetario. No hace fetch: recibe los datos ya
   obtenidos por app.js y construye nodos con textContent (nunca innerHTML).
   Los textos se traducen al español con la capa interna de traducción. */
(function (global) {
  'use strict';

  var AREA_LABELS = {
    Afghanistan: 'Afganistán', American: 'Estados Unidos', Argentina: 'Argentina',
    British: 'Reino Unido', Bulgaria: 'Bulgaria', Canadian: 'Canadá', Chinese: 'China',
    Colombian: 'Colombia', Croatia: 'Croacia', Cyprus: 'Chipre', Czech: 'Chequia',
    Danish: 'Dinamarca', Dutch: 'Países Bajos', Ecuadorian: 'Ecuador', Egyptian: 'Egipto',
    Ethiopian: 'Etiopía',
    Finland: 'Finlandia', Finnish: 'Finlandia', France: 'Francia', French: 'Francia',
    Georgian: 'Georgia', German: 'Alemania', Greek: 'Grecia', Hungarian: 'Hungría',
    Icelandic: 'Islandia', Indian: 'India', Indonesian: 'Indonesia', Iranian: 'Irán',
    Irish: 'Irlanda', Israeli: 'Israel', Italian: 'Italia', Jamaican: 'Jamaica',
    Japanese: 'Japón', Kazakh: 'Kazajistán', Kenyan: 'Kenia', Korean: 'Corea del Sur',
    Laos: 'Laos', Latvian: 'Letonia', Lithuanian: 'Lituania', Malaysian: 'Malasia',
    Malta: 'Malta', Mexican: 'México', Moroccan: 'Marruecos', Nigerian: 'Nigeria',
    Norwegian: 'Noruega', Other: 'Otro', Pakistani: 'Paquistán', Peruvian: 'Perú',
    Polish: 'Polonia', Portuguese: 'Portugal', Romanian: 'Rumania', Russian: 'Rusia',
    Scottish: 'Escocia', Serbian: 'Serbia', Singaporean: 'Singapur', Slovak: 'Eslovaquia',
    Slovenian: 'Eslovenia', Somali: 'Somalia', South_African: 'Sudáfrica',
    Spanish: 'España', Sudanese: 'Sudán', Swedish: 'Suecia', Swiss: 'Suiza',
    Syrian: 'Siria', Taiwanese: 'Taiwán', Tanzanian: 'Tanzania', Thai: 'Tailandia',
    Trinidadian: 'Trinidad y Tobago', Tunisian: 'Túnez', Turkish: 'Turquía',
    Ugandan: 'Uganda', Ukrainian: 'Ucrania', United_Arab_Emirates: 'Emiratos Árabes Unidos',
    Uruguayan: 'Uruguay', Uzbek: 'Uzbekistán', Venezuela: 'Venezuela',
    Venezuelan: 'Venezuela', Vietnam: 'Vietnam', Vietnamese: 'Vietnam',
    Yemeni: 'Yemen', Zambian: 'Zambia', Zimbabwean: 'Zimbabue'
  };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function clear(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  var CATEGORY_LABELS = {
    Dessert: 'Postre', Beef: 'Carne de res', Chicken: 'Pollo', Pork: 'Cerdo',
    Seafood: 'Mariscos', vegetarian: 'Vegetariano', Vegan: 'Vegano',
    Breakfast: 'Desayuno', Starter: 'Entrada', Side: 'Guarnición',
    Drink: 'Bebida', Snack: 'Snack'
  };

  function translateText(node, text, immediate) {
    var layer = global.CocuTranslate;
    if (layer && typeof layer.translateNode === 'function') {
      layer.translateNode(node, text, immediate);
    }
  }

  function translateValue(text, callback) {
    var layer = global.CocuTranslate;
    if (!text || !layer || typeof layer.translate !== 'function') {
      callback(text);
      return;
    }
    layer.translate(text).then(function (out) { callback(out || text); });
  }

  function areaForDisplay(meal) {
    var area = meal.strArea || meal.strCountry || '';
    if (!area) return { label: 'Sin origen', source: null };
    if (AREA_LABELS[area]) return { label: AREA_LABELS[area], source: null };
    return { label: area, source: area };
  }

  function getIngredients(meal) {
    var result = [];
    for (var i = 1; i <= 20; i += 1) {
      var name = (meal['strIngredient' + i] || '').trim();
      if (!name) continue;
      result.push({
        measure: (meal['strMeasure' + i] || '').trim(),
        name: name
      });
    }
    return result;
  }

  function createCard(meal, options) {
    var card = el('article', 'recipe-card');
    var area = areaForDisplay(meal);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', 'Ver receta: ' + meal.strMeal);

    var media = el('div', 'recipe-card-media');
    var image = el('img');
    image.src = meal.strMealThumb || '';
    image.alt = meal.strMeal || 'Receta';
    image.loading = 'lazy';
    media.appendChild(image);

    var badge = el('span', 'recipe-badge', area.label);
    if (area.source) translateText(badge, area.source);
    media.appendChild(badge);

    var saved = options.isSaved(meal);
    var fav = el('button', 'fav-btn' + (saved ? ' is-saved' : ''), saved ? '♥' : '♡');
    fav.type = 'button';
    fav.setAttribute('aria-label', saved ? 'Quitar de Mis recetas' : 'Guardar en Mis recetas');
    fav.setAttribute('aria-pressed', String(saved));
    fav.addEventListener('click', function (event) {
      event.stopPropagation();
      var saved = !!options.onToggle(meal);
      fav.classList.toggle('is-saved', saved);
      fav.textContent = saved ? '♥' : '♡';
      fav.setAttribute('aria-label', saved ? 'Quitar de Mis recetas' : 'Guardar en Mis recetas');
      fav.setAttribute('aria-pressed', String(saved));
    });
    media.appendChild(fav);
    card.appendChild(media);

    var body = el('div', 'recipe-card-body');
    var title = el('h3', 'recipe-card-title', meal.strMeal);
    body.appendChild(title);
    translateText(title, meal.strMeal);
    translateValue(meal.strMeal, function (out) {
      image.alt = out || 'Receta';
      card.setAttribute('aria-label', 'Ver receta: ' + out);
    });
    body.appendChild(el('span', 'recipe-card-link', 'Ver receta →'));
    card.appendChild(body);

    card.addEventListener('click', function () { options.onOpen(meal); });
    card.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        options.onOpen(meal);
      }
    });

    return card;
  }

  /* Pinta sólo un tramo de la lista para no llenar la página de una vez. */
  function appendCards(grid, meals, start, end, options) {
    var limit = Math.min(end, meals.length);
    var fragment = document.createDocumentFragment();
    for (var i = start; i < limit; i += 1) {
      fragment.appendChild(createCard(meals[i], options));
    }
    grid.appendChild(fragment);
    if (global.CocuTranslate && typeof global.CocuTranslate.flush === 'function') {
      global.CocuTranslate.flush();
    }
    return limit - start;
  }

  function renderGrid(grid, meals, options) {
    clear(grid);
    return appendCards(grid, meals, 0, options.limit || meals.length, options);
  }

  function renderSkeletons(grid, count) {
    clear(grid);
    var fragment = document.createDocumentFragment();
    for (var i = 0; i < (count || 8); i += 1) {
      var card = el('div', 'skeleton-card');
      card.setAttribute('aria-hidden', 'true');
      card.appendChild(el('div', 'skeleton-media'));
      card.appendChild(el('div', 'skeleton-line'));
      card.appendChild(el('div', 'skeleton-line short'));
      fragment.appendChild(card);
    }
    grid.appendChild(fragment);
  }

  function showStatus(node, kind) {
    clear(node);
    var box = el('div', 'status-box');
    var messages = {
      'empty-search': {
        symbol: '⌕',
        title: 'No encontramos recetas',
        text: 'Probá con otro nombre o cambiá el filtro de origen.'
      },
      'empty-favorites': {
        symbol: '♡',
        title: 'Todavía no guardaste ninguna receta',
        text: 'Tocá el corazón en cualquier tarjeta y aparecerá acá. Se guardan incluso si recargás la página.'
      },
      'error': {
        symbol: '—',
        title: 'No pudimos traer las recetas',
        text: 'Revisá tu conexión e intentá de nuevo. Las recetas pueden estar demoradas.'
      }
    };

    var data = messages[kind] || messages.error;
    box.appendChild(el('span', 'status-symbol', data.symbol));
    box.appendChild(el('h3', '', data.title));
    box.appendChild(el('p', '', data.text));
    node.appendChild(box);
  }

  function clearStatus(node) { clear(node); }

  function renderDetailLoading(container) {
    clear(container);
    container.appendChild(el('h2', 'sr-only', 'Cargando receta'));
    container.appendChild(el('div', 'detail-loading', 'Cargando receta…'));
  }

  function renderDetailError(container) {
    clear(container);
    container.appendChild(el('h2', 'sr-only', 'Error'));
    var box = el('div', 'detail-loading');
    box.appendChild(el('p', '', 'No se pudo cargar el detalle de esta receta.'));
    container.appendChild(box);
  }

  function metaPill(text, source) {
    var node = el('span', 'meta-pill', text);
    if (source) translateText(node, source, true);
    return node;
  }

  function renderDetail(container, meal, initiallySaved, onToggle) {
    clear(container);
    var area = areaForDisplay(meal);

    var srTitle = el('h2', 'sr-only', meal.strMeal || 'Detalle de la receta');
    container.appendChild(srTitle);
    translateText(srTitle, meal.strMeal, true);

    var hero = el('div', 'detail-hero');
    var image = el('img');
    image.src = meal.strMealThumb || '';
    image.alt = meal.strMeal || 'Receta';
    hero.appendChild(image);

    var copy = el('div', 'detail-hero-copy');
    var eyebrow = el('p', 'eyebrow', area.label);
    if (area.source) translateText(eyebrow, area.source, true);
    copy.appendChild(eyebrow);

    var title = el('h2', 'detail-title', meal.strMeal);
    copy.appendChild(title);
    translateText(title, meal.strMeal, true);
    translateValue(meal.strMeal, function (out) { image.alt = out || 'Receta'; });

    var save = el('button', 'btn btn-save' + (initiallySaved ? ' is-saved' : ''),
      initiallySaved ? '♥ Guardada' : '♡ Guardar receta');
    save.type = 'button';
    save.setAttribute('aria-pressed', String(initiallySaved));
    save.addEventListener('click', function () {
      var nowSaved = !!onToggle(meal);
      save.classList.toggle('is-saved', nowSaved);
      save.textContent = nowSaved ? '♥ Guardada' : '♡ Guardar receta';
      save.setAttribute('aria-pressed', String(nowSaved));
    });
    copy.appendChild(save);
    hero.appendChild(copy);
    container.appendChild(hero);

    var body = el('div', 'detail-body');

    var meta = el('div', 'detail-meta');
    if (meal.strCategory) {
      var category = CATEGORY_LABELS[meal.strCategory] || meal.strCategory;
      meta.appendChild(metaPill(category, CATEGORY_LABELS[meal.strCategory] ? null : meal.strCategory));
    }
    if (meal.strArea) meta.appendChild(metaPill(area.label, area.source));
    if (meal.strTags) {
      meal.strTags.split(',').slice(0, 3).forEach(function (tag) {
        var value = tag.trim();
        if (value) meta.appendChild(metaPill(value, value));
      });
    }
    body.appendChild(meta);

    var cols = el('div', 'detail-cols');

    var ingredientsBlock = el('div', 'detail-ing');
    ingredientsBlock.appendChild(el('h3', 'detail-subtitle', 'Ingredientes'));
    var list = el('ul', 'ingredient-list');
    getIngredients(meal).forEach(function (item) {
      var li = el('li');
      var measure = el('span', 'ing-measure', item.measure);
      if (item.measure) translateText(measure, item.measure, true);
      li.appendChild(measure);
      var name = el('span', 'ing-name', item.name);
      translateText(name, item.name, true);
      li.appendChild(name);
      list.appendChild(li);
    });
    ingredientsBlock.appendChild(list);
    cols.appendChild(ingredientsBlock);

    var prepBlock = el('div', 'detail-prep');
    prepBlock.appendChild(el('h3', 'detail-subtitle', 'Preparación'));
    var fallback = 'Esta receta todavía no incluye instrucciones.';
    var steps = (meal.strInstructions || '')
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(function (line) { return line && /[a-z0-9]/i.test(line); });
    if (!steps.length) steps.push(fallback);
    steps.forEach(function (step) {
      var paragraph = el('p', '', step);
      if (step !== fallback) translateText(paragraph, step, true);
      prepBlock.appendChild(paragraph);
    });
    cols.appendChild(prepBlock);

    body.appendChild(cols);

    var links = el('div', 'detail-links');
    if (meal.strYoutube) {
      var video = el('a', '', 'Ver preparación en video ↗');
      video.href = meal.strYoutube;
      video.target = '_blank';
      video.rel = 'noopener noreferrer';
      links.appendChild(video);
    }
    if (links.childNodes.length) body.appendChild(links);

    container.appendChild(body);
  }

  global.CocuRecipes = {
    renderGrid: renderGrid,
    appendCards: appendCards,
    renderSkeletons: renderSkeletons,
    showStatus: showStatus,
    clearStatus: clearStatus,
    renderDetailLoading: renderDetailLoading,
    renderDetailError: renderDetailError,
    renderDetail: renderDetail
  };
})(window);
