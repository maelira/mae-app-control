// Motor de recordatorios y alertas.
//
// Cómo funciona:
//  - Mientras la app está abierta (aunque sea en segundo plano) un temporizador
//    revisa cada 30 s si algún recordatorio llegó a su hora y lanza la notificación.
//  - Al volver a abrir la app se revisa de nuevo, para no perder avisos recientes.
//  - Las alertas por valores fuera de rango se disparan al registrar la medición.

import * as store from './store.js';
import { claveDia, claveHora, DIAS_CORTOS } from './utils.js';

// Si el aviso se pasó por más de este tiempo, ya no molestamos con una notificación:
// queda marcado como pendiente en la pantalla de inicio.
const VENTANA_AVISO_MS = 3 * 60 * 60 * 1000;
const INTERVALO_REVISION_MS = 30 * 1000;

const TEXTOS = {
  glucosa: {
    titulo: 'Control de glucemia',
    cuerpo: 'Es hora de medirte la glucosa con el glucómetro.',
  },
  presion: {
    titulo: 'Control de presión',
    cuerpo: 'Es hora de tomarte la presión con el tensiómetro.',
  },
  ejercicio: {
    titulo: 'Momento de moverte',
    cuerpo: 'Tenés programada tu actividad física.',
  },
  medicamentos: {
    titulo: 'Hora de tu medicación',
    cuerpo: 'Te toca tomar tu medicamento. Acordate de registrarlo después.',
  },
};

/** Colección donde se busca el registro que "cumple" cada recordatorio. */
const COLECCION_POR_TIPO = {
  glucosa: 'glucosa',
  presion: 'presion',
  ejercicio: 'ejercicio',
  medicamentos: 'medicamentos',
};

let temporizador = null;

export function permisoActual() {
  if (!('Notification' in window)) return 'no-soportado';
  return Notification.permission; // 'default' | 'granted' | 'denied'
}

/** Pide permiso para notificar. Devuelve true si quedó concedido. */
export async function pedirPermiso() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const resultado = await Notification.requestPermission();
  return resultado === 'granted';
}

/** Muestra una notificación del sistema (usa el service worker si está disponible). */
export async function notificar(titulo, opciones = {}) {
  if (permisoActual() !== 'granted') return false;
  const config = {
    body: '',
    icon: './icons/icon-192.png',
    badge: './icons/icon-192.png',
    vibrate: [200, 100, 200],
    requireInteraction: true,
    ...opciones,
  };
  try {
    const registro = await navigator.serviceWorker?.ready;
    if (registro) {
      await registro.showNotification(titulo, config);
      return true;
    }
  } catch (err) {
    console.warn('No se pudo notificar vía service worker:', err);
  }
  try {
    new Notification(titulo, config);
    return true;
  } catch (err) {
    console.warn('No se pudo notificar:', err);
    return false;
  }
}

/** Pitido corto para reforzar el aviso cuando la app está en primer plano. */
export function sonarAviso() {
  if (!store.obtener().ajustes.sonido) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gan = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gan.gain.setValueAtTime(0.0001, ctx.currentTime);
    gan.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gan.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.connect(gan).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    setTimeout(() => ctx.close(), 800);
  } catch { /* el sonido es opcional */ }
}

/** Hora programada de hoy para un recordatorio, o null si hoy no corresponde. */
function horaDeHoy(recordatorio, ahora = new Date()) {
  if (!recordatorio.activo) return null;
  if (!recordatorio.dias.includes(ahora.getDay())) return null;
  const [hh, mm] = recordatorio.hora.split(':').map(Number);
  const objetivo = new Date(ahora);
  objetivo.setHours(hh, mm, 0, 0);
  return objetivo;
}

/** Próxima vez que sonará un recordatorio (busca hasta 7 días adelante). */
export function proximaVez(recordatorio, desde = new Date()) {
  if (!recordatorio.activo || !recordatorio.dias.length) return null;
  const [hh, mm] = recordatorio.hora.split(':').map(Number);
  for (let salto = 0; salto <= 7; salto++) {
    const candidato = new Date(desde);
    candidato.setDate(candidato.getDate() + salto);
    candidato.setHours(hh, mm, 0, 0);
    if (candidato > desde && recordatorio.dias.includes(candidato.getDay())) return candidato;
  }
  return null;
}

