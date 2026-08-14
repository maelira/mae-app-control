// Utilidades compartidas: fechas, formato y helpers de DOM.

export const DIAS_CORTOS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
export const DIAS_LARGOS = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado',
];
export const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Identificador único para cada registro. */
export function nuevoId() {
  if (globalThis.crypto?.randomUUID) return crypto.randomUUID();
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

/** Fecha local (no UTC) en formato YYYY-MM-DD. */
export function claveDia(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mes}-${dia}`;
}

/** Hora local en formato HH:MM, listo para <input type="time">. */
export function claveHora(fecha = new Date()) {
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Combina "YYYY-MM-DD" + "HH:MM" en una Date local. */
export function fechaDesdePartes(dia, hora) {
  const [a, m, d] = dia.split('-').map(Number);
  const [hh, mm] = (hora || '00:00').split(':').map(Number);
  return new Date(a, m - 1, d, hh, mm, 0, 0);
}

export function fmtHora(ts) {
  return claveHora(new Date(ts));
}

export function fmtFecha(ts) {
  const d = new Date(ts);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function fmtFechaLarga(ts) {
  const d = new Date(ts);
  return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()].toLowerCase()}`;
}

/** "Hoy", "Ayer" o la fecha larga, para encabezados de listas. */
export function fmtFechaRelativa(ts) {
  const hoy = claveDia();
  const clave = claveDia(ts);
  if (clave === hoy) return 'Hoy';
  const ayer = new Date();
  ayer.setDate(ayer.getDate() - 1);
  if (clave === claveDia(ayer)) return 'Ayer';
  return fmtFechaLarga(ts);
}

/** Diferencia en días completos entre dos fechas locales. */
export function diasEntre(a, b) {
  const ma = new Date(a); ma.setHours(0, 0, 0, 0);
  const mb = new Date(b); mb.setHours(0, 0, 0, 0);
  return Math.round((mb - ma) / 86400000);
}

/** Escapa texto libre antes de insertarlo como HTML. */
export function esc(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Promedio redondeado, o null si no hay datos. */
export function promedio(numeros, decimales = 0) {
  const validos = numeros.filter((n) => Number.isFinite(n));
  if (!validos.length) return null;
  const media = validos.reduce((a, b) => a + b, 0) / validos.length;
  const factor = 10 ** decimales;
  return Math.round(media * factor) / factor;
}

/** Descarga un archivo generado en el dispositivo. */
export function descargar(nombre, contenido, tipo = 'text/plain;charset=utf-8') {
  const blob = new Blob([contenido], { type: tipo });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/** Convierte filas a CSV con separador ";" (Excel en español). */
export function aCSV(cabeceras, filas) {
  const celda = (v) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [cabeceras, ...filas].map((f) => f.map(celda).join(';')).join('\r\n');
}
