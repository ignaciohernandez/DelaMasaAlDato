/* Orquestación: conecta la API, el estado de la vista y los favoritos. */
(function () {
  'use strict';

  var API = window.CocuAPI;
  var Favorites = window.CocuFavorites;
  var UI = window.CocuRecipes;

  /* La grilla arranca corta y el botón va mostrando el resto por tandas. */
  var PAGE_SIZE = 12;

  var grid = document.getElementById('recipe-grid');
  var loadMoreWrap = document.getElementById('load-more-wrap');
  var loadMoreInfo = document.getElementById('load-more-info');
  var loadMoreButton = document.getElementById('load-more');
  var statusNode = document.getElementById('recipe-status');
  var resultsLabel = document.getElementById('results-label');
  var searchInput = document.getElementById('recipe-search');
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip'));
  var favoritesToggle = document.getElementById('favorites-toggle');
  var favCount = document.getElementById('fav-count');
  var clearFavoritesView = document.getElementById('clear-favorites-view');

  var dialog = document.getElementById('recipe-dialog');
  var dialogContent = document.getElementById('dialog-content');
  var dialogClose = document.getElementById('dialog-close');

  var navToggle = document.getElementById('nav-toggle');
  var mainNav = document.getElementById('main-nav');

  var state = {
    area: 'Todas',
    query: '',
    showFavorites: false,
    meals: [],
    visible: 0,
    cardOptions: null,
    requestId: 0
  };

  /* Los nombres de "área" de TheMealDB no coinciden con los de la UI. */
  function matchesArea(meal, area) {
    if (area === 'Todas') return true;
    return (meal.strArea || meal.strCountry || '') === area;
  }

  function plural(count, singular, pluralWord) {
    return count + ' ' + (count === 1 ? singular : pluralWord);
  }

  function setFavoritesView(active) {
    state.showFavorites = active;
    favoritesToggle.classList.toggle('is-active', active);
    favoritesToggle.setAttribute('aria-pressed', String(active));
    clearFavoritesView.hidden = !active;
  }

  function updateLoadMore() {
    var remaining = state.meals.length - state.visible;
    loadMoreWrap.hidden = remaining <= 0;
    if (remaining > 0) {
      loadMoreInfo.textContent = 'Mostrando ' + state.visible + ' de ' + state.meals.length + ' recetas';
    }
  }

  function render(meals) {
    state.meals = meals;
    state.visible = 0;
    resultsLabel.textContent = state.showFavorites
      ? plural(meals.length, 'receta guardada', 'recetas guardadas')
      : plural(meals.length, 'receta encontrada', 'recetas encontradas');
    loadMoreWrap.hidden = true;

    if (!meals.length) {
      /* Sacamos los skeletons de carga antes de mostrar el estado vacío. */
      while (grid.firstChild) grid.removeChild(grid.firstChild);
      state.cardOptions = null;
      UI.showStatus(statusNode, state.showFavorites ? 'empty-favorites' : 'empty-search');
      return;
    }

    UI.clearStatus(statusNode);
    state.cardOptions = {
      limit: PAGE_SIZE,
      isSaved: function (meal) { return Favorites.has(meal.idMeal); },
      onToggle: toggleFavorite,
      onOpen: openDetail
    };
    state.visible = UI.renderGrid(grid, meals, state.cardOptions);
    updateLoadMore();
  }

  function loadMore() {
    if (!state.cardOptions) return;
    var added = UI.appendCards(grid, state.meals, state.visible, state.visible + PAGE_SIZE, state.cardOptions);
    state.visible += added;
    updateLoadMore();
  }

  function load() {
    var requestId = ++state.requestId;
    loadMoreWrap.hidden = true;
    UI.clearStatus(statusNode);
    UI.renderSkeletons(grid, 8);
    resultsLabel.textContent = 'Cargando recetas…';

    var query = state.query.trim();
    var promise;

    if (state.showFavorites) {
      promise = Promise.resolve(Favorites.getAll());
    } else if (query) {
      promise = API.search(query).then(function (meals) {
        return meals.filter(function (meal) { return matchesArea(meal, state.area); });
      });
    } else if (state.area !== 'Todas') {
      promise = API.byArea(state.area);
    } else {
      promise = API.byCategory('Dessert');
    }

    promise.then(function (meals) {
      if (requestId !== state.requestId) return;
      render(meals);
    }).catch(function () {
      if (requestId !== state.requestId) return;
      resultsLabel.textContent = 'Sin conexión';
      UI.showStatus(statusNode, 'error');
      loadMoreWrap.hidden = true;
      while (grid.firstChild) grid.removeChild(grid.firstChild);
    });
  }

  function toggleFavorite(meal) {
    var saved = Favorites.toggle(meal);
    /* En la vista normal el botón se actualiza solo, sin repintar la grilla:
       así no se pierde el lugar donde el usuario estaba leyendo. En la vista
       de guardadas sí hay que recargar porque la receta puede desaparecer. */
    if (state.showFavorites) load();
    return saved;
  }

  function openDetail(meal) {
    if (typeof dialog.showModal === 'function') {
      dialog.showModal();
    } else {
      dialog.setAttribute('open', '');
    }
    UI.renderDetailLoading(dialogContent);

    API.byId(meal.idMeal).then(function (detail) {
      if (!detail) {
        UI.renderDetailError(dialogContent);
        return;
      }
      UI.renderDetail(dialogContent, detail, Favorites.has(detail.idMeal), toggleFavorite);
    }).catch(function () {
      UI.renderDetailError(dialogContent);
    });
  }

  /* --- Eventos ---------------------------------------------------------- */

  var debounceTimer;
  searchInput.addEventListener('input', function (event) {
    state.query = event.target.value;
    window.clearTimeout(debounceTimer);
    debounceTimer = window.setTimeout(function () {
      setFavoritesView(false);
      load();
    }, 350);
  });

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.area = chip.dataset.area;
      chips.forEach(function (other) {
        var active = other === chip;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });
      setFavoritesView(false);
      load();
    });
  });

  favoritesToggle.addEventListener('click', function () {
    setFavoritesView(!state.showFavorites);
    load();
    if (state.showFavorites) {
      document.getElementById('recetario').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  clearFavoritesView.addEventListener('click', function () {
    setFavoritesView(false);
    load();
  });

  loadMoreButton.addEventListener('click', loadMore);

  dialogClose.addEventListener('click', function () { dialog.close(); });
  dialog.addEventListener('click', function (event) {
    if (event.target === dialog) dialog.close();
  });

  navToggle.addEventListener('click', function () {
    var open = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(open));
  });
  mainNav.addEventListener('click', function (event) {
    if (event.target.tagName === 'A') {
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    }
  });

  Favorites.subscribe(function (items) {
    favCount.textContent = String(items.length);
    favCount.classList.toggle('has-items', items.length > 0);
  });
  favCount.textContent = String(Favorites.getAll().length);
  favCount.classList.toggle('has-items', Favorites.getAll().length > 0);

  load();
})();
