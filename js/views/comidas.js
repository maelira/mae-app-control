// Registro de comidas: qué comí y cuándo.

import * as store from '../store.js';
import {
  fichaComida, historialAgrupado, conectarBorrado, aviso, tarjetaDato,
} from '../componentes.js';
import { claveDia, claveHora, fechaDesdePartes, esc } from '../utils.js';

export function render(host) {
  const estado = store.obtener();
  const registros = estado.comidas;
  const delDia = store.registrosDelDia(claveDia());
  const hoy = delDia.comidas;

  host.innerHTML = `
    <header class="cabecera-vista">
      <h1>Comidas</h1>
      <p class="subtitulo">Anotá qué comés para poder relacionarlo con tus valores.</p>
    </header>

    <form id="form-comida" class="tarjeta formulario" novalidate>
      <h2 class="tarjeta-encabezado">Nueva comida</h2>

      <div class="campo">
        <span>¿Cuál?</span>
        <div class="chips-rapidos" role="group" aria-label="Tipo de comida">
          ${store.TIPOS_COMIDA.map((t) => `
            <button type="button" class="chip ${t.valor === tipoSugerido() ? 'activo' : ''}"
                    data-tipo="${esc(t.valor)}" aria-pressed="${t.valor === tipoSugerido()}">${esc(t.etiqueta)}</button>
          `).join('')}
        </div>
        <input type="hidden" name="tipo" value="${tipoSugerido()}">
      </div>

      <label class="campo campo-destacado">
        <span>¿Qué comiste?</span>
        <textarea name="descripcion" rows="3" required maxlength="300"
                  placeholder="Ej.: dos tostadas integrales con queso y un té sin azúcar"></textarea>
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
        <span>Notas (opcional)</span>
        <input type="text" name="notas" placeholder="Ej.: comí apurada, me quedé con hambre" maxlength="140">
      </label>

      <button type="submit" class="boton boton-primario">Guardar comida</button>
    </form>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Resumen</h2>
      <div class="rejilla-datos">
        ${tarjetaDato({ titulo: 'Comidas de hoy', valor: hoy.length, pie: hoy.length ? 'Registradas' : 'Todavía ninguna' })}
        ${tarjetaDato({ titulo: 'Esta semana', valor: store.ultimos('comidas', 7).length, pie: 'Comidas anotadas' })}
      </div>
      ${hoy.length && delDia.glucosa.length ? `
        <p class="pie-grafico">Hoy también cargaste ${delDia.glucosa.length} medición${delDia.glucosa.length === 1 ? '' : 'es'} de glucemia. En el calendario podés ver ambas cosas juntas, día por día.</p>
      ` : ''}
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Historial</h2>
      ${historialAgrupado(registros.slice(0, 120), fichaComida, 'Todavía no registraste ninguna comida.')}
    </section>
  `;

  const form = host.querySelector('#form-comida');

  form.addEventListener('click', (evento) => {
    const chip = evento.target.closest('[data-tipo]');
    if (!chip) return;
    form.querySelectorAll('[data-tipo]').forEach((b) => {
      const activo = b === chip;
      b.classList.toggle('activo', activo);
      b.setAttribute('aria-pressed', activo);
    });
    form.querySelector('[name="tipo"]').value = chip.dataset.tipo;
  });

  form.addEventListener('submit', (evento) => {
    evento.preventDefault();
    guardar(new FormData(form), host);
  });

  conectarBorrado(host, () => render(host));
}

/** Propone desayuno, almuerzo, etc. según la hora. */
function tipoSugerido() {
  const h = new Date().getHours();
  if (h < 11) return 'desayuno';
  if (h < 12) return 'media-manana';
  if (h < 15) return 'almuerzo';
  if (h < 19) return 'merienda';
  if (h < 23) return 'cena';
  return 'colacion';
}

function guardar(datos, host) {
  const descripcion = String(datos.get('descripcion') || '').trim();
  if (!descripcion) {
    aviso('Contá qué comiste.', 'error');
    return;
  }

  const fecha = fechaDesdePartes(datos.get('dia'), datos.get('hora'));
  if (Number.isNaN(fecha.getTime())) {
    aviso('Revisá el día y la hora.', 'error');
    return;
  }

  store.agregar('comidas', {
    ts: fecha.getTime(),
    tipo: String(datos.get('tipo') || 'almuerzo'),
    descripcion,
    notas: String(datos.get('notas') || '').trim(),
  });

  aviso('Comida guardada');
  render(host);
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
