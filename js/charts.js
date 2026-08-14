// Gráficos de tendencia en SVG, sin librerías externas.
// Paleta y reglas de marcas siguen el sistema de visualización del proyecto
// (líneas de 2 px, puntos de 8 px, grilla discreta, leyenda + etiqueta directa).

import { esc, fmtFecha, fmtHora } from './utils.js';

const ANCHO = 340;
const ALTO = 190;
const MARGEN = { arriba: 14, derecha: 40, abajo: 26, izquierda: 34 };

const AREA = {
  x0: MARGEN.izquierda,
  y0: MARGEN.arriba,
  x1: ANCHO - MARGEN.derecha,
  y1: ALTO - MARGEN.abajo,
};

/** Elige un intervalo "redondo" (1, 2, 2.5, 5 o 10 × potencia de diez) para el eje Y. */
function pasoRedondo(aproximado) {
  const magnitud = 10 ** Math.floor(Math.log10(Math.max(aproximado, 1e-6)));
  const opciones = [1, 2, 2.5, 5, 10].map((m) => m * magnitud);
  return opciones.find((p) => p >= aproximado) || 10 * magnitud;
}

/**
 * Dibuja un gráfico de líneas temporal.
 * @param {Object} cfg
 * @param {Array<{nombre:string, color:string, puntos:Array<{ts:number, valor:number}>}>} cfg.series
 * @param {{desde:number, hasta:number}} [cfg.banda] franja de objetivo (eje Y)
 * @param {string} [cfg.unidad]
 * @param {string} cfg.id identificador único para enlazar el tooltip
 */
export function graficoLineas({ series, banda = null, unidad = '', id }) {
  const conDatos = series.filter((s) => s.puntos.length > 0);
  const totalPuntos = conDatos.reduce((n, s) => n + s.puntos.length, 0);

  if (totalPuntos < 2) {
    return `<div class="grafico-vacio">Cargá al menos dos mediciones para ver la tendencia.</div>`;
  }

  const todos = conDatos.flatMap((s) => s.puntos);
  const tsMin = Math.min(...todos.map((p) => p.ts));
  const tsMax = Math.max(...todos.map((p) => p.ts));
  const rangoTs = Math.max(tsMax - tsMin, 1);

  let vMin = Math.min(...todos.map((p) => p.valor));
  let vMax = Math.max(...todos.map((p) => p.valor));
  if (banda) {
    vMin = Math.min(vMin, banda.desde);
    vMax = Math.max(vMax, banda.hasta);
  }
  const respiro = Math.max((vMax - vMin) * 0.15, 5);
  const paso = pasoRedondo((vMax + respiro - (vMin - respiro)) / 3);
  vMin = Math.floor((vMin - respiro) / paso) * paso;
  vMax = Math.ceil((vMax + respiro) / paso) * paso;
  const rangoV = Math.max(vMax - vMin, 1);

  const px = (ts) => AREA.x0 + ((ts - tsMin) / rangoTs) * (AREA.x1 - AREA.x0);
  const py = (v) => AREA.y1 - ((v - vMin) / rangoV) * (AREA.y1 - AREA.y0);

  // Marcas del eje Y en números redondos (20, 40, 60…).
  const ticks = [];
  for (let v = vMin; v <= vMax + 0.001; v += paso) ticks.push(Math.round(v));

  const grilla = ticks.map((t) => `
    <line class="g-grilla" x1="${AREA.x0}" y1="${py(t).toFixed(1)}" x2="${AREA.x1}" y2="${py(t).toFixed(1)}"/>
    <text class="g-eje" x="${AREA.x0 - 6}" y="${(py(t) + 3.5).toFixed(1)}" text-anchor="end">${t}</text>
  `).join('');

  const franja = banda ? `
    <rect class="g-banda" x="${AREA.x0}" y="${py(banda.hasta).toFixed(1)}"
          width="${(AREA.x1 - AREA.x0).toFixed(1)}"
          height="${Math.max(py(banda.desde) - py(banda.hasta), 1).toFixed(1)}"/>
  ` : '';

  const capas = conDatos.map((serie, indice) => {
    const puntos = [...serie.puntos].sort((a, b) => a.ts - b.ts);
    const d = puntos.map((p, i) => `${i === 0 ? 'M' : 'L'}${px(p.ts).toFixed(1)},${py(p.valor).toFixed(1)}`).join(' ');
    const marcas = puntos.map((p) => `
      <circle class="g-punto" cx="${px(p.ts).toFixed(1)}" cy="${py(p.valor).toFixed(1)}" r="4"
              style="fill:${serie.color}"/>
    `).join('');
    const ultimo = puntos[puntos.length - 1];
    // Etiqueta directa sólo en el último punto: identidad sin depender del color.
    const etiqueta = `
      <text class="g-etiqueta" x="${(px(ultimo.ts) + 7).toFixed(1)}"
            y="${(py(ultimo.valor) + 3.5).toFixed(1)}">${Math.round(ultimo.valor)}</text>
    `;
    return `<g data-serie="${indice}">
      <path class="g-linea" d="${d}" style="stroke:${serie.color}"/>
      ${marcas}${etiqueta}
    </g>`;
  }).join('');

  const fechaIzq = fmtFecha(tsMin).slice(0, 5);
  const fechaDer = fmtFecha(tsMax).slice(0, 5);

  // Datos para el tooltip: se leen desde JS al mover el dedo.
  const datosTooltip = conDatos.map((s) => ({
    nombre: s.nombre,
    color: s.color,
    puntos: s.puntos.map((p) => ({ ts: p.ts, valor: p.valor, x: +px(p.ts).toFixed(1), y: +py(p.valor).toFixed(1) })),
  }));

  const leyenda = conDatos.length >= 2 ? `
    <div class="g-leyenda">
      ${conDatos.map((s) => `<span class="g-leyenda-item"><i style="background:${s.color}"></i>${esc(s.nombre)}</span>`).join('')}
    </div>` : '';

  return `
    <div class="grafico" id="${esc(id)}" data-grafico='${esc(JSON.stringify({ datos: datosTooltip, unidad }))}'>
      ${leyenda}
      <svg viewBox="0 0 ${ANCHO} ${ALTO}" role="img" aria-label="Gráfico de tendencia" preserveAspectRatio="xMidYMid meet">
        ${franja}
        ${grilla}
        <line class="g-base" x1="${AREA.x0}" y1="${AREA.y1}" x2="${AREA.x1}" y2="${AREA.y1}"/>
        ${capas}
        <text class="g-eje" x="${AREA.x0}" y="${ALTO - 8}" text-anchor="start">${fechaIzq}</text>
        <text class="g-eje" x="${AREA.x1}" y="${ALTO - 8}" text-anchor="end">${fechaDer}</text>
        <line class="g-cruz" x1="0" y1="${AREA.y0}" x2="0" y2="${AREA.y1}" style="display:none"/>
        <rect class="g-captura" x="${AREA.x0}" y="${AREA.y0}"
              width="${AREA.x1 - AREA.x0}" height="${AREA.y1 - AREA.y0}" fill="transparent"/>
      </svg>
      <div class="g-tooltip" hidden></div>
    </div>`;
}

