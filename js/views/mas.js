// Menú con el resto de las secciones, para no cargar la barra inferior.

import * as store from '../store.js';
import { claveDia } from '../utils.js';

const SECCIONES = [
  {
    ruta: '#/medicamentos',
    icono: '💊',
    titulo: 'Medicamentos',
    descripcion: 'Qué tomaste, a qué hora y cómo te cayó',
    coleccion: 'medicamentos',
  },
  {
    ruta: '#/comidas',
    icono: '🍽️',
    titulo: 'Comidas',
    descripcion: 'Registro de lo que comés en el día',
    coleccion: 'comidas',
  },
  {
    ruta: '#/sintomas',
    icono: '🩺',
    titulo: 'Síntomas y eventos',
    descripcion: 'Mareos, cansancio, náuseas y demás',
    coleccion: 'sintomas',
  },
  {
    ruta: '#/recordatorios',
    icono: '🔔',
    titulo: 'Recordatorios',
    descripcion: 'Avisos para no olvidarte los controles',
  },
  {
    ruta: '#/ajustes',
    icono: '⚙️',
    titulo: 'Ajustes',
    descripcion: 'Objetivos, copias de seguridad y exportación',
  },
];

export function render(host) {
  const hoy = store.registrosDelDia(claveDia());

  host.innerHTML = `
    <header class="cabecera-vista">
      <h1>Más</h1>
      <p class="subtitulo">El resto de tus registros y la configuración.</p>
    </header>

    <nav class="tarjeta lista-secciones" aria-label="Otras secciones">
      ${SECCIONES.map((s) => {
        const cuantos = s.coleccion ? hoy[s.coleccion].length : 0;
        return `
        <a class="seccion" href="${s.ruta}">
          <span class="seccion-icono" aria-hidden="true">${s.icono}</span>
          <span class="seccion-texto">
            <span class="seccion-titulo">${s.titulo}</span>
            <span class="seccion-descripcion">${s.descripcion}</span>
          </span>
          ${cuantos ? `<span class="seccion-contador">${cuantos} hoy</span>` : ''}
          <span class="seccion-flecha" aria-hidden="true">›</span>
        </a>`;
      }).join('')}
    </nav>
  `;
}
