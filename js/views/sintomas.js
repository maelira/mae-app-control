// Registro de síntomas y eventos del día: mareos, cansancio, vómitos, etc.

import * as store from '../store.js';
import * as notify from '../notify.js';
import {
  fichaSintoma, historialAgrupado, conectarBorrado, aviso, panelAlerta, tarjetaDato,
} from '../componentes.js';
import { claveDia, claveHora, fechaDesdePartes, esc } from '../utils.js';

// Selección en curso (se conserva mientras se re-dibuja la pantalla).
let seleccionados = new Set();
let ultimoAviso = null;

export function render(host) {
  const estado = store.obtener();
  const registros = estado.sintomas;
  const mes = store.ultimos('sintomas', 30);

  // Los síntomas más repetidos del último mes, para verlos de un vistazo.
  const conteo = new Map();
  for (const r of mes) {
    for (const t of r.tipos || []) conteo.set(t, (conteo.get(t) || 0) + 1);
  }
  const masFrecuentes = [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);

  host.innerHTML = `
    <header class="cabecera-vista">
      <h1>Síntomas y eventos</h1>
      <p class="subtitulo">Anotá cómo te sentiste: mareos, cansancio, náuseas, lo que sea.</p>
    </header>

    <div id="alerta-sintoma"></div>

    <form id="form-sintoma" class="tarjeta formulario" novalidate>
      <h2 class="tarjeta-encabezado">¿Qué sentiste?</h2>
      <p class="ayuda">Tocá todos los que correspondan. Podés elegir más de uno.</p>

      <div class="chips-rapidos chips-sintomas" role="group" aria-label="Síntomas">
        ${store.SINTOMAS_COMUNES.map((s) => `
          <button type="button" class="chip ${seleccionados.has(s) ? 'activo' : ''}"
                  data-sintoma="${esc(s)}" aria-pressed="${seleccionados.has(s)}">${esc(s)}</button>
        `).join('')}
      </div>

      <label class="campo">
        <span>Otro (opcional)</span>
        <input type="text" name="otro" placeholder="Escribilo con tus palabras" maxlength="60" autocomplete="off">
      </label>

      <div class="campo">
        <span>¿Qué tan fuerte fue?</span>
        <div class="chips-rapidos" role="group" aria-label="Intensidad">
          ${store.INTENSIDADES_SINTOMA.map((i) => `
            <button type="button" class="chip ${i.valor === 'leve' ? 'activo' : ''}"
                    data-intensidad="${esc(i.valor)}" aria-pressed="${i.valor === 'leve'}">${esc(i.etiqueta)}</button>
          `).join('')}
        </div>
        <input type="hidden" name="intensidad" value="leve">
      </div>

      <div class="campo-fila">
        <label class="campo">
          <span>Día</span>
          <input type="date" name="dia" value="${claveDia()}" max="${claveDia()}" required>
        </label>
        <label class="campo">
          <span>Hora</span>
          <input type="time" name="hora" value="${claveHora()}" required>
        </label>
      </div>

      <label class="campo">
        <span>¿Cuánto duró? (opcional)</span>
        <input type="text" name="duracion" placeholder="Ej.: unos 20 minutos" maxlength="40" autocomplete="off">
      </label>

      <label class="campo">
        <span>Notas (opcional)</span>
        <textarea name="notas" rows="2" maxlength="300"
                  placeholder="Ej.: me pasó al levantarme de la cama"></textarea>
      </label>

      <button type="submit" class="boton boton-primario">Guardar</button>
    </form>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Resumen</h2>
      <div class="rejilla-datos">
        ${tarjetaDato({ titulo: 'Esta semana', valor: store.ultimos('sintomas', 7).length, pie: 'Episodios registrados' })}
        ${tarjetaDato({ titulo: 'Últimos 30 días', valor: mes.length, pie: 'Episodios registrados' })}
      </div>
      ${masFrecuentes.length ? `
        <h3 class="subencabezado">Lo más repetido del mes</h3>
        <ul class="lista-frecuentes">
          ${masFrecuentes.map(([nombre, veces]) => `
            <li><span>${esc(nombre)}</span><b>${veces} ${veces === 1 ? 'vez' : 'veces'}</b></li>
          `).join('')}
        </ul>
        <p class="pie-grafico">Mostrale esta lista a tu médico en la próxima consulta: le sirve más que tratar de acordarte.</p>
      ` : ''}
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Historial</h2>
      ${historialAgrupado(registros.slice(0, 120), fichaSintoma, 'Todavía no registraste ningún síntoma.')}
    </section>

    <p class="nota-legal">Este registro no evalúa ni diagnostica lo que sentís. Si algo te preocupa o empeora, consultá a un profesional.</p>
  `;

  const form = host.querySelector('#form-sintoma');

  form.addEventListener('click', (evento) => {
    const sintoma = evento.target.closest('[data-sintoma]');
    if (sintoma) {
      const nombre = sintoma.dataset.sintoma;
      if (seleccionados.has(nombre)) seleccionados.delete(nombre);
      else seleccionados.add(nombre);
      sintoma.classList.toggle('activo', seleccionados.has(nombre));
      sintoma.setAttribute('aria-pressed', seleccionados.has(nombre));
      return;
    }
    const intensidad = evento.target.closest('[data-intensidad]');
    if (intensidad) {
      form.querySelectorAll('[data-intensidad]').forEach((b) => {
        const activo = b === intensidad;
        b.classList.toggle('activo', activo);
        b.setAttribute('aria-pressed', activo);
      });
      form.querySelector('[name="intensidad"]').value = intensidad.dataset.intensidad;
    }
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    guardar(new FormData(form), host);
  });

  conectarBorrado(host, () => render(host));

  if (ultimoAviso) {
    document.getElementById('alerta-sintoma').innerHTML = ultimoAviso;
    ultimoAviso = null;
  }
}

