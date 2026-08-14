// Pantalla de inicio: qué falta hacer hoy, accesos rápidos y últimos valores.

import * as store from '../store.js';
import * as notify from '../notify.js';
import { graficoLineas, activarGraficos } from '../charts.js';
import { tarjetaDato, fichaEjercicio } from '../componentes.js';
import { claveDia, fmtFechaLarga, fmtHora, esc, promedio } from '../utils.js';

export function render(host) {
  const estado = store.obtener();
  const nombre = estado.perfil.nombre?.trim();
  const pendientes = notify.pendientesDeHoy();
  const hoy = claveDia();
  const delDia = store.registrosDelDia(hoy);

  const ultimaGlucosa = estado.glucosa[0];
  const ultimaPresion = estado.presion[0];
  const clasGlucosa = ultimaGlucosa ? store.clasificarGlucosa(ultimaGlucosa.valor, ultimaGlucosa.momento) : null;
  const clasPresion = ultimaPresion ? store.clasificarPresion(ultimaPresion.sistolica, ultimaPresion.diastolica) : null;

  const minutosSemana = store.ultimos('ejercicio', 7).reduce((n, r) => n + (Number(r.duracion) || 0), 0);

  const proximos = estado.recordatorios
    .filter((r) => r.activo)
    .map((r) => ({ rec: r, cuando: notify.proximaVez(r) }))
    .filter((x) => x.cuando)
    .sort((a, b) => a.cuando - b.cuando);

  const puntosGlucosa = store.ultimos('glucosa', 14).map((r) => ({ ts: r.ts, valor: r.valor }));
  const puntosPresion = store.ultimos('presion', 14);

  host.innerHTML = `
    <header class="cabecera-inicio">
      <p class="fecha-hoy">${esc(fmtFechaLarga(Date.now()))}</p>
      <h1>${saludo()}${nombre ? `, ${esc(nombre)}` : ''}</h1>
    </header>

    ${pendientes.length ? bloquePendientes(pendientes) : ''}

    <section class="accesos">
      <a class="acceso acceso-glucosa" href="#/glucosa">
        <span class="acceso-icono" aria-hidden="true">💧</span>
        <span class="acceso-texto">Cargar<br>glucemia</span>
      </a>
      <a class="acceso acceso-presion" href="#/presion">
        <span class="acceso-icono" aria-hidden="true">❤️</span>
        <span class="acceso-texto">Cargar<br>presión</span>
      </a>
      <a class="acceso acceso-ejercicio" href="#/calendario">
        <span class="acceso-icono" aria-hidden="true">🏃</span>
        <span class="acceso-texto">Cargar<br>ejercicio</span>
      </a>
    </section>

    <section class="tarjeta">
      <h2 class="tarjeta-encabezado">Últimos valores</h2>
      <div class="rejilla-datos">
        ${tarjetaDato({
          titulo: 'Glucemia',
          valor: ultimaGlucosa ? store.mostrarGlucosa(ultimaGlucosa.valor) : '—',
          unidad: ultimaGlucosa ? store.unidadGlucosa() : '',
          pie: ultimaGlucosa ? `${clasGlucosa.etiqueta} · ${cuando(ultimaGlucosa.ts)}` : 'Sin registros',
          nivel: clasGlucosa?.nivel || '',
        })}
        ${tarjetaDato({
          titulo: 'Presión',
          valor: ultimaPresion ? `${ultimaPresion.sistolica}/${ultimaPresion.diastolica}` : '—',
          unidad: ultimaPresion ? 'mmHg' : '',
          pie: ultimaPresion ? `${clasPresion.etiqueta} · ${cuando(ultimaPresion.ts)}` : 'Sin registros',
          nivel: clasPresion?.nivel || '',
        })}
        ${tarjetaDato({
          titulo: 'Ejercicio esta semana',
          valor: minutosSemana,
          unidad: 'min',
          pie: `${store.ultimos('ejercicio', 7).length} sesion${store.ultimos('ejercicio', 7).length === 1 ? '' : 'es'}`,
        })}
        ${tarjetaDato({
          titulo: 'Controles de hoy',
          valor: delDia.glucosa.length + delDia.presion.length,
          pie: `${delDia.glucosa.length} glucemia · ${delDia.presion.length} presión`,
        })}
      </div>
    </section>

    ${proximos.length ? `
      <section class="tarjeta">
        <h2 class="tarjeta-encabezado">Próximos avisos</h2>
        <ul class="lista-proximos">
          ${proximos.slice(0, 3).map(({ rec }) => `
            <li>
              <span class="proximo-nombre">${esc(rec.etiqueta)}</span>
              <span class="proximo-cuando">${esc(notify.textoProximaVez(rec))}</span>
            </li>`).join('')}
        </ul>
        <a class="enlace-bloque" href="#/recordatorios">Configurar recordatorios →</a>
      </section>` : `
      <section class="tarjeta">
        <h2 class="tarjeta-encabezado">Todavía no tenés avisos activos</h2>
        <p class="vacio">Programá recordatorios para que la app te avise cuándo medirte.</p>
        <a class="enlace-bloque" href="#/recordatorios">Crear un recordatorio →</a>
      </section>`}

    ${puntosGlucosa.length >= 2 ? `
      <section class="tarjeta">
        <h2 class="tarjeta-encabezado">Glucemia · últimos 14 días</h2>
        ${graficoLineas({
          id: 'inicio-glucosa',
          unidad: 'mg/dL',
          banda: { desde: estado.ajustes.objetivos.glucosaAyunasMin, hasta: estado.ajustes.objetivos.glucosaPostMax },
          series: [{ nombre: 'Glucemia', color: 'var(--serie-1)', puntos: puntosGlucosa }],
        })}
        <p class="pie-grafico">Promedio de la semana: ${promedioTexto()}</p>
      </section>` : ''}

    ${puntosPresion.length >= 2 ? `
      <section class="tarjeta">
        <h2 class="tarjeta-encabezado">Presión · últimos 14 días</h2>
        ${graficoLineas({
          id: 'inicio-presion',
          unidad: 'mmHg',
          series: [
            { nombre: 'Sistólica (alta)', color: 'var(--serie-1)', puntos: puntosPresion.map((r) => ({ ts: r.ts, valor: r.sistolica })) },
            { nombre: 'Diastólica (baja)', color: 'var(--serie-2)', puntos: puntosPresion.map((r) => ({ ts: r.ts, valor: r.diastolica })) },
          ],
        })}
      </section>` : ''}

    ${delDia.ejercicio.length ? `
      <section class="tarjeta">
        <h2 class="tarjeta-encabezado">Actividad de hoy</h2>
        <ul class="lista-fichas">${[...delDia.ejercicio].sort((a, b) => a.ts - b.ts).map(fichaEjercicio).join('')}</ul>
      </section>` : ''}

    <p class="nota-legal">Esta app te ayuda a llevar un registro ordenado. No da diagnósticos ni reemplaza el control de tu médico.</p>
  `;

  activarGraficos(host);
}

