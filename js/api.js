/* Capa de acceso a la API REST pública TheMealDB.
   Sin key, sin registro. Devuelve siempre un array (la API responde meals:null
   cuando no hay resultados). */
(function (global) {
  'use strict';

  var BASE = 'https://www.themealdb.com/api/json/v1/1';

  function request(path) {
    return fetch(BASE + path)
      .then(function (response) {
        if (!response.ok) {
          throw new Error('Error de conexión con TheMealDB (' + response.status + ')');
        }
        return response.json();
      })
      .then(function (data) {
        var meals = Array.isArray(data.meals) ? data.meals : [];
        return meals.map(function (meal) {
          /* Las fotos se sirven desde el proyecto cuando están disponibles. */
          var local = global.CocuLocalImages || {};
          var path = local[String(meal.idMeal)];
          if (path) meal.strMealThumb = path;
          return meal;
        });
      });
  }

  global.CocuAPI = {
    byCategory: function (category) {
      return request('/filter.php?c=' + encodeURIComponent(category));
    },
    byArea: function (area) {
      return request('/filter.php?a=' + encodeURIComponent(area));
    },
    search: function (term) {
      return request('/search.php?s=' + encodeURIComponent(term));
    },
    byId: function (id) {
      return request('/lookup.php?i=' + encodeURIComponent(id)).then(function (meals) {
        return meals[0] || null;
      });
    }
  };
})(window);
