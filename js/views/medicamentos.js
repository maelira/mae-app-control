// Registro de medicación: qué tomé, a qué hora y cómo me sentí después.

import * as store from '../store.js';
import {
  fichaMedicamento, historialAgrupado, conectarBorrado, aviso, tarjetaDato,
} from '../componentes.js';
import { claveDia, claveHora, fechaDesdePartes, fmtHora, esc } from '../utils.js';

// Última toma guardada, para poder anotar la sensación un rato después.
let recienGuardado = null;

export function render(host) {
  const estado = store.obtener();
  const registros = estado.medicamentos;
  const hoy = store.registrosDelDia(claveDia()).medicamentos;
  const usados = store.medicamentosUsados();
  const pendientesDeSensacion = registros
    .filter((r) => !r.sensacion && Date.now() - r.ts < 24 * 3600000)
    .slice(0, 5);

  host.innerHTML = `
    <header class="cabecera-vista">
      <h1>Medicamentos</h1>
      <p class="subtitulo">Anotá cada toma y cómo te cayó.</p>
    </header>

    <form id="form-medicamento" class="tarjeta formulario" novalidate>
      <h2 class="tarjeta-encabezado">Nueva toma</h2>

      <label class="campo campo-destacado">
        <span>¿Qué tomaste?</span>
        <input type="text" name="nombre" list="lista-medicamentos" required autocomplete="off"
               placeholder="Ej.: Metformina" maxlength="80">
      </label>
      <datalist id="lista-medicamentos">
        ${usados.map((m) => `<option value="${esc(m.nombre)}"></option>`).join('')}
      </datalist>

      ${usados.length ? `
        <div class="chips-rapidos" role="group" aria-label="Medicamentos usados antes">
          ${usados.slice(0, 8).map((m) => `
            <button type="button" class="chip" data-medicamento="${esc(m.nombre)}" data-dosis="${esc(m.dosis)}">${esc(m.nombre)}</button>
          `).join('')}
        </div>` : ''}

      <label class="campo">
        <span>Dosis (opcional)</span>
        <input type="text" name="dosis" placeholder="Ej.: 1 comprimido de 850 mg" maxlength="60" autocomplete="off">
      </label>

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
        <span>¿Cómo te sentiste después?</span>
        <select name="sensacion">
          ${store.SENSACIONES.map((s) => `<option value="${esc(s.valor)}">${esc(s.etiqueta)}</option>`).join('')}
        </select>
      </label>

      <label class="campo">
        <span>Notas (opcional)</span>
        <input type="text" name="notas" placeholder="Ej.: la tomé con la comida" maxlength="140">
      </label>

      <button type="submit" class="boton boton-primario">Guardar toma</button>
    </form>

    ${pendientesDeSensacion.length ? `
      <section class="tarjeta">
        <h2 class="tarjeta-encabezado">¿Cómo te cayeron?</h2>
        <p class="ayuda">Tomas de las últimas 24 horas donde todavía no anotaste cómo te sentiste.</p>
        <ul class="lista-sensaciones">
          ${pendientesDeSensacion.map((r) => `
            <li>
              <div>
                <strong>${esc(r.nombre)}</strong>
                <span class="sensacion-hora">${fmtHora(r.ts)}</span>
              </div>
              <div class="botones-sensacion">
                ${store.SENSACIONES.filter((s) => s.valor).map((s) => `
                  <button type="button" class="chip" data-sensacion="${esc(s.valor)}" data-registro="${esc(r.id)}">
                    ${esc(s.etiqueta)}
                  </button>`).join('')}
              </div>
            </li>`).join('')}
        </ul>
      </section>` : ''}

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Resumen</h2>
      <div class="rejilla-datos">
        ${tarjetaDato({ titulo: 'Tomas de hoy', valor: hoy.length, pie: hoy.length ? hoy.map((r) => fmtHora(r.ts)).join(' · ') : 'Todavía ninguna' })}
        ${tarjetaDato({ titulo: 'Esta semana', valor: store.ultimos('medicamentos', 7).length, pie: 'Tomas registradas' })}
        ${tarjetaDato({ titulo: 'Medicamentos distintos', valor: usados.length, pie: 'En todo tu historial' })}
        ${tarjetaDato({
          titulo: 'Con molestias',
          valor: store.ultimos('medicamentos', 30).filter((r) => r.sensacion === 'molestias').length,
          pie: 'Últimos 30 días',
        })}
      </div>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Historial</h2>
      ${historialAgrupado(registros.slice(0, 120), fichaMedicamento, 'Todavía no registraste ninguna toma.')}
    </section>

    <p class="nota-legal">Esta app sólo lleva el registro de lo que tomás. Nunca cambies una dosis ni suspendas un medicamento por tu cuenta: eso lo decide tu médico.</p>
  `;

  const form = host.querySelector('#form-medicamento');

  // Repetir un medicamento ya usado con un toque.
  host.addEventListener('click', (evento) => {
    const chip = evento.target.closest('[data-medicamento]');
    if (chip) {
      form.querySelector('[name="nombre"]').value = chip.dataset.medicamento;
      if (chip.dataset.dosis) form.querySelector('[name="dosis"]').value = chip.dataset.dosis;
      return;
    }
    const sensacion = evento.target.closest('[data-sensacion]');
    if (sensacion) {
      store.actualizar('medicamentos', sensacion.dataset.registro, { sensacion: sensacion.dataset.sensacion });
      aviso('Anotado, gracias');
      render(host);
    }
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    guardar(new FormData(form), host);
  });

  conectarBorrado(host, () => render(host));

  if (recienGuardado) {
    aviso(`Toma de ${recienGuardado} guardada`);
    recienGuardado = null;
  }
}

function guardar(datos, host) {
  const nombre = String(datos.get('nombre') || '').trim();
  if (!nombre) {
    aviso('Escribí qué medicamento tomaste.', 'error');
    return;
  }

  const fecha = fechaDesdePartes(datos.get('dia'), datos.get('hora'));
  if (Number.isNaN(fecha.getTime())) {
    aviso('Revisá el día y la hora.', 'error');
    return;
  }

  store.agregar('medicamentos', {
    ts: fecha.getTime(),
    nombre,
    dosis: String(datos.get('dosis') || '').trim(),
    sensacion: String(datos.get('sensacion') || ''),
    notas: String(datos.get('notas') || '').trim(),
  });

  recienGuardado = nombre;
  render(host);
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
