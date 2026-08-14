// Calendario y registro de actividad física.
// Se elige el día en el calendario y se carga la hora, el tipo y la duración.

import * as store from '../store.js';
import {
  fichaEjercicio, fichaGlucosa, fichaPresion, fichaMedicamento, fichaComida, fichaSintoma,
  conectarBorrado, aviso, tarjetaDato,
} from '../componentes.js';
import {
  claveDia, claveHora, fechaDesdePartes, fmtFechaLarga, MESES, esc,
} from '../utils.js';

// El calendario arranca la semana en lunes.
const CABECERA_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

let mesVisible = primerDiaDelMes(new Date());
let diaSeleccionado = claveDia();

function primerDiaDelMes(fecha) {
  return new Date(fecha.getFullYear(), fecha.getMonth(), 1);
}

/** Permite que otras pantallas abran el calendario en un día concreto. */
export function seleccionarDia(clave) {
  diaSeleccionado = clave;
  const [a, m] = clave.split('-').map(Number);
  mesVisible = new Date(a, m - 1, 1);
}

export function render(host) {
  const anio = mesVisible.getFullYear();
  const mes = mesVisible.getMonth();
  const inicioMes = new Date(anio, mes, 1);
  const finMes = new Date(anio, mes + 1, 0, 23, 59, 59, 999);
  const resumen = store.resumenPorDia(inicioMes.getTime(), finMes.getTime());

  // Lunes = 0 … Domingo = 6
  const desplazamiento = (inicioMes.getDay() + 6) % 7;
  const diasEnMes = finMes.getDate();
  const hoy = claveDia();

  const celdas = [];
  for (let i = 0; i < desplazamiento; i++) celdas.push('<div class="celda vacia"></div>');
  for (let dia = 1; dia <= diasEnMes; dia++) {
    const clave = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const cuentas = resumen[clave] || {};
    // Sólo se marcan los tipos que dan señal al verlos en el mes.
    // Medicación y comidas se registran todos los días: un punto diario no informaría nada.
    const puntos = [
      cuentas.glucosa ? '<i class="punto punto-glucosa"></i>' : '',
      cuentas.presion ? '<i class="punto punto-presion"></i>' : '',
      cuentas.ejercicio ? '<i class="punto punto-ejercicio"></i>' : '',
      // Los síntomas usan forma propia (triángulo), no un color más.
      cuentas.sintomas ? '<i class="marca-sintoma" aria-hidden="true">▲</i>' : '',
    ].join('');

    const descripcion = [
      cuentas.glucosa ? 'glucemia' : '',
      cuentas.presion ? 'presión' : '',
      cuentas.ejercicio ? 'ejercicio' : '',
      cuentas.sintomas ? 'síntomas' : '',
    ].filter(Boolean).join(', ');

    const clases = ['celda'];
    if (clave === hoy) clases.push('es-hoy');
    if (clave === diaSeleccionado) clases.push('seleccionada');
    celdas.push(`
      <button type="button" class="${clases.join(' ')}" data-dia="${clave}"
              aria-label="${dia} de ${MESES[mes]}${descripcion ? ', con ' + descripcion : ''}"
              ${clave === diaSeleccionado ? 'aria-current="date"' : ''}>
        <span class="numero">${dia}</span>
        <span class="puntos">${puntos}</span>
      </button>`);
  }

  const delDia = store.registrosDelDia(diaSeleccionado);
  const ejerciciosDelMes = store.obtener().ejercicio.filter((r) => r.ts >= inicioMes.getTime() && r.ts <= finMes.getTime());
  const minutosMes = ejerciciosDelMes.reduce((n, r) => n + (Number(r.duracion) || 0), 0);
  const diasActivos = new Set(ejerciciosDelMes.map((r) => claveDia(r.ts))).size;

  host.innerHTML = `
    <header class="cabecera-vista">
      <h1>Calendario</h1>
      <p class="subtitulo">Elegí un día para ver o cargar tu actividad física.</p>
    </header>

    <section class="tarjeta">
      <div class="calendario-barra">
        <button type="button" class="boton-icono" id="mes-anterior" aria-label="Mes anterior">‹</button>
        <h2 class="calendario-titulo">${MESES[mes]} ${anio}</h2>
        <button type="button" class="boton-icono" id="mes-siguiente" aria-label="Mes siguiente">›</button>
      </div>

      <div class="calendario-semana">
        ${CABECERA_SEMANA.map((d) => `<span>${d}</span>`).join('')}
      </div>
      <div class="calendario-rejilla" id="rejilla">${celdas.join('')}</div>

      <div class="calendario-leyenda">
        <span><i class="punto punto-glucosa"></i>Glucemia</span>
        <span><i class="punto punto-presion"></i>Presión</span>
        <span><i class="punto punto-ejercicio"></i>Ejercicio</span>
        <span><i class="marca-sintoma" aria-hidden="true">▲</i>Síntomas</span>
      </div>
      <p class="ayuda ayuda-calendario">Tocá cualquier día para ver todo lo que registraste: también medicación y comidas.</p>
      <button type="button" class="boton boton-suave" id="ir-hoy">Ir a hoy</button>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Resumen del mes</h2>
      <div class="rejilla-datos">
        ${tarjetaDato({ titulo: 'Sesiones', valor: ejerciciosDelMes.length, pie: 'Actividades registradas' })}
        ${tarjetaDato({ titulo: 'Tiempo total', valor: minutosMes, unidad: 'min', pie: horasBonitas(minutosMes) })}
        ${tarjetaDato({ titulo: 'Días activos', valor: diasActivos, pie: `de ${diasEnMes} días` })}
      </div>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">${esc(fmtFechaLarga(fechaDesdePartes(diaSeleccionado, '12:00')))}</h2>

      <form id="form-ejercicio" class="formulario" novalidate>
        <h3 class="subencabezado">Agregar ejercicio</h3>

        <div class="campo-fila">
          <label class="campo">
            <span>Hora</span>
            <input type="time" name="hora" value="${claveHora()}" required>
          </label>
          <label class="campo">
            <span>Duración (min)</span>
            <input type="number" name="duracion" inputmode="numeric" placeholder="30" min="1" max="600">
          </label>
        </div>

        <label class="campo">
          <span>¿Qué hiciste?</span>
          <select name="tipo" id="tipo-ejercicio">
            ${store.TIPOS_EJERCICIO.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
          </select>
        </label>

        <label class="campo oculto" id="campo-otro">
          <span>Contanos cuál</span>
          <input type="text" name="tipoOtro" placeholder="Ej.: kayak, taekwondo…" maxlength="60">
        </label>

        <label class="campo">
          <span>Intensidad</span>
          <select name="intensidad">
            ${store.INTENSIDADES.map((i) => `<option value="${esc(i.valor)}"${i.valor === 'moderada' ? ' selected' : ''}>${esc(i.etiqueta)}</option>`).join('')}
          </select>
        </label>

        <label class="campo">
          <span>Notas (opcional)</span>
          <input type="text" name="notas" placeholder="Ej.: con la bici por el parque" maxlength="140">
        </label>

        <button type="submit" class="boton boton-primario">Guardar actividad</button>
      </form>

      <h3 class="subencabezado">Lo registrado ese día</h3>
      ${listaDelDia(delDia)}
    </section>
  `;

  const rejilla = host.querySelector('#rejilla');
  rejilla.addEventListener('click', (evento) => {
    const celda = evento.target.closest('[data-dia]');
    if (!celda) return;
    diaSeleccionado = celda.dataset.dia;
    render(host);
    host.querySelector('#form-ejercicio')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  host.querySelector('#mes-anterior').addEventListener('click', () => {
    mesVisible = new Date(anio, mes - 1, 1);
    render(host);
  });
  host.querySelector('#mes-siguiente').addEventListener('click', () => {
    mesVisible = new Date(anio, mes + 1, 1);
    render(host);
  });
  host.querySelector('#ir-hoy').addEventListener('click', () => {
    seleccionarDia(claveDia());
    render(host);
  });

  const selectorTipo = host.querySelector('#tipo-ejercicio');
  const campoOtro = host.querySelector('#campo-otro');
  selectorTipo.addEventListener('change', () => {
    campoOtro.classList.toggle('oculto', selectorTipo.value !== 'Otro');
  });

  host.querySelector('#form-ejercicio').addEventListener('submit', (evento) => {
    evento.preventDefault();
    guardar(new FormData(evento.currentTarget), host);
  });

  conectarBorrado(host, () => render(host));
}

function horasBonitas(minutos) {
  if (!minutos) return 'Sin actividad todavía';
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (!h) return `${m} minutos`;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function listaDelDia(delDia) {
  const bloques = [
    { titulo: null, registros: delDia.ejercicio, pintar: fichaEjercicio },
    { titulo: 'Glucemia', registros: delDia.glucosa, pintar: fichaGlucosa },
    { titulo: 'Presión', registros: delDia.presion, pintar: fichaPresion },
    { titulo: 'Medicamentos', registros: delDia.medicamentos, pintar: fichaMedicamento },
    { titulo: 'Comidas', registros: delDia.comidas, pintar: fichaComida },
    { titulo: 'Síntomas y eventos', registros: delDia.sintomas, pintar: fichaSintoma },
  ].filter((b) => b.registros.length);

  if (!bloques.length) return '<p class="vacio">No hay nada registrado en este día.</p>';

  return bloques.map(({ titulo, registros, pintar }) => `
    ${titulo ? `<h4 class="mini-titulo">${titulo}</h4>` : ''}
    <ul class="lista-fichas">
      ${[...registros].sort((a, b) => a.ts - b.ts).map(pintar).join('')}
    </ul>`).join('');
}

function guardar(datos, host) {
  let tipo = String(datos.get('tipo') || '').trim();
  if (tipo === 'Otro') {
    const otro = String(datos.get('tipoOtro') || '').trim();
    if (!otro) {
      aviso('Escribí qué actividad hiciste.', 'error');
      return;
    }
    tipo = otro;
  }

  const hora = String(datos.get('hora') || '');
  if (!hora) {
    aviso('Indicá a qué hora lo hiciste.', 'error');
    return;
  }

  const duracionBruta = String(datos.get('duracion') || '').trim();
  const duracion = duracionBruta ? Number(duracionBruta) : null;
  if (duracion !== null && (!Number.isFinite(duracion) || duracion < 1 || duracion > 600)) {
    aviso('La duración tiene que estar entre 1 y 600 minutos.', 'error');
    return;
  }

  const fecha = fechaDesdePartes(diaSeleccionado, hora);
  store.agregar('ejercicio', {
    ts: fecha.getTime(),
    tipo,
    duracion: duracion !== null ? Math.round(duracion) : null,
    intensidad: String(datos.get('intensidad') || 'moderada'),
    notas: String(datos.get('notas') || '').trim(),
  });

  aviso('Actividad guardada');
  render(host);
}
