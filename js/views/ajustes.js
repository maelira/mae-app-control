// Ajustes: datos personales, objetivos, copias de seguridad y exportación.

import * as store from '../store.js';
import { aviso } from '../componentes.js';
import {
  aCSV, descargar, claveDia, fmtFecha, fmtHora, esc,
} from '../utils.js';

export function render(host) {
  const estado = store.obtener();
  const o = estado.ajustes.objetivos;

  host.innerHTML = `
    <header class="cabecera-vista">
      <h1>Ajustes</h1>
      <p class="subtitulo">Personalizá la app y guardá una copia de tus datos.</p>
    </header>

    <form id="form-perfil" class="tarjeta formulario">
      <h2 class="tarjeta-encabezado">Tus datos</h2>
      <label class="campo">
        <span>¿Cómo querés que te llamemos?</span>
        <input type="text" name="nombre" value="${esc(estado.perfil.nombre)}" maxlength="40" placeholder="Tu nombre">
      </label>
      <label class="campo">
        <span>Unidad de la glucemia</span>
        <select name="unidadGlucosa">
          <option value="mg/dL"${estado.ajustes.unidadGlucosa === 'mg/dL' ? ' selected' : ''}>mg/dL (la más usada)</option>
          <option value="mmol/L"${estado.ajustes.unidadGlucosa === 'mmol/L' ? ' selected' : ''}>mmol/L</option>
        </select>
      </label>
      <label class="campo-interruptor">
        <span>Sonido al avisar</span>
        <span class="interruptor">
          <input type="checkbox" name="sonido" ${estado.ajustes.sonido ? 'checked' : ''}>
          <span></span>
        </span>
      </label>
      <button type="submit" class="boton boton-primario">Guardar</button>
    </form>

    <form id="form-objetivos" class="tarjeta formulario">
      <h2 class="tarjeta-encabezado">Mis objetivos</h2>
      <p class="ayuda">Estos valores definen cuándo la app te marca una medición como "en objetivo" o te avisa. Consultalos con tu médico. Siempre en mg/dL.</p>

      <div class="campo-fila">
        <label class="campo">
          <span>Aviso por glucemia baja</span>
          <input type="number" name="glucosaBajaAlerta" value="${o.glucosaBajaAlerta}" min="40" max="100" required>
        </label>
        <label class="campo">
          <span>Aviso por glucemia alta</span>
          <input type="number" name="glucosaAltaAlerta" value="${o.glucosaAltaAlerta}" min="150" max="600" required>
        </label>
      </div>

      <div class="campo-fila">
        <label class="campo">
          <span>Objetivo antes de comer (mín.)</span>
          <input type="number" name="glucosaAyunasMin" value="${o.glucosaAyunasMin}" min="50" max="130" required>
        </label>
        <label class="campo">
          <span>Objetivo antes de comer (máx.)</span>
          <input type="number" name="glucosaAyunasMax" value="${o.glucosaAyunasMax}" min="90" max="200" required>
        </label>
      </div>

      <label class="campo">
        <span>Objetivo después de comer (máx.)</span>
        <input type="number" name="glucosaPostMax" value="${o.glucosaPostMax}" min="100" max="300" required>
      </label>

      <button type="submit" class="boton boton-primario">Guardar objetivos</button>
    </form>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Llevar los datos al médico</h2>
      <p class="ayuda">Descargá tus registros para imprimirlos o abrirlos en una planilla.</p>
      <div class="botonera">
        <button type="button" class="boton boton-suave" data-exportar="glucosa">Glucemias (CSV)</button>
        <button type="button" class="boton boton-suave" data-exportar="presion">Presión (CSV)</button>
        <button type="button" class="boton boton-suave" data-exportar="ejercicio">Ejercicio (CSV)</button>
      </div>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Copia de seguridad</h2>
      <p class="ayuda">Tus datos se guardan sólo en este teléfono. Si lo cambiás o borrás el navegador, se pierden: guardá una copia cada tanto.</p>
      <div class="botonera">
        <button type="button" class="boton boton-suave" id="descargar-copia">Descargar copia</button>
        <label class="boton boton-suave como-boton">
          Restaurar copia
          <input type="file" id="restaurar" accept="application/json,.json" hidden>
        </label>
      </div>
      <div class="conteo-registros">
        ${estado.glucosa.length} glucemias · ${estado.presion.length} mediciones de presión · ${estado.ejercicio.length} actividades
      </div>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Zona de riesgo</h2>
      <p class="ayuda">Esto borra todos tus registros de este teléfono y no se puede deshacer.</p>
      <button type="button" class="boton boton-peligro" id="borrar-todo">Borrar todos mis datos</button>
    </section>

    <section class="tarjeta info">
      <h2 class="tarjeta-encabezado">Acerca de</h2>
      <p class="ayuda">Aplicación personal para llevar el control de glucemia, presión arterial y actividad física. Funciona sin internet y guarda todo en tu propio dispositivo: ningún dato de salud se envía a ningún servidor.</p>
      <p class="nota-legal">No es un producto médico. No sirve para diagnosticar ni para decidir tratamientos. Ante cualquier valor que te preocupe, consultá a un profesional de la salud.</p>
    </section>
  `;

  host.querySelector('#form-perfil').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    store.guardarPerfil({ nombre: String(datos.get('nombre') || '').trim() });
    store.guardarAjustes({
      unidadGlucosa: String(datos.get('unidadGlucosa')),
      sonido: datos.get('sonido') === 'on',
    });
    aviso('Ajustes guardados');
  });

  host.querySelector('#form-objetivos').addEventListener('submit', (evento) => {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    const nums = {};
    for (const clave of ['glucosaBajaAlerta', 'glucosaAltaAlerta', 'glucosaAyunasMin', 'glucosaAyunasMax', 'glucosaPostMax']) {
      const n = Number(datos.get(clave));
      if (!Number.isFinite(n)) {
        aviso('Revisá los valores: tienen que ser números.', 'error');
        return;
      }
      nums[clave] = Math.round(n);
    }
    if (nums.glucosaAyunasMin >= nums.glucosaAyunasMax) {
      aviso('El mínimo antes de comer tiene que ser menor que el máximo.', 'error');
      return;
    }
    if (nums.glucosaBajaAlerta >= nums.glucosaAyunasMax) {
      aviso('El aviso por glucemia baja tiene que ser menor que tu objetivo máximo.', 'error');
      return;
    }
    if (nums.glucosaAltaAlerta <= nums.glucosaPostMax) {
      aviso('El aviso por glucemia alta tiene que ser mayor que el objetivo después de comer.', 'error');
      return;
    }
    store.guardarAjustes({ objetivos: nums });
    aviso('Objetivos guardados');
  });

  host.addEventListener('click', (evento) => {
    const boton = evento.target.closest('[data-exportar]');
    if (boton) exportar(boton.dataset.exportar);
  });

  host.querySelector('#descargar-copia').addEventListener('click', () => {
    descargar(`copia-control-salud-${claveDia()}.json`, store.exportarJSON(), 'application/json');
    aviso('Copia descargada');
  });

  host.querySelector('#restaurar').addEventListener('change', async (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    if (!confirm('Restaurar una copia reemplaza todos los datos actuales. ¿Seguimos?')) {
      evento.target.value = '';
      return;
    }
    const texto = await archivo.text();
    const resultado = store.importarJSON(texto);
    aviso(resultado.mensaje, resultado.ok ? 'ok' : 'error');
    evento.target.value = '';
    if (resultado.ok) render(host);
  });

  host.querySelector('#borrar-todo').addEventListener('click', () => {
    if (!confirm('Se van a borrar TODOS tus registros de este teléfono. ¿Estás segura?')) return;
    if (!confirm('Última confirmación: esto no se puede deshacer.')) return;
    store.borrarTodo();
    aviso('Todos los datos fueron borrados');
    render(host);
  });
}

