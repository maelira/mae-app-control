// Alertas y recordatorios para no olvidarse los controles.

import * as store from '../store.js';
import * as notify from '../notify.js';
import { aviso } from '../componentes.js';
import { DIAS_CORTOS, esc, nuevoId } from '../utils.js';

// Orden de la semana empezando en lunes: [1,2,3,4,5,6,0]
const ORDEN_DIAS = [1, 2, 3, 4, 5, 6, 0];

const ETIQUETAS_TIPO = {
  glucosa: { nombre: 'Glucómetro', icono: '💧' },
  presion: { nombre: 'Tensiómetro', icono: '❤️' },
  ejercicio: { nombre: 'Ejercicio', icono: '🏃' },
};

let editando = null; // id del recordatorio en edición, 'nuevo', o null

export function render(host) {
  const estado = store.obtener();
  const permiso = notify.permisoActual();

  host.innerHTML = `
    <header class="cabecera-vista">
      <h1>Recordatorios</h1>
      <p class="subtitulo">La app te avisa a la hora que elijas para hacerte los controles.</p>
    </header>

    ${bannerPermiso(permiso)}

    <section class="tarjeta">
      <div class="fila-encabezado">
        <h2 class="tarjeta-encabezado sin-margen">Mis avisos</h2>
        <button type="button" class="boton boton-suave boton-chico" id="nuevo-recordatorio">+ Nuevo</button>
      </div>
      ${editando === 'nuevo' ? formulario(null) : ''}
      ${estado.recordatorios.length
        ? `<ul class="lista-recordatorios">${estado.recordatorios.map(item).join('')}</ul>`
        : '<p class="vacio">No tenés recordatorios configurados.</p>'}
    </section>

    <section class="tarjeta info">
      <h2 class="tarjeta-encabezado">Cómo funcionan los avisos</h2>
      <ul class="lista-info">
        <li><strong>Instalá la app en la pantalla de inicio</strong> para que los avisos lleguen como los de cualquier otra aplicación.</li>
        <li>Los recordatorios suenan mientras la app esté abierta o en segundo plano. Si el teléfono estuvo apagado, al abrirla vas a ver los controles que quedaron pendientes.</li>
        <li>Si cerraste la app por completo, el aviso aparece la próxima vez que la abras (hasta 3 horas después de la hora prevista).</li>
        <li>En iPhone las notificaciones sólo funcionan si agregaste la app a la pantalla de inicio (iOS 16.4 o superior).</li>
      </ul>
      <button type="button" class="boton boton-suave" id="probar">Enviar aviso de prueba</button>
    </section>
  `;

  host.querySelector('#nuevo-recordatorio').addEventListener('click', () => {
    editando = editando === 'nuevo' ? null : 'nuevo';
    render(host);
  });

  host.querySelector('#probar').addEventListener('click', async () => {
    const ok = await notify.probarNotificacion();
    aviso(ok ? 'Aviso enviado. Revisá tus notificaciones.' : 'Primero hay que permitir las notificaciones.', ok ? 'ok' : 'error');
    render(host);
  });

  host.querySelector('#activar-permiso')?.addEventListener('click', async () => {
    const ok = await notify.pedirPermiso();
    store.guardarAjustes({ notificaciones: ok });
    aviso(ok ? 'Notificaciones activadas' : 'No se concedió el permiso', ok ? 'ok' : 'error');
    render(host);
  });

  host.addEventListener('click', (evento) => {
    const editar = evento.target.closest('[data-editar]');
    if (editar) {
      editando = editando === editar.dataset.editar ? null : editar.dataset.editar;
      render(host);
      return;
    }
    const borrar = evento.target.closest('[data-borrar-rec]');
    if (borrar) {
      if (!confirm('¿Eliminar este recordatorio?')) return;
      store.eliminarRecordatorio(borrar.dataset.borrarRec);
      aviso('Recordatorio eliminado');
      render(host);
      return;
    }
    const cancelar = evento.target.closest('[data-cancelar]');
    if (cancelar) {
      editando = null;
      render(host);
    }
  });

  host.addEventListener('change', (evento) => {
    const interruptor = evento.target.closest('[data-activar]');
    if (!interruptor) return;
    const rec = store.obtener().recordatorios.find((r) => r.id === interruptor.dataset.activar);
    if (!rec) return;
    store.guardarRecordatorio({ ...rec, activo: interruptor.checked });
    aviso(interruptor.checked ? 'Recordatorio activado' : 'Recordatorio pausado');
    render(host);
  });

  host.querySelectorAll('form.form-recordatorio').forEach((form) => {
    form.addEventListener('click', (evento) => {
      const dia = evento.target.closest('[data-dia-semana]');
      if (dia) {
        evento.preventDefault();
        dia.classList.toggle('activo');
        dia.setAttribute('aria-pressed', dia.classList.contains('activo'));
        return;
      }
      const preset = evento.target.closest('[data-preset]');
      if (preset) {
        evento.preventDefault();
        const objetivo = preset.dataset.preset === 'semana' ? [1, 2, 3, 4, 5] : ORDEN_DIAS;
        form.querySelectorAll('[data-dia-semana]').forEach((boton) => {
          const activo = objetivo.includes(Number(boton.dataset.diaSemana));
          boton.classList.toggle('activo', activo);
          boton.setAttribute('aria-pressed', activo);
        });
      }
    });

    form.addEventListener('submit', (evento) => {
      evento.preventDefault();
      guardar(form, host);
    });
  });
}