function saludo() {
  const h = new Date().getHours();
  if (h < 6) return 'Buenas noches';
  if (h < 13) return 'Buen día';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function cuando(ts) {
  return claveDia(ts) === claveDia() ? `hoy ${fmtHora(ts)}` : fmtFechaLarga(ts).toLowerCase();
}

function promedioTexto() {
  const media = promedio(store.ultimos('glucosa', 7).map((r) => r.valor));
  return media != null ? `${store.mostrarGlucosa(media)} ${store.unidadGlucosa()}` : 'sin datos';
}

function bloquePendientes(pendientes) {
  const nombres = { glucosa: 'glucómetro', presion: 'tensiómetro', ejercicio: 'ejercicio' };
  return `<section class="alerta alerta-atencion pendientes" role="alert">
    <strong>Te faltan controles de hoy</strong>
    <ul>
      ${pendientes.map(({ recordatorio, objetivo }) => `
        <li>
          <a href="#/${recordatorio.tipo === 'ejercicio' ? 'calendario' : recordatorio.tipo}">
            ${esc(recordatorio.etiqueta)} — estaba previsto a las ${esc(fmtHora(objetivo.getTime()))}
            <small>(${esc(nombres[recordatorio.tipo])})</small>
          </a>
        </li>`).join('')}
    </ul>
  </section>`;
}
