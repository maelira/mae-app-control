// Piezas de interfaz reutilizadas por las distintas pantallas.

import { esc, fmtHora, fmtFechaRelativa, claveDia } from './utils.js';
import * as store from './store.js';

/** Etiqueta de color según el nivel clínico: bien | atencion | serio | critico. */
export function insignia(clasificacion) {
  const iconos = { bien: '✓', atencion: '!', serio: '▲', critico: '⚠' };
  const icono = iconos[clasificacion.nivel];
  return `<span class="insignia nivel-${esc(clasificacion.nivel)}">
    ${icono ? `<i aria-hidden="true">${icono}</i>` : ''}${esc(clasificacion.etiqueta)}
  </span>`;
}

/** Mensaje flotante breve. */
let temporizadorToast = null;
export function aviso(texto, tipo = 'ok') {
  let caja = document.getElementById('toast');
  if (!caja) {
    caja = document.createElement('div');
    caja.id = 'toast';
    document.body.appendChild(caja);
  }
  caja.className = `toast toast-${tipo} visible`;
  caja.textContent = texto;
  clearTimeout(temporizadorToast);
  temporizadorToast = setTimeout(() => caja.classList.remove('visible'), 3200);
}

/** Panel de alerta destacado dentro de una pantalla. */
export function panelAlerta(titulo, mensaje, nivel = 'serio') {
  return `<div class="alerta alerta-${esc(nivel)}" role="alert">
    <strong>${esc(titulo)}</strong>
    <p>${esc(mensaje)}</p>
  </div>`;
}

/**
 * Estructura común de una ficha del historial.
 * La insignia va debajo del detalle: en pantallas angostas las etiquetas largas
 * ("Hipertensión grado 1") no tienen espacio al costado del valor.
 */
function ficha({ coleccion, id, ts, valor, unidad, meta, notas, estado, valorTexto = false }) {
  return `<li class="ficha" data-id="${esc(id)}" data-coleccion="${esc(coleccion)}">
    <div class="ficha-hora">${fmtHora(ts)}</div>
    <div class="ficha-cuerpo">
      <div class="ficha-valor${valorTexto ? ' ficha-valor-texto' : ''}">${esc(valor)}${unidad ? `<small>${esc(unidad)}</small>` : ''}</div>
      ${meta ? `<div class="ficha-meta">${esc(meta)}</div>` : ''}
      ${notas ? `<div class="ficha-notas">${esc(notas)}</div>` : ''}
      <div class="ficha-estado">${estado}</div>
    </div>
    <button class="boton-icono borrar" data-borrar="${esc(coleccion)}" data-id="${esc(id)}"
            aria-label="Eliminar registro">✕</button>
  </li>`;
}

/** Ficha de una medición de glucosa. */
export function fichaGlucosa(registro) {
  const clas = store.clasificarGlucosa(registro.valor, registro.momento);
  const momento = store.MOMENTOS_GLUCOSA.find((m) => m.valor === registro.momento);
  return ficha({
    coleccion: 'glucosa',
    id: registro.id,
    ts: registro.ts,
    valor: store.mostrarGlucosa(registro.valor),
    unidad: store.unidadGlucosa(),
    meta: momento?.etiqueta || 'Sin especificar',
    notas: registro.notas,
    estado: insignia(clas),
  });
}

/** Ficha de una medición de presión arterial. */
export function fichaPresion(registro) {
  const clas = store.clasificarPresion(registro.sistolica, registro.diastolica);
  const partes = [
    registro.pulso ? `Pulso ${registro.pulso} lpm` : 'Sin pulso registrado',
    registro.brazo,
  ].filter(Boolean);
  return ficha({
    coleccion: 'presion',
    id: registro.id,
    ts: registro.ts,
    valor: `${registro.sistolica}/${registro.diastolica}`,
    unidad: 'mmHg',
    meta: partes.join(' · '),
    notas: registro.notas,
    estado: insignia(clas),
  });
}

