// Arranque de la aplicación: navegación, service worker e instalación.

import * as inicio from './views/inicio.js';
import * as glucosa from './views/glucosa.js';
import * as presion from './views/presion.js';
import * as ejercicio from './views/ejercicio.js';
import * as medicamentos from './views/medicamentos.js';
import * as comidas from './views/comidas.js';
import * as sintomas from './views/sintomas.js';
import * as mas from './views/mas.js';
import * as recordatorios from './views/recordatorios.js';
import * as ajustes from './views/ajustes.js';
import * as notify from './notify.js';
import { aviso } from './componentes.js';

const RUTAS = {
  '/inicio': { vista: inicio, titulo: 'Inicio' },
  '/glucosa': { vista: glucosa, titulo: 'Glucómetro' },
  '/presion': { vista: presion, titulo: 'Tensiómetro' },
  '/calendario': { vista: ejercicio, titulo: 'Calendario' },
  '/medicamentos': { vista: medicamentos, titulo: 'Medicamentos', menu: '/mas' },
  '/comidas': { vista: comidas, titulo: 'Comidas', menu: '/mas' },
  '/sintomas': { vista: sintomas, titulo: 'Síntomas y eventos', menu: '/mas' },
  '/mas': { vista: mas, titulo: 'Más' },
  '/recordatorios': { vista: recordatorios, titulo: 'Recordatorios', menu: '/mas' },
  '/ajustes': { vista: ajustes, titulo: 'Ajustes', menu: '/mas' },
};

const RUTA_POR_DEFECTO = '/inicio';
const contenedor = document.getElementById('vista');

function rutaActual() {
  const cruda = location.hash.replace(/^#/, '') || RUTA_POR_DEFECTO;
  return RUTAS[cruda] ? cruda : RUTA_POR_DEFECTO;
}

function navegar() {
  const ruta = rutaActual();
  const { vista, titulo, menu } = RUTAS[ruta];

  document.title = `${titulo} · Mi Control de Salud`;
  contenedor.innerHTML = '';
  vista.render(contenedor);
  window.scrollTo({ top: 0 });

  // Las secciones que viven dentro de "Más" mantienen esa pestaña marcada.
  const pestana = menu || ruta;
  document.querySelectorAll('.nav-item').forEach((enlace) => {
    const activo = enlace.getAttribute('href') === `#${pestana}`;
    enlace.classList.toggle('activo', activo);
    if (activo) enlace.setAttribute('aria-current', 'page');
    else enlace.removeAttribute('aria-current');
  });
}

/** Si la app se abrió desde una notificación, llevar a la pantalla correcta. */
function rutaDesdeNotificacion() {
  const params = new URLSearchParams(location.search);
  if (params.get('accion') !== 'registrar') return;
  const destinos = {
    glucosa: '/glucosa',
    presion: '/presion',
    ejercicio: '/calendario',
    medicamentos: '/medicamentos',
    comidas: '/comidas',
    sintomas: '/sintomas',
  };
  const destino = destinos[params.get('tipo')];
  if (destino) location.hash = destino;
  // Limpiamos la URL para que al recargar no vuelva a saltar.
  history.replaceState(null, '', location.pathname + location.hash);
}

async function registrarServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('./sw.js');
  } catch (err) {
    console.warn('No se pudo registrar el service worker:', err);
  }
}

/** Ofrece instalar la app en la pantalla de inicio. */
function prepararInstalacion() {
  const barra = document.getElementById('barra-instalar');
  const botonInstalar = document.getElementById('instalar');
  const botonCerrar = document.getElementById('cerrar-instalar');
  let evento = null;

  const ocultar = (recordar) => {
    barra.hidden = true;
    if (recordar) localStorage.setItem('instalar-oculto', '1');
  };

  // El botón de cerrar se conecta siempre, incluso si la barra no llegara a
  // mostrarse: si no, en la app ya instalada la X no tendría nada que la escuche.
  botonCerrar.addEventListener('click', () => ocultar(true));

  const yaInstalada = window.matchMedia('(display-mode: standalone)').matches
    || window.matchMedia('(display-mode: minimal-ui)').matches
    || navigator.standalone === true;

  if (yaInstalada || localStorage.getItem('instalar-oculto') === '1') {
    ocultar(false);
    return;
  }

  // Sólo se ofrece instalar cuando el navegador confirma que se puede.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    evento = e;
    barra.hidden = false;
  });

  botonInstalar.addEventListener('click', async () => {
    if (!evento) return;
    evento.prompt();
    const { outcome } = await evento.userChoice;
    evento = null;
    ocultar(outcome === 'accepted');
    if (outcome === 'accepted') aviso('¡Listo! Buscá el ícono en tu pantalla de inicio.');
  });

  window.addEventListener('appinstalled', () => {
    ocultar(true);
    aviso('App instalada');
  });
}

function iniciar() {
  registrarServiceWorker();
  prepararInstalacion();
  rutaDesdeNotificacion();
  navegar();

  window.addEventListener('hashchange', navegar);

  // El motor de avisos revisa los recordatorios mientras la app esté abierta.
  notify.iniciarMotor();

  // Al volver a la app, refrescamos el inicio para ver los controles pendientes.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && rutaActual() === '/inicio') navegar();
  });
  document.addEventListener('recordatorio-disparado', () => {
    if (rutaActual() === '/inicio') navegar();
  });

  // Clic en una notificación con la app ya abierta.
  navigator.serviceWorker?.addEventListener('message', (evento) => {
    const destino = evento.data?.ruta;
    if (destino) location.hash = destino;
  });
}

iniciar();