/** Texto amigable del próximo aviso: "Hoy 20:00", "Mañana 07:30", "Mar 07:30". */
export function textoProximaVez(recordatorio) {
  const prox = proximaVez(recordatorio);
  if (!prox) return 'Sin próximos avisos';
  const hoy = claveDia();
  const manana = new Date(); manana.setDate(manana.getDate() + 1);
  const clave = claveDia(prox);
  const hora = claveHora(prox);
  if (clave === hoy) return `Hoy ${hora}`;
  if (clave === claveDia(manana)) return `Mañana ${hora}`;
  return `${DIAS_CORTOS[prox.getDay()]} ${hora}`;
}

/**
 * Controles de hoy que ya deberían estar hechos y no tienen registro.
 * Se usa en la pantalla de inicio para mostrar "te falta el control de…".
 */
export function pendientesDeHoy(ahora = new Date()) {
  const estado = store.obtener();
  const hoy = claveDia(ahora);
  const delDia = store.registrosDelDia(hoy);
  const pendientes = [];

  for (const rec of estado.recordatorios) {
    const objetivo = horaDeHoy(rec, ahora);
    if (!objetivo || ahora < objetivo) continue;
    const registros = delDia[COLECCION_POR_TIPO[rec.tipo]] || [];
    const hayRegistroPosterior = registros.some((r) => r.ts >= objetivo.getTime() - 30 * 60 * 1000);
    if (!hayRegistroPosterior) {
      pendientes.push({ recordatorio: rec, objetivo, minutosDeRetraso: Math.floor((ahora - objetivo) / 60000) });
    }
  }
  return pendientes.sort((a, b) => a.objetivo - b.objetivo);
}

/** Revisa todos los recordatorios y notifica los que corresponden ahora. */
export async function revisarAhora() {
  const estado = store.obtener();
  const ahora = new Date();
  const hoy = claveDia(ahora);

  for (const rec of estado.recordatorios) {
    const objetivo = horaDeHoy(rec, ahora);
    if (!objetivo) continue;
    if (ahora < objetivo) continue;
    if (ahora - objetivo > VENTANA_AVISO_MS) continue;
    if (store.yaDisparado(rec.id, hoy)) continue;

    // Si ya hay un registro de ese tipo después de la hora prevista, no hace falta avisar.
    const registros = store.registrosDelDia(hoy)[COLECCION_POR_TIPO[rec.tipo]] || [];
    if (registros.some((r) => r.ts >= objetivo.getTime() - 30 * 60 * 1000)) {
      store.marcarDisparado(rec.id, hoy);
      continue;
    }

    const texto = TEXTOS[rec.tipo] || TEXTOS.glucosa;
    await notificar(rec.etiqueta || texto.titulo, {
      body: texto.cuerpo,
      tag: `recordatorio-${rec.id}-${hoy}`,
      data: { tipo: rec.tipo, url: `./?accion=registrar&tipo=${rec.tipo}` },
    });
    if (document.visibilityState === 'visible') sonarAviso();
    store.marcarDisparado(rec.id, hoy);
    document.dispatchEvent(new CustomEvent('recordatorio-disparado', { detail: rec }));
  }
}

/** Arranca la revisión periódica y la revisión al volver a la app. */
export function iniciarMotor() {
  detenerMotor();
  revisarAhora();
  temporizador = setInterval(revisarAhora, INTERVALO_REVISION_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') revisarAhora();
  });
  window.addEventListener('focus', revisarAhora);
}

export function detenerMotor() {
  if (temporizador) clearInterval(temporizador);
  temporizador = null;
}

/** Notificación inmediata cuando una medición queda fuera de rango. */
export async function alertarValorFueraDeRango(titulo, mensaje) {
  sonarAviso();
  await notificar(titulo, {
    body: mensaje,
    tag: 'alerta-valor-' + Date.now(),
    requireInteraction: true,
  });
}

/** Aviso de prueba, para que la persona confirme que las notificaciones funcionan. */
export async function probarNotificacion() {
  const ok = await pedirPermiso();
  if (!ok) return false;
  sonarAviso();
  return notificar('Aviso de prueba', {
    body: 'Si ves este mensaje, los recordatorios están funcionando correctamente.',
    tag: 'prueba',
    requireInteraction: false,
  });
}
