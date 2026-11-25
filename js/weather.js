/* Clima exterior de Buenos Aires. Módulo independiente del recetario. */
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-34.61&longitude=-58.38&current=temperature_2m,relative_humidity_2m,weather_code,is_day&timezone=America/Argentina/Buenos_Aires';

// Códigos WMO: https://open-meteo.com/en/docs#weather_variable_documentation
// SVG propios de trazo simple: sin fuentes de íconos ni dependencias externas.
const WEATHER_PATHS = {
  sun: ['M16 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0', 'M12 1v1M12 14v1M5 8H4M20 8h-1M6.3 2.3l1 1M16.7 12.7l1 1M17.7 2.3l-1 1M7.3 12.7l-1 1'],
  moon: ['M17 3a7 7 0 1 0 4 10A7 7 0 0 1 17 3Z'],
  cloud: ['M6 16a4 4 0 1 1 1-7.9A6 6 0 0 1 18.7 10 3 3 0 1 1 0 6Z'],
  fog: ['M4 19h16M6 22h12'],
  drizzle: ['M8 19v1M12 20v1M16 19v1'],
  rain: ['M8 18l-1 3M13 18l-1 3M18 18l-1 3'],
  snow: ['M8 19v4M6 21h4M16 19v4M14 21h4'],
  storm: ['M13 17l-3 4h4l-2 3'],
  unknown: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18', 'M10 9a2 2 0 1 1 3 1.7c-1 .6-1 1.3-1 2.3M12 16h.01']
};

function weatherCondition(code, isDay) {
  const daylight = isDay === 1 ? 'sun' : isDay === 0 ? 'moon' : null;
  if (!Number.isInteger(code)) return { label: 'Estado del clima no disponible', icon: 'unknown' };
  if (code === 0) return { label: 'Despejado', icon: daylight || 'unknown' };
  if (code === 1 || code === 2) {
    return { label: code === 1 ? 'Mayormente despejado' : 'Parcialmente nublado', icon: 'cloud', daylight };
  }
  const groups = [
    [[3], 'Nublado', 'cloud'],
    [[45], 'Niebla', 'fog'],
    [[48], 'Niebla con escarcha', 'fog'],
    [[51, 53, 55], 'Llovizna', 'drizzle'],
    [[56, 57], 'Llovizna helada', 'drizzle'],
    [[61, 63, 65], 'Lluvia', 'rain'],
    [[66, 67], 'Lluvia helada', 'rain'],
    [[71, 73, 75], 'Nieve', 'snow'],
    [[77], 'Granos de nieve', 'snow'],
    [[80, 81, 82], 'Chaparrones', 'rain'],
    [[85, 86], 'Chaparrones de nieve', 'snow'],
    [[95], 'Tormenta', 'storm'],
    [[97], 'Tormenta intensa', 'storm'],
    [[96, 99], 'Tormenta con granizo', 'storm']
  ];
  const match = groups.find(([codes]) => codes.includes(code));
  return match ? { label: match[1], icon: match[2] } : { label: 'Estado del clima no disponible', icon: 'unknown' };
}

function renderCondition(code, isDay) {
  const condition = weatherCondition(code, isDay);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 26');
  svg.setAttribute('width', '48');
  svg.setAttribute('height', '52');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  function appendPaths(name, transform) {
    WEATHER_PATHS[name].forEach(d => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      if (transform) path.setAttribute('transform', transform);
      svg.appendChild(path);
    });
  }

  if (condition.daylight) appendPaths(condition.daylight, 'translate(8 0) scale(.65)');
  if (!['sun', 'moon', 'cloud', 'unknown'].includes(condition.icon)) appendPaths('cloud');
  appendPaths(condition.icon);
  document.getElementById('weather-icon').replaceChildren(svg);
  document.getElementById('weather-description').textContent = condition.label;
}

function fermentationAdvice(temperature) {
  if (temperature < 18) {
    return 'Ambiente fresco (menos de 18 °C): la fermentación puede ser más lenta. Dale tiempo a la masa y observá su desarrollo.';
  }
  if (temperature <= 26) {
    return 'Ambiente templado (entre 18 y 26 °C): controlá el desarrollo de la masa durante la fermentación.';
  }
  return 'Ambiente cálido (más de 26 °C): revisá la masa con mayor frecuencia, ya que la fermentación puede avanzar más rápido.';
}

async function loadWeather() {
  const panel = document.getElementById('weather-panel');
  if (!panel) return;

  const status = document.getElementById('weather-status');
  const content = document.getElementById('weather-data');
  const updated = document.getElementById('weather-updated');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(WEATHER_URL, { signal: controller.signal });
    if (!response.ok) throw new Error('No se pudo consultar el clima.');

    const data = await response.json();
    const current = data?.current;
    const temperature = current?.temperature_2m;
    const humidity = current?.relative_humidity_2m;
    if (!Number.isFinite(temperature) || !Number.isFinite(humidity) ||
        humidity < 0 || humidity > 100 ||
        data?.current_units?.temperature_2m !== '°C' ||
        data?.current_units?.relative_humidity_2m !== '%') {
      throw new Error('Los datos meteorológicos no son válidos.');
    }

    const number = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 });
    document.getElementById('weather-temperature').textContent = number.format(temperature) + ' °C';
    document.getElementById('weather-humidity').textContent = number.format(humidity) + ' %';
    document.getElementById('weather-advice').textContent = fermentationAdvice(temperature);
    renderCondition(current.weather_code, current.is_day);

    // La API devuelve la hora local de la zona solicitada, sin sufijo UTC.
    // Se conserva esa hora para no convertirla a la zona del visitante.
    if (typeof current.time === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(current.time) &&
        Number.isFinite(Date.parse(current.time + 'Z'))) {
      const [date, time] = current.time.split('T');
      const [year, month, day] = date.split('-');
      updated.textContent = `Actualización de los datos: ${day}/${month}/${year}, ${time.slice(0, 5)} (hora de Buenos Aires).`;
      updated.hidden = false;
    }
    status.hidden = true;
    content.hidden = false;
  } catch (error) {
    content.hidden = true;
    status.hidden = false;
    status.textContent = 'No pudimos cargar el clima actual. Revisá tu conexión y recargá la página para volver a intentar. Sin datos, no podemos ofrecer un consejo según la temperatura.';
  } finally {
    clearTimeout(timeout);
    panel.setAttribute('aria-busy', 'false');
  }
}

loadWeather();
