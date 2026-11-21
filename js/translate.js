/* Traducción al español de los textos de las recetas.
   Servicio público sin clave, con caché en localStorage y fallback al texto
   original si falla. Es un detalle interno: no se menciona en la interfaz. */
(function (global) {
  'use strict';

  var CACHE_KEY = 'cocu:traducciones-v1';
  var BASE = 'https://api.mymemory.translated.net/get';
  var MAX_BYTES = 480;
  var CACHE_LIMIT = 500;
  var MAX_PARALLEL = 2;

  var cache = readCache();
  var pending = {};
  var pendingNodes = [];
  var scrollBound = false;
  var active = 0;
  var waiting = [];

  function readCache() {
    try {
      var raw = global.localStorage.getItem(CACHE_KEY);
      var parsed = raw ? JSON.parse(raw) : {};
      return (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  function saveCache() {
    var keys = Object.keys(cache);
    if (keys.length > CACHE_LIMIT) {
      keys.slice(0, keys.length - CACHE_LIMIT).forEach(function (key) { delete cache[key]; });
    }
    try {
      global.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      /* almacenamiento lleno: seguimos con el cache en memoria */
    }
  }

  function hash(text) {
    var h = 5381;
    var i;
    for (i = 0; i < text.length; i += 1) {
      h = ((h << 5) + h + text.charCodeAt(i)) | 0;
    }
    return 't' + (h >>> 0).toString(36);
  }

  function bytes(text) {
    if (global.TextEncoder) return new global.TextEncoder().encode(text).length;
    return unescape(encodeURIComponent(text)).length;
  }

  /* El servicio acepta hasta 500 bytes por pedido: partimos por líneas y,
     si una línea es muy larga, por palabras. */
  function splitText(text) {
    var chunks = [];
    var buffer = '';

    function flush() {
      if (buffer.trim()) chunks.push(buffer.trim());
      buffer = '';
    }

    text.split(/\r?\n/).forEach(function (line) {
      if (!line.trim()) return;

      if (bytes(line) <= MAX_BYTES) {
        if (bytes(buffer) + bytes(line) + 1 > MAX_BYTES) flush();
        buffer = buffer ? buffer + ' ' + line : line;
        return;
      }

      var word = '';
      line.split(/\s+/).forEach(function (part) {
        if (bytes(part) > MAX_BYTES) {
          flush();
          chunks.push(part.slice(0, 120));
          return;
        }
        if (bytes(word) + bytes(part) + 1 > MAX_BYTES) {
          if (word.trim()) chunks.push(word.trim());
          word = part;
        } else {
          word = word ? word + ' ' + part : part;
        }
      });
      buffer = word;
    });

    flush();
    return chunks.length ? chunks : [text];
  }

  function decodeEntities(value) {
    var area = document.createElement('textarea');
    area.innerHTML = value;
    return area.value;
  }

  function requestPart(part) {
    var url = BASE + '?q=' + encodeURIComponent(part) + '&langpair=en%7Ces';
    return fetch(url).then(function (response) {
      if (!response.ok) return part;
      return response.json().then(function (data) {
        if (Number(data.responseStatus) !== 200 || !data.responseData) return part;
        return data.responseData.translatedText || part;
      });
    }).catch(function () {
      return part;
    });
  }

  /* Cola corta para no disparar demasiados pedidos al mismo tiempo. */
  function limited(fn) {
    return new Promise(function (resolve, reject) {
      function run() {
        active += 1;
        fn().then(function (value) {
          active -= 1;
          release();
          resolve(value);
        }, function (error) {
          active -= 1;
          release();
          reject(error);
        });
      }
      function release() {
        if (waiting.length) waiting.shift()();
      }
      if (active < MAX_PARALLEL) run();
      else waiting.push(run);
    });
  }

  function translate(text) {
    if (typeof text !== 'string' || !text.trim()) return Promise.resolve(text);
    /* Números y símbolos sueltos no se traducen: no aportan y consumen cuota. */
    if (!/[a-z]/i.test(text)) return Promise.resolve(text);

    var key = hash(text);
    if (Object.prototype.hasOwnProperty.call(cache, key)) return Promise.resolve(cache[key]);
    if (pending[key]) return pending[key];

    var parts = splitText(text.trim());
    var chain = Promise.resolve();
    var results = [];

    parts.forEach(function (part) {
      chain = chain.then(function () {
        return requestPart(part).then(function (value) { results.push(value); });
      });
    });

    var promise = limited(function () {
      return chain.then(function () {
        var out = decodeEntities(results.join(' ')).replace(/\s+/g, ' ').trim();
        if (!out) return text;
        cache[key] = out;
        saveCache();
        return out;
      }).catch(function () {
        return text;
      });
    }).then(function (out) {
      delete pending[key];
      return out;
    });

    pending[key] = promise;
    return promise;
  }

  /* Traduce los nodos que ya están cerca del viewport. Se llama al renderizar
     y en cada scroll, así no se traducen las 168 tarjetas de una sola vez. */
  function flushVisible() {
    if (!pendingNodes.length) return;
    var limit = global.innerHeight + 150;
    var keep = [];

    pendingNodes.forEach(function (item) {
      if (!item.node.isConnected) {
        keep.push(item);
        return;
      }
      var rect = item.node.getBoundingClientRect();
      if (rect.top < limit && rect.bottom > -150) {
        var value = item.value;
        translate(value).then(function (out) {
          if (item.node.getAttribute('data-i18n') === value) item.node.textContent = out;
        });
      } else {
        keep.push(item);
      }
    });

    pendingNodes = keep;
  }

  function bindScroll() {
    if (scrollBound) return;
    scrollBound = true;
    global.addEventListener('scroll', flushVisible, { passive: true });
    global.addEventListener('resize', flushVisible, { passive: true });
  }

  /* Traduce un nodo existente. En la grilla se hace cuando entra en pantalla;
     en el modal se hace enseguida porque el usuario lo está leyendo. */
  function translateNode(node, text, immediate) {
    if (!node) return;
    var original = String(text || '');
    node.setAttribute('data-i18n', original);

    function apply(out) {
      if (node.getAttribute('data-i18n') === original) node.textContent = out;
    }

    if (immediate) {
      translate(original).then(apply);
      return;
    }

    pendingNodes.push({ node: node, value: original });
    bindScroll();
    flushVisible();
  }

  global.CocuTranslate = {
    translate: translate,
    translateNode: translateNode,
    flush: flushVisible
  };
})(window);
