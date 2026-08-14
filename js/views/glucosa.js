// Pantalla del glucómetro: cargar mediciones, ver tendencia e historial.

import * as store from '../store.js';
import * as notify from '../notify.js';
import { graficoLineas, activarGraficos } from '../charts.js';
import {
  fichaGlucosa, historialAgrupado, conectarBorrado, aviso, panelAlerta, tarjetaDato,
} from '../componentes.js';
import { claveDia, claveHora, fechaDesdePartes, promedio, esc } from '../utils.js';

let ultimaAlerta = null;

export function render(host) {
  const estado = store.obtener();
  const unidad = store.unidadGlucosa();
  const registros = estado.glucosa;
  const semana = store.ultimos('glucosa', 7);
  const mes = store.ultimos('glucosa', 30);

  const prom7 = promedio(semana.map((r) => r.valor));
  const prom30 = promedio(mes.map((r) => r.valor));
  const enObjetivo = semana.filter((r) => store.clasificarGlucosa(r.valor, r.momento).nivel === 'bien').length;
  const porcentaje = semana.length ? Math.round((enObjetivo / semana.length) * 100) : null;
  const ultimo = registros[0];

  const objetivos = estado.ajustes.objetivos;
  const grafico = graficoLineas({
    id: 'grafico-glucosa',
    unidad: 'mg/dL',
    banda: { desde: objetivos.glucosaAyunasMin, hasta: objetivos.glucosaPostMax },
    series: [{ nombre: 'Glucemia', color: 'var(--serie-1)', puntos: store.ultimos('glucosa', 30).map((r) => ({ ts: r.ts, valor: r.valor })) }],
  });

  host.innerHTML = `
    <header class="cabecera-vista">
      <h1>Glucómetro</h1>
      <p class="subtitulo">Registrá cada medición y seguí tu evolución.</p>
    </header>

    <div id="alerta-glucosa"></div>

    <form id="form-glucosa" class="tarjeta formulario" novalidate>
      <h2 class="tarjeta-encabezado">Nueva medición</h2>

      <label class="campo campo-destacado">
        <span>Resultado (${esc(unidad)})</span>
        <input type="number" name="valor" inputmode="decimal" step="${unidad === 'mmol/L' ? '0.1' : '1'}"
               placeholder="${unidad === 'mmol/L' ? 'Ej.: 5,5' : 'Ej.: 105'}" required autocomplete="off">
      </label>

      <label class="campo">
        <span>¿En qué momento?</span>
        <select name="momento">
          ${store.MOMENTOS_GLUCOSA.map((m) => `<option value="${esc(m.valor)}"${m.valor === momentoSugerido() ? ' selected' : ''}>${esc(m.etiqueta)}</option>`).join('')}
        </select>
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
        <input type="text" name="notas" placeholder="Ej.: después de caminar, me sentí mareada…" maxlength="140">
      </label>

      <button type="submit" class="boton boton-primario">Guardar medición</button>
    </form>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Resumen</h2>
      <div class="rejilla-datos">
        ${tarjetaDato({
          titulo: 'Última medición',
          valor: ultimo ? store.mostrarGlucosa(ultimo.valor) : '—',
          unidad: ultimo ? unidad : '',
          pie: ultimo ? store.clasificarGlucosa(ultimo.valor, ultimo.momento).etiqueta : 'Sin registros',
          nivel: ultimo ? store.clasificarGlucosa(ultimo.valor, ultimo.momento).nivel : '',
        })}
        ${tarjetaDato({
          titulo: 'Promedio 7 días',
          valor: prom7 != null ? store.mostrarGlucosa(prom7) : '—',
          unidad: prom7 != null ? unidad : '',
          pie: `${semana.length} medicion${semana.length === 1 ? '' : 'es'}`,
        })}
        ${tarjetaDato({
          titulo: 'Promedio 30 días',
          valor: prom30 != null ? store.mostrarGlucosa(prom30) : '—',
          unidad: prom30 != null ? unidad : '',
          pie: `${mes.length} medicion${mes.length === 1 ? '' : 'es'}`,
        })}
        ${tarjetaDato({
          titulo: 'En objetivo (7 días)',
          valor: porcentaje != null ? porcentaje : '—',
          unidad: porcentaje != null ? '%' : '',
          pie: porcentaje != null ? `${enObjetivo} de ${semana.length}` : 'Sin datos',
        })}
      </div>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Tendencia · últimos 30 días</h2>
      ${grafico}
      <p class="pie-grafico">La franja clara marca tu rango objetivo (${objetivos.glucosaAyunasMin}–${objetivos.glucosaPostMax} mg/dL). Tocá el gráfico para ver cada valor.</p>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Historial</h2>
      ${historialAgrupado(registros.slice(0, 120), fichaGlucosa, 'Todavía no cargaste ninguna medición de glucosa.')}
    </section>
  `;

  activarGraficos(host);
  if (ultimaAlerta) {
    document.getElementById('alerta-glucosa').innerHTML =
      panelAlerta(ultimaAlerta.etiqueta, ultimaAlerta.alerta, ultimaAlerta.nivel);
    ultimaAlerta = null;
  }

  host.querySelector('#form-glucosa').addEventListener('submit', (evento) => {
    evento.preventDefault();
    guardar(new FormData(evento.currentTarget), host);
  });

  conectarBorrado(host, () => render(host));
}

/** Sugiere el momento del día según la hora actual. */
function momentoSugerido() {
  const h = new Date().getHours();
  if (h < 9) return 'ayunas';
  if (h < 12) return 'despues-desayuno';
  if (h < 15) return 'antes-almuerzo';
  if (h < 18) return 'despues-almuerzo';
  if (h < 21) return 'antes-cena';
  return 'antes-dormir';
}

function guardar(datos, host) {
  const bruto = String(datos.get('valor') || '').replace(',', '.');
  const valor = store.aMgdl(bruto);

  if (!Number.isFinite(valor) || valor <= 0) {
    aviso('Escribí el resultado del glucómetro.', 'error');
    return;
  }
  if (valor < 20 || valor > 800) {
    aviso('Ese valor está fuera de lo que mide un glucómetro. Revisalo, por favor.', 'error');
    return;
  }

  const fecha = fechaDesdePartes(datos.get('dia'), datos.get('hora'));
  if (Number.isNaN(fecha.getTime())) {
    aviso('Revisá el día y la hora.', 'error');
    return;
  }

  const momento = datos.get('momento');
  store.agregar('glucosa', {
    ts: fecha.getTime(),
    valor: Math.round(valor * 10) / 10,
    momento,
    notas: String(datos.get('notas') || '').trim(),
  });

  const clas = store.clasificarGlucosa(valor, momento);
  if (clas.alerta) {
    ultimaAlerta = clas;
    notify.alertarValorFueraDeRango(clas.etiqueta, clas.alerta);
  } else {
    aviso('Medición guardada');
  }
  render(host);
  host.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
