// Pantalla del tensiómetro: cargar presión arterial, ver tendencia e historial.

import * as store from '../store.js';
import * as notify from '../notify.js';
import { graficoLineas, activarGraficos } from '../charts.js';
import {
  fichaPresion, historialAgrupado, conectarBorrado, aviso, panelAlerta, tarjetaDato,
} from '../componentes.js';
import { claveDia, claveHora, fechaDesdePartes, promedio } from '../utils.js';

let ultimaAlerta = null;

export function render(host) {
  const estado = store.obtener();
  const registros = estado.presion;
  const semana = store.ultimos('presion', 7);
  const mes = store.ultimos('presion', 30);
  const ultimo = registros[0];

  const promSis = promedio(semana.map((r) => r.sistolica));
  const promDia = promedio(semana.map((r) => r.diastolica));
  const promPul = promedio(semana.filter((r) => r.pulso).map((r) => r.pulso));

  const puntos = store.ultimos('presion', 30);
  const grafico = graficoLineas({
    id: 'grafico-presion',
    unidad: 'mmHg',
    series: [
      { nombre: 'Sistólica (alta)', color: 'var(--serie-1)', puntos: puntos.map((r) => ({ ts: r.ts, valor: r.sistolica })) },
      { nombre: 'Diastólica (baja)', color: 'var(--serie-2)', puntos: puntos.map((r) => ({ ts: r.ts, valor: r.diastolica })) },
    ],
  });

  host.innerHTML = `
    <header class="cabecera-vista">
      <h1>Tensiómetro</h1>
      <p class="subtitulo">Anotá tu presión arterial y controlá cómo evoluciona.</p>
    </header>

    <div id="alerta-presion"></div>

    <form id="form-presion" class="tarjeta formulario" novalidate>
      <h2 class="tarjeta-encabezado">Nueva medición</h2>

      <div class="campo-fila">
        <label class="campo campo-destacado">
          <span>Sistólica (alta)</span>
          <input type="number" name="sistolica" inputmode="numeric" placeholder="120" min="50" max="300" required autocomplete="off">
        </label>
        <label class="campo campo-destacado">
          <span>Diastólica (baja)</span>
          <input type="number" name="diastolica" inputmode="numeric" placeholder="80" min="30" max="200" required autocomplete="off">
        </label>
      </div>

      <div class="campo-fila">
        <label class="campo">
          <span>Pulso (opcional)</span>
          <input type="number" name="pulso" inputmode="numeric" placeholder="72" min="25" max="250" autocomplete="off">
        </label>
        <label class="campo">
          <span>Brazo</span>
          <select name="brazo">
            <option value="">Sin especificar</option>
            <option value="Brazo izquierdo">Brazo izquierdo</option>
            <option value="Brazo derecho">Brazo derecho</option>
          </select>
        </label>
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
        <span>Notas (opcional)</span>
        <input type="text" name="notas" placeholder="Ej.: en reposo, después de la medicación…" maxlength="140">
      </label>

      <button type="submit" class="boton boton-primario">Guardar medición</button>
    </form>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Resumen</h2>
      <div class="rejilla-datos">
        ${tarjetaDato({
          titulo: 'Última medición',
          valor: ultimo ? `${ultimo.sistolica}/${ultimo.diastolica}` : '—',
          unidad: ultimo ? 'mmHg' : '',
          pie: ultimo ? store.clasificarPresion(ultimo.sistolica, ultimo.diastolica).etiqueta : 'Sin registros',
          nivel: ultimo ? store.clasificarPresion(ultimo.sistolica, ultimo.diastolica).nivel : '',
        })}
        ${tarjetaDato({
          titulo: 'Promedio 7 días',
          valor: promSis != null ? `${promSis}/${promDia}` : '—',
          unidad: promSis != null ? 'mmHg' : '',
          pie: `${semana.length} medicion${semana.length === 1 ? '' : 'es'}`,
        })}
        ${tarjetaDato({
          titulo: 'Pulso promedio',
          valor: promPul != null ? promPul : '—',
          unidad: promPul != null ? 'lpm' : '',
          pie: 'Últimos 7 días',
        })}
        ${tarjetaDato({
          titulo: 'Mediciones del mes',
          valor: mes.length,
          pie: 'Últimos 30 días',
        })}
      </div>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Tendencia · últimos 30 días</h2>
      ${grafico}
      <p class="pie-grafico">Tocá el gráfico para ver el detalle de cada medición.</p>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Historial</h2>
      ${historialAgrupado(registros.slice(0, 120), fichaPresion, 'Todavía no cargaste ninguna medición de presión.')}
    </section>

    <p class="nota-legal">Las categorías (normal, hipertensión, etc.) son orientativas y no reemplazan la evaluación de un profesional.</p>
  `;

  activarGraficos(host);
  if (ultimaAlerta) {
    document.getElementById('alerta-presion').innerHTML =
      panelAlerta(ultimaAlerta.etiqueta, ultimaAlerta.alerta, ultimaAlerta.nivel);
    ultimaAlerta = null;
  }

  host.querySelector('#form-presion').addEventListener('submit', (evento) => {
    evento.preventDefault();
    guardar(new FormData(evento.currentTarget), host);
  });

  conectarBorrado(host, () => render(host));
}

function guardar(datos, host) {
  const sistolica = Number(datos.get('sistolica'));
  const diastolica = Number(datos.get('diastolica'));
  const pulsoBruto = String(datos.get('pulso') || '').trim();
  const pulso = pulsoBruto ? Number(pulsoBruto) : null;

  if (!Number.isFinite(sistolica) || !Number.isFinite(diastolica)) {
    aviso('Completá los dos valores de presión.', 'error');
    return;
  }
  if (sistolica < 50 || sistolica > 300 || diastolica < 30 || diastolica > 200) {
    aviso('Esos valores están fuera de rango. Revisalos, por favor.', 'error');
    return;
  }
  if (diastolica >= sistolica) {
    aviso('La sistólica (alta) tiene que ser mayor que la diastólica (baja).', 'error');
    return;
  }
  if (pulso !== null && (!Number.isFinite(pulso) || pulso < 25 || pulso > 250)) {
    aviso('Revisá el valor del pulso.', 'error');
    return;
  }

  const fecha = fechaDesdePartes(datos.get('dia'), datos.get('hora'));
  if (Number.isNaN(fecha.getTime())) {
    aviso('Revisá el día y la hora.', 'error');
    return;
  }

  store.agregar('presion', {
    ts: fecha.getTime(),
    sistolica: Math.round(sistolica),
    diastolica: Math.round(diastolica),
    pulso: pulso !== null ? Math.round(pulso) : null,
    brazo: String(datos.get('brazo') || ''),
    notas: String(datos.get('notas') || '').trim(),
  });

  const clas = store.clasificarPresion(sistolica, diastolica);
  if (clas.alerta) {
    ultimaAlerta = clas;
    notify.alertarValorFueraDeRango(clas.etiqueta, clas.alerta);
  } else {
    aviso('Medición guardada');
  }
  render(host);
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