function exportar(coleccion) {
  const estado = store.obtener();
  const registros = [...estado[coleccion]].sort((a, b) => a.ts - b.ts);
  if (!registros.length) {
    aviso('No hay registros para exportar todavía.', 'error');
    return;
  }

  let cabeceras;
  let filas;
  if (coleccion === 'glucosa') {
    cabeceras = ['Fecha', 'Hora', 'Glucemia (mg/dL)', 'Momento', 'Clasificación', 'Notas'];
    filas = registros.map((r) => {
      const momento = store.MOMENTOS_GLUCOSA.find((m) => m.valor === r.momento);
      return [fmtFecha(r.ts), fmtHora(r.ts), Math.round(r.valor), momento?.etiqueta || '', store.clasificarGlucosa(r.valor, r.momento).etiqueta, r.notas || ''];
    });
  } else if (coleccion === 'presion') {
    cabeceras = ['Fecha', 'Hora', 'Sistólica', 'Diastólica', 'Pulso', 'Brazo', 'Clasificación', 'Notas'];
    filas = registros.map((r) => [
      fmtFecha(r.ts), fmtHora(r.ts), r.sistolica, r.diastolica, r.pulso ?? '', r.brazo || '',
      store.clasificarPresion(r.sistolica, r.diastolica).etiqueta, r.notas || '',
    ]);
  } else {
    cabeceras = ['Fecha', 'Hora', 'Actividad', 'Duración (min)', 'Intensidad', 'Notas'];
    filas = registros.map((r) => [fmtFecha(r.ts), fmtHora(r.ts), r.tipo, r.duracion ?? '', r.intensidad || '', r.notas || '']);
  }

  const nombres = { glucosa: 'glucemias', presion: 'presion-arterial', ejercicio: 'ejercicio' };
  // BOM para que Excel abra los acentos correctamente.
  descargar(`${nombres[coleccion]}-${claveDia()}.csv`, '﻿' + aCSV(cabeceras, filas), 'text/csv;charset=utf-8');
  aviso('Archivo descargado');
}