function guardar(datos, host) {
  const tipos = [...seleccionados];
  const otro = String(datos.get('otro') || '').trim();
  if (otro) tipos.push(otro);

  if (!tipos.length) {
    aviso('Elegí al menos un síntoma, o escribilo en "Otro".', 'error');
    return;
  }

  const fecha = fechaDesdePartes(datos.get('dia'), datos.get('hora'));
  if (Number.isNaN(fecha.getTime())) {
    aviso('Revisá el día y la hora.', 'error');
    return;
  }

  const intensidad = String(datos.get('intensidad') || 'leve');
  store.agregar('sintomas', {
    ts: fecha.getTime(),
    tipos,
    intensidad,
    duracion: String(datos.get('duracion') || '').trim(),
    notas: String(datos.get('notas') || '').trim(),
  });

  ultimoAviso = mensajeOrientativo(tipos, intensidad);
  seleccionados = new Set();
  if (!ultimoAviso) aviso('Registrado');
  render(host);
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Devuelve un panel orientativo, sin diagnosticar: recuerda buscar atención
 * ante síntomas de alarma y sugiere medirse cuando tiene sentido hacerlo.
 */
function mensajeOrientativo(tipos, intensidad) {
  const alarma = tipos.filter((t) => store.SINTOMAS_DE_ALARMA.includes(t));
  if (alarma.length) {
    const texto = `Registraste ${alarma.join(' y ').toLowerCase()}. No lo dejes pasar: comunicate con tu médico o, si te sentís mal ahora, con un servicio de urgencias.`;
    notify.alertarValorFueraDeRango('Síntoma para no dejar pasar', texto);
    return panelAlerta('Conviene que lo consultes', texto, 'serio');
  }

  const medirGlucosa = tipos.some((t) => store.SINTOMAS_MEDIR_GLUCOSA.includes(t));
  const medirPresion = tipos.some((t) => store.SINTOMAS_MEDIR_PRESION.includes(t));

  if (medirGlucosa || medirPresion) {
    const cuales = [
      medirGlucosa ? '<a class="enlace-bloque" href="#/glucosa">Medir glucemia ahora →</a>' : '',
      medirPresion ? '<a class="enlace-bloque" href="#/presion">Medir presión ahora →</a>' : '',
    ].filter(Boolean).join(' ');
    return `<div class="alerta alerta-atencion" role="status">
      <strong>Registrado</strong>
      <p>Con lo que anotaste puede ser buen momento para medirte y dejar el valor junto al síntoma.</p>
      <div class="acciones-alerta">${cuales}</div>
    </div>`;
  }

  if (intensidad === 'fuerte') {
    return panelAlerta('Registrado',
      'Anotaste que fue fuerte. Si se repite o no cede, comentalo con tu médico.', 'atencion');
  }
  return null;
}