/** Ficha de una sesión de ejercicio. */
export function fichaEjercicio(registro) {
  const etiquetas = { suave: 'Suave', moderada: 'Moderada', intensa: 'Intensa' };
  const partes = [
    registro.duracion ? `${registro.duracion} min` : 'Sin duración',
    registro.intensidad ? etiquetas[registro.intensidad] || registro.intensidad : null,
  ].filter(Boolean);
  return ficha({
    coleccion: 'ejercicio',
    id: registro.id,
    ts: registro.ts,
    valor: registro.tipo,
    valorTexto: true,
    meta: partes.join(' · '),
    notas: registro.notas,
    estado: '<span class="insignia nivel-ejercicio"><i aria-hidden="true">🏃</i>Actividad</span>',
  });
}

/** Ficha de una toma de medicamento. */
export function fichaMedicamento(registro) {
  const sensacion = store.SENSACIONES.find((s) => s.valor === registro.sensacion);
  const estado = sensacion && sensacion.valor
    ? insignia({ nivel: sensacion.nivel || 'neutro', etiqueta: sensacion.etiqueta })
    : '<span class="insignia nivel-medicamento"><i aria-hidden="true">💊</i>Tomado</span>';
  return ficha({
    coleccion: 'medicamentos',
    id: registro.id,
    ts: registro.ts,
    valor: registro.nombre,
    valorTexto: true,
    meta: registro.dosis || '',
    notas: registro.notas,
    estado,
  });
}

/** Ficha de una comida. */
export function fichaComida(registro) {
  const tipo = store.TIPOS_COMIDA.find((t) => t.valor === registro.tipo);
  return ficha({
    coleccion: 'comidas',
    id: registro.id,
    ts: registro.ts,
    valor: tipo?.etiqueta || 'Comida',
    valorTexto: true,
    meta: registro.descripcion || '',
    notas: registro.notas,
    estado: '<span class="insignia nivel-comida"><i aria-hidden="true">🍽️</i>Comida</span>',
  });
}

/** Ficha de un síntoma o evento del día. */
export function fichaSintoma(registro) {
  const lista = Array.isArray(registro.tipos) ? registro.tipos : [registro.tipos].filter(Boolean);
  const intensidad = store.INTENSIDADES_SINTOMA.find((i) => i.valor === registro.intensidad);
  const estado = intensidad
    ? insignia({ nivel: intensidad.nivel || 'neutro', etiqueta: intensidad.etiqueta })
    : '<span class="insignia nivel-sintoma"><i aria-hidden="true">▲</i>Registrado</span>';
  return ficha({
    coleccion: 'sintomas',
    id: registro.id,
    ts: registro.ts,
    valor: lista.join(', ') || 'Sin especificar',
    valorTexto: true,
    meta: registro.duracion ? `Duró ${registro.duracion}` : '',
    notas: registro.notas,
    estado,
  });
}

/** Agrupa registros por día y los pinta con su encabezado de fecha. */
export function historialAgrupado(registros, pintarFicha, textoVacio) {
  if (!registros.length) return `<p class="vacio">${esc(textoVacio)}</p>`;
  const grupos = new Map();
  for (const r of registros) {
    const clave = claveDia(r.ts);
    if (!grupos.has(clave)) grupos.set(clave, []);
    grupos.get(clave).push(r);
  }
  return [...grupos.entries()].map(([, lista]) => `
    <section class="grupo-dia">
      <h3 class="grupo-titulo">${esc(fmtFechaRelativa(lista[0].ts))}</h3>
      <ul class="lista-fichas">${lista.map(pintarFicha).join('')}</ul>
    </section>`).join('');
}

/** Conecta los botones "✕" de una pantalla con el borrado (pide confirmación). */
export function conectarBorrado(contenedor, alBorrar) {
  contenedor.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-borrar]');
    if (!boton) return;
    if (!confirm('¿Querés eliminar este registro? No se puede deshacer.')) return;
    store.eliminar(boton.dataset.borrar, boton.dataset.id);
    aviso('Registro eliminado');
    alBorrar?.();
  });
}

/** Tarjeta con un número grande (última medición, promedio, etc.). */
export function tarjetaDato({ titulo, valor, unidad = '', pie = '', nivel = '' }) {
  return `<div class="tarjeta-dato ${nivel ? 'borde-' + esc(nivel) : ''}">
    <div class="tarjeta-titulo">${esc(titulo)}</div>
    <div class="tarjeta-valor">${esc(valor)}${unidad ? `<small>${esc(unidad)}</small>` : ''}</div>
    ${pie ? `<div class="tarjeta-pie">${esc(pie)}</div>` : ''}
  </div>`;
}
