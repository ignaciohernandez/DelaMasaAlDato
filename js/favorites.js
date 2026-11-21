/* Persistencia de "Mis recetas" con localStorage.
   Guarda sólo los campos necesarios para volver a pintar la tarjeta. */
(function (global) {
  'use strict';

  var KEY = 'cocu:recetas-guardadas';
  var listeners = [];

  function read() {
    try {
      var raw = global.localStorage.getItem(KEY);
      var parsed = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(parsed)) return [];
      var local = global.CocuLocalImages || {};
      return parsed.map(function (meal) {
        var path = local[String(meal.idMeal)];
        if (path) meal.strMealThumb = path;
        return meal;
      });
    } catch (error) {
      return [];
    }
  }

  function write(items) {
    try {
      global.localStorage.setItem(KEY, JSON.stringify(items));
    } catch (error) {
      /* almacenamiento lleno o bloqueado: seguimos con el estado en memoria */
    }
    listeners.forEach(function (listener) { listener(items); });
  }

  function storedShape(meal) {
    return {
      idMeal: meal.idMeal,
      strMeal: meal.strMeal,
      strMealThumb: meal.strMealThumb,
      strArea: meal.strArea || ''
    };
  }

  global.CocuFavorites = {
    getAll: read,

    has: function (id) {
      return read().some(function (meal) { return String(meal.idMeal) === String(id); });
    },

    /* Devuelve true si quedó guardada, false si se quitó. */
    toggle: function (meal) {
      var items = read();
      var id = String(meal.idMeal);
      var index = -1;
      var saved;

      items.forEach(function (item, i) {
        if (String(item.idMeal) === id) index = i;
      });

      if (index >= 0) {
        items.splice(index, 1);
        saved = false;
      } else {
        items.unshift(storedShape(meal));
        saved = true;
      }

      write(items);
      return saved;
    },

    subscribe: function (listener) {
      listeners.push(listener);
    }
  };
})(window);