function bannerPermiso(permiso) {
  if (permiso === 'granted') {
    return `<div class="alerta alerta-bien" role="status">
      <strong>Notificaciones activadas</strong>
      <p>Vas a recibir los avisos en la hora que configures.</p>
    </div>`;
  }
  if (permiso === 'denied') {
    return `<div class="alerta alerta-serio" role="alert">
      <strong>Las notificaciones están bloqueadas</strong>
      <p>Tu teléfono tiene bloqueados los avisos de esta app. Entrá a los ajustes del navegador (o mantené presionado el ícono de la app → Notificaciones) y permitilas para volver a recibirlos.</p>
    </div>`;
  }
  if (permiso === 'no-soportado') {
    return `<div class="alerta alerta-atencion" role="alert">
      <strong>Este navegador no admite notificaciones</strong>
      <p>Vas a poder registrar todo igual, y al abrir la app verás los controles pendientes del día.</p>
    </div>`;
  }
  return `<div class="alerta alerta-atencion">
    <strong>Activá las notificaciones</strong>
    <p>Hace falta tu permiso para poder avisarte a la hora de cada control.</p>
    <button type="button" class="boton boton-primario boton-chico" id="activar-permiso">Activar notificaciones</button>
  </div>`;
}

function item(rec) {
  const tipo = ETIQUETAS_TIPO[rec.tipo] || ETIQUETAS_TIPO.glucosa;
  const dias = ORDEN_DIAS.filter((d) => rec.dias.includes(d)).map((d) => DIAS_CORTOS[d]);
  const textoDias = dias.length === 7 ? 'Todos los días'
    : dias.length === 5 && !rec.dias.includes(0) && !rec.dias.includes(6) ? 'De lunes a viernes'
    : dias.join(', ') || 'Ningún día';

  return `<li class="recordatorio ${rec.activo ? '' : 'pausado'}">
    <div class="recordatorio-icono" aria-hidden="true">${tipo.icono}</div>
    <div class="recordatorio-cuerpo">
      <div class="recordatorio-hora">${esc(rec.hora)}</div>
      <div class="recordatorio-nombre">${esc(rec.etiqueta || tipo.nombre)}</div>
      <div class="recordatorio-meta">${esc(textoDias)}</div>
      <div class="recordatorio-proximo">${rec.activo ? esc(notify.textoProximaVez(rec)) : 'En pausa'}</div>
    </div>
    <div class="recordatorio-acciones">
      <label class="interruptor" title="Activar o pausar">
        <input type="checkbox" data-activar="${esc(rec.id)}" ${rec.activo ? 'checked' : ''}
               aria-label="Activar recordatorio ${esc(rec.etiqueta || tipo.nombre)}">
        <span></span>
      </label>
      <button type="button" class="boton-icono" data-editar="${esc(rec.id)}" aria-label="Editar">✎</button>
      <button type="button" class="boton-icono borrar" data-borrar-rec="${esc(rec.id)}" aria-label="Eliminar">✕</button>
    </div>
    ${editando === rec.id ? formulario(rec) : ''}
  </li>`;
}

function formulario(rec) {
  const actual = rec || { id: '', tipo: 'glucosa', etiqueta: '', hora: '08:00', dias: ORDEN_DIAS, activo: true };
  return `<form class="form-recordatorio formulario" data-id="${esc(actual.id)}">
    <label class="campo">
      <span>¿Qué control?</span>
      <select name="tipo">
        ${Object.entries(ETIQUETAS_TIPO).map(([valor, t]) =>
          `<option value="${valor}"${valor === actual.tipo ? ' selected' : ''}>${t.icono} ${esc(t.nombre)}</option>`).join('')}
      </select>
    </label>

    <label class="campo">
      <span>Nombre del aviso</span>
      <input type="text" name="etiqueta" value="${esc(actual.etiqueta)}" maxlength="60"
             placeholder="Ej.: Glucemia en ayunas">
    </label>

    <label class="campo">
      <span>Hora</span>
      <input type="time" name="hora" value="${esc(actual.hora)}" required>
    </label>

    <div class="campo">
      <span>Días</span>
      <div class="selector-dias">
        ${ORDEN_DIAS.map((d) => `
          <button type="button" class="dia-boton ${actual.dias.includes(d) ? 'activo' : ''}"
                  data-dia-semana="${d}" aria-pressed="${actual.dias.includes(d)}">${DIAS_CORTOS[d]}</button>`).join('')}
      </div>
      <div class="atajos-dias">
        <button type="button" class="enlace" data-preset="todos">Todos los días</button>
        <button type="button" class="enlace" data-preset="semana">Lunes a viernes</button>
      </div>
    </div>

    <div class="acciones-formulario">
      <button type="submit" class="boton boton-primario">Guardar</button>
      <button type="button" class="boton boton-suave" data-cancelar>Cancelar</button>
    </div>
  </form>`;
}

async function guardar(form, host) {
  const datos = new FormData(form);
  const dias = [...form.querySelectorAll('.dia-boton.activo')].map((b) => Number(b.dataset.diaSemana));

  if (!dias.length) {
    aviso('Elegí al menos un día de la semana.', 'error');
    return;
  }
  const hora = String(datos.get('hora') || '');
  if (!/^\d{2}:\d{2}$/.test(hora)) {
    aviso('Indicá la hora del aviso.', 'error');
    return;
  }

  const tipo = String(datos.get('tipo'));
  const id = form.dataset.id || nuevoId();
  store.guardarRecordatorio({
    id,
    tipo,
    etiqueta: String(datos.get('etiqueta') || '').trim() || ETIQUETAS_TIPO[tipo].nombre,
    hora,
    dias,
    activo: true,
  });

  // Sin permiso el recordatorio se guarda igual, pero conviene pedirlo ahora.
  if (notify.permisoActual() === 'default') {
    const ok = await notify.pedirPermiso();
    store.guardarAjustes({ notificaciones: ok });
  }

  editando = null;
  aviso('Recordatorio guardado');
  render(host);
}