/** Activa el tooltip con cruz para todos los gráficos ya insertados en el DOM. */
export function activarGraficos(raiz = document) {
  raiz.querySelectorAll('.grafico[data-grafico]').forEach((nodo) => {
    if (nodo.dataset.listo === '1') return;
    nodo.dataset.listo = '1';

    const cfg = JSON.parse(nodo.dataset.grafico);
    const svg = nodo.querySelector('svg');
    const cruz = nodo.querySelector('.g-cruz');
    const tooltip = nodo.querySelector('.g-tooltip');
    const captura = nodo.querySelector('.g-captura');

    const mover = (evento) => {
      const matriz = svg.getScreenCTM();
      if (!matriz) return;
      const punto = svg.createSVGPoint();
      punto.x = evento.clientX;
      punto.y = evento.clientY;
      const { x } = punto.matrixTransform(matriz.inverse());

      // Punto más cercano en el eje X, entre todas las series.
      let mejor = null;
      cfg.datos.forEach((serie) => {
        serie.puntos.forEach((p) => {
          const dist = Math.abs(p.x - x);
          if (!mejor || dist < mejor.dist) mejor = { dist, p, serie };
        });
      });
      if (!mejor) return;

      // Todos los valores registrados en ese mismo instante.
      const enEseMomento = cfg.datos
        .map((serie) => ({ serie, p: serie.puntos.find((q) => Math.abs(q.ts - mejor.p.ts) < 60000) }))
        .filter((r) => r.p);

      cruz.setAttribute('x1', mejor.p.x);
      cruz.setAttribute('x2', mejor.p.x);
      cruz.style.display = '';

      tooltip.hidden = false;
      tooltip.innerHTML = `
        <div class="g-tooltip-fecha">${fmtFecha(mejor.p.ts)} · ${fmtHora(mejor.p.ts)}</div>
        ${enEseMomento.map(({ serie, p }) => `
          <div class="g-tooltip-fila">
            <i style="background:${serie.color}"></i>
            <span>${esc(serie.nombre)}</span>
            <b>${Math.round(p.valor)}${cfg.unidad ? ' ' + esc(cfg.unidad) : ''}</b>
          </div>`).join('')}`;

      const anchoCaja = nodo.clientWidth;
      const relativo = (mejor.p.x / ANCHO) * anchoCaja;
      tooltip.style.left = Math.min(Math.max(relativo, 60), anchoCaja - 60) + 'px';
    };

    const ocultar = () => {
      cruz.style.display = 'none';
      tooltip.hidden = true;
    };

    captura.addEventListener('pointermove', mover);
    captura.addEventListener('pointerdown', mover);
    captura.addEventListener('pointerleave', ocultar);
    captura.addEventListener('pointercancel', ocultar);
  });
}
