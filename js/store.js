// Capa de datos: todo se guarda en el propio teléfono (localStorage).
// Ningún dato de salud sale del dispositivo.

import { nuevoId, claveDia } from './utils.js';

const CLAVE = 'mae-control-salud';
const VERSION = 1;

const ESTADO_INICIAL = {
  version: VERSION,
  perfil: { nombre: '' },
  glucosa: [],
  presion: [],
  ejercicio: [],
  medicamentos: [],
  comidas: [],
  sintomas: [],
  recordatorios: [
    { id: 'rec-glu-manana', tipo: 'glucosa', etiqueta: 'Glucemia en ayunas', hora: '07:30', dias: [1, 2, 3, 4, 5, 6, 0], activo: true },
    { id: 'rec-pre-noche', tipo: 'presion', etiqueta: 'Control de presión', hora: '20:00', dias: [1, 2, 3, 4, 5, 6, 0], activo: true },
  ],
  ajustes: {
    unidadGlucosa: 'mg/dL',
    objetivos: {
      glucosaBajaAlerta: 70,
      glucosaAyunasMin: 70,
      glucosaAyunasMax: 130,
      glucosaPostMax: 180,
      glucosaAltaAlerta: 250,
      presionSisMax: 130,
      presionDiaMax: 80,
    },
    notificaciones: false,
    sonido: true,
  },
  // Marca qué recordatorios ya avisaron hoy: "idRecordatorio|YYYY-MM-DD" -> true
  disparos: {},
};

export const MOMENTOS_GLUCOSA = [
  { valor: 'ayunas', etiqueta: 'En ayunas' },
  { valor: 'antes-desayuno', etiqueta: 'Antes del desayuno' },
  { valor: 'despues-desayuno', etiqueta: 'Después del desayuno' },
  { valor: 'antes-almuerzo', etiqueta: 'Antes del almuerzo' },
  { valor: 'despues-almuerzo', etiqueta: 'Después del almuerzo' },
  { valor: 'antes-cena', etiqueta: 'Antes de la cena' },
  { valor: 'despues-cena', etiqueta: 'Después de la cena' },
  { valor: 'antes-dormir', etiqueta: 'Antes de dormir' },
  { valor: 'madrugada', etiqueta: 'Madrugada' },
  { valor: 'otro', etiqueta: 'Otro momento' },
];

export const TIPOS_EJERCICIO = [
  'Caminata', 'Trote', 'Bicicleta', 'Natación', 'Gimnasio / pesas',
  'Yoga', 'Pilates', 'Baile', 'Elíptica', 'Estiramientos', 'Fútbol',
  'Tenis / pádel', 'Jardinería', 'Otro',
];

export const INTENSIDADES = [
  { valor: 'suave', etiqueta: 'Suave' },
  { valor: 'moderada', etiqueta: 'Moderada' },
  { valor: 'intensa', etiqueta: 'Intensa' },
];

/** Cómo se sintió después de tomar el medicamento. */
export const SENSACIONES = [
  { valor: '', etiqueta: 'Todavía no sé / no anoto' },
  { valor: 'bien', etiqueta: 'Me sentí bien', nivel: 'bien' },
  { valor: 'igual', etiqueta: 'Sin cambios', nivel: '' },
  { valor: 'molestias', etiqueta: 'Me cayó mal / tuve molestias', nivel: 'atencion' },
];

export const TIPOS_COMIDA = [
  { valor: 'desayuno', etiqueta: 'Desayuno' },
  { valor: 'media-manana', etiqueta: 'Media mañana' },
  { valor: 'almuerzo', etiqueta: 'Almuerzo' },
  { valor: 'merienda', etiqueta: 'Merienda' },
  { valor: 'cena', etiqueta: 'Cena' },
  { valor: 'colacion', etiqueta: 'Colación / picoteo' },
];

export const SINTOMAS_COMUNES = [
  'Mareo', 'Cansancio', 'Náuseas', 'Vómitos', 'Dolor de cabeza',
  'Visión borrosa', 'Temblores', 'Sudoración fría', 'Palpitaciones',
  'Falta de aire', 'Dolor de pecho', 'Hormigueo', 'Calambres',
  'Mucha sed', 'Orinar seguido', 'Somnolencia', 'Confusión', 'Dolor de estómago',
];

/**
 * Síntomas ante los que conviene buscar atención médica sin esperar.
 * No es un diagnóstico: sólo un recordatorio de no dejarlos pasar.
 */
export const SINTOMAS_DE_ALARMA = ['Dolor de pecho', 'Falta de aire', 'Confusión', 'Vómitos'];

/** Síntomas que suelen justificar medirse la glucemia o la presión en el momento. */
export const SINTOMAS_MEDIR_GLUCOSA = ['Temblores', 'Sudoración fría', 'Mucha sed', 'Orinar seguido', 'Confusión', 'Somnolencia', 'Visión borrosa'];
export const SINTOMAS_MEDIR_PRESION = ['Mareo', 'Dolor de cabeza', 'Palpitaciones', 'Visión borrosa', 'Falta de aire'];

export const INTENSIDADES_SINTOMA = [
  { valor: 'leve', etiqueta: 'Leve', nivel: '' },
  { valor: 'moderado', etiqueta: 'Moderado', nivel: 'atencion' },
  { valor: 'fuerte', etiqueta: 'Fuerte', nivel: 'serio' },
];

let estado = cargar();
const suscriptores = new Set();

function cargar() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return estructuredCloneSeguro(ESTADO_INICIAL);
    const datos = JSON.parse(crudo);
    return migrar(datos);
  } catch (err) {
    console.warn('No se pudieron leer los datos guardados:', err);
    return estructuredCloneSeguro(ESTADO_INICIAL);
  }
}

function estructuredCloneSeguro(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/** Completa campos que falten al abrir datos de una versión anterior. */
function migrar(datos) {
  const base = estructuredCloneSeguro(ESTADO_INICIAL);
  return {
    ...base,
    ...datos,
    version: VERSION,
    perfil: { ...base.perfil, ...(datos.perfil || {}) },
    glucosa: Array.isArray(datos.glucosa) ? datos.glucosa : [],
    presion: Array.isArray(datos.presion) ? datos.presion : [],
    ejercicio: Array.isArray(datos.ejercicio) ? datos.ejercicio : [],
    // Colecciones agregadas después: en copias viejas no existen.
    medicamentos: Array.isArray(datos.medicamentos) ? datos.medicamentos : [],
    comidas: Array.isArray(datos.comidas) ? datos.comidas : [],
    sintomas: Array.isArray(datos.sintomas) ? datos.sintomas : [],
    recordatorios: Array.isArray(datos.recordatorios) ? datos.recordatorios : base.recordatorios,
    ajustes: {
      ...base.ajustes,
      ...(datos.ajustes || {}),
      objetivos: { ...base.ajustes.objetivos, ...(datos.ajustes?.objetivos || {}) },
    },
    disparos: datos.disparos || {},
  };
}

function guardar() {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch (err) {
    console.error('No se pudo guardar:', err);
    alert('No se pudieron guardar los datos. Es posible que el almacenamiento del navegador esté lleno.');
  }
}

function emitir() {
  guardar();
  suscriptores.forEach((fn) => fn(estado));
}

export function obtener() {
  return estado;
}

export function suscribir(fn) {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

// --- Registros -------------------------------------------------------------

export const COLECCIONES = ['glucosa', 'presion', 'ejercicio', 'medicamentos', 'comidas', 'sintomas'];

/** Agrega un registro y devuelve el objeto creado (ordena por fecha descendente). */
export function agregar(coleccion, datos) {
  if (!COLECCIONES.includes(coleccion)) throw new Error('Colección desconocida: ' + coleccion);
  const registro = { id: nuevoId(), creado: Date.now(), ...datos };
  estado[coleccion] = [registro, ...estado[coleccion]].sort((a, b) => b.ts - a.ts);
  emitir();
  return registro;
}

export function actualizar(coleccion, id, cambios) {
  estado[coleccion] = estado[coleccion]
    .map((r) => (r.id === id ? { ...r, ...cambios } : r))
    .sort((a, b) => b.ts - a.ts);
  emitir();
}

export function eliminar(coleccion, id) {
  estado[coleccion] = estado[coleccion].filter((r) => r.id !== id);
  emitir();
}

/** Registros de una colección dentro de los últimos N días. */
export function ultimos(coleccion, dias) {
  const desde = Date.now() - dias * 86400000;
  return estado[coleccion].filter((r) => r.ts >= desde);
}

/** Todos los registros de un día concreto, agrupados por tipo. */
export function registrosDelDia(clave) {
  const resultado = {};
  for (const col of COLECCIONES) {
    resultado[col] = estado[col].filter((r) => claveDia(r.ts) === clave);
  }
  return resultado;
}

/** Mapa "YYYY-MM-DD" -> cuántos registros de cada tipo, para pintar el calendario. */
export function resumenPorDia(desde, hasta) {
  const mapa = {};
  const vacio = () => Object.fromEntries(COLECCIONES.map((c) => [c, 0]));
  for (const col of COLECCIONES) {
    for (const r of estado[col]) {
      if (r.ts < desde || r.ts > hasta) continue;
      const c = claveDia(r.ts);
      mapa[c] ??= vacio();
      mapa[c][col] += 1;
    }
  }
  return mapa;
}

/** Nombres de medicamentos ya usados, para sugerirlos al cargar uno nuevo. */
export function medicamentosUsados() {
  const vistos = new Map();
  for (const r of estado.medicamentos) {
    const clave = r.nombre.trim().toLowerCase();
    if (!vistos.has(clave)) vistos.set(clave, { nombre: r.nombre.trim(), dosis: r.dosis || '' });
  }
  return [...vistos.values()];
}

// --- Recordatorios ---------------------------------------------------------

export function guardarRecordatorio(recordatorio) {
  const existe = estado.recordatorios.some((r) => r.id === recordatorio.id);
  estado.recordatorios = existe
    ? estado.recordatorios.map((r) => (r.id === recordatorio.id ? { ...r, ...recordatorio } : r))
    : [...estado.recordatorios, { id: nuevoId(), ...recordatorio }];
  emitir();
}

export function eliminarRecordatorio(id) {
  estado.recordatorios = estado.recordatorios.filter((r) => r.id !== id);
  emitir();
}

export function marcarDisparado(idRecordatorio, clave = claveDia()) {
  estado.disparos[`${idRecordatorio}|${clave}`] = Date.now();
  limpiarDisparosViejos();
  emitir();
}

export function yaDisparado(idRecordatorio, clave = claveDia()) {
  return Boolean(estado.disparos[`${idRecordatorio}|${clave}`]);
}

/** Evita que el registro de avisos crezca sin control (guarda ~30 días). */
function limpiarDisparosViejos() {
  const limite = Date.now() - 30 * 86400000;
  for (const [k, v] of Object.entries(estado.disparos)) {
    if (v < limite) delete estado.disparos[k];
  }
}

// --- Ajustes ---------------------------------------------------------------

export function guardarAjustes(cambios) {
  estado.ajustes = {
    ...estado.ajustes,
    ...cambios,
    objetivos: { ...estado.ajustes.objetivos, ...(cambios.objetivos || {}) },
  };
  emitir();
}

export function guardarPerfil(cambios) {
  estado.perfil = { ...estado.perfil, ...cambios };
  emitir();
}

// --- Copia de seguridad ----------------------------------------------------

export function exportarJSON() {
  return JSON.stringify(estado, null, 2);
}

/** Importa una copia de seguridad. Devuelve {ok, mensaje}. */
export function importarJSON(texto) {
  try {
    const datos = JSON.parse(texto);
    if (!datos || typeof datos !== 'object' || !Array.isArray(datos.glucosa)) {
      return { ok: false, mensaje: 'El archivo no tiene el formato esperado.' };
    }
    estado = migrar(datos);
    emitir();
    return { ok: true, mensaje: 'Copia restaurada correctamente.' };
  } catch (err) {
    return { ok: false, mensaje: 'No se pudo leer el archivo: ' + err.message };
  }
}

export function borrarTodo() {
  estado = estructuredCloneSeguro(ESTADO_INICIAL);
  emitir();
}

// --- Clasificación clínica (orientativa) -----------------------------------

/**
 * Clasifica una glucemia según los objetivos configurados.
 * Devuelve {nivel, etiqueta, alerta} donde nivel ∈ bien|atencion|serio|critico.
 */
export function clasificarGlucosa(valor, momento = 'otro') {
  const o = estado.ajustes.objetivos;
  const esPost = momento.startsWith('despues');
  if (valor < 54) {
    return { nivel: 'critico', etiqueta: 'Hipoglucemia severa', alerta: 'Valor muy bajo. Tomá azúcar de absorción rápida y buscá ayuda médica.' };
  }
  if (valor < o.glucosaBajaAlerta) {
    return { nivel: 'serio', etiqueta: 'Glucemia baja', alerta: 'Valor bajo. Conviene ingerir algo dulce y repetir el control en 15 minutos.' };
  }
  if (valor >= o.glucosaAltaAlerta) {
    return { nivel: 'critico', etiqueta: 'Glucemia muy alta', alerta: 'Valor muy alto. Consultá con tu médico o servicio de guardia.' };
  }
  const maximo = esPost ? o.glucosaPostMax : o.glucosaAyunasMax;
  if (valor > maximo) {
    return { nivel: 'atencion', etiqueta: 'Sobre el objetivo', alerta: null };
  }
  return { nivel: 'bien', etiqueta: 'En objetivo', alerta: null };
}

/** Clasifica la presión arterial (referencia orientativa tipo AHA). */
export function clasificarPresion(sis, dia) {
  if (sis >= 180 || dia >= 120) {
    return { nivel: 'critico', etiqueta: 'Crisis hipertensiva', alerta: 'Presión muy elevada. Repetí la medición en 5 minutos y, si se mantiene, buscá atención médica urgente.' };
  }
  if (sis >= 140 || dia >= 90) {
    return { nivel: 'serio', etiqueta: 'Hipertensión grado 2', alerta: 'Presión alta. Registralo y comentalo con tu médico.' };
  }
  if (sis >= 130 || dia >= 80) {
    return { nivel: 'atencion', etiqueta: 'Hipertensión grado 1', alerta: null };
  }
  if (sis >= 120) {
    return { nivel: 'atencion', etiqueta: 'Presión elevada', alerta: null };
  }
  if (sis < 90 || dia < 60) {
    return { nivel: 'atencion', etiqueta: 'Presión baja', alerta: null };
  }
  return { nivel: 'bien', etiqueta: 'Normal', alerta: null };
}

/** Conversión de unidades para mostrar (internamente siempre se guarda mg/dL). */
export function mostrarGlucosa(valorMgdl) {
  if (estado.ajustes.unidadGlucosa === 'mmol/L') {
    return (valorMgdl / 18).toFixed(1);
  }
  return String(Math.round(valorMgdl));
}

export function unidadGlucosa() {
  return estado.ajustes.unidadGlucosa;
}

/** Convierte lo que escribe la persona (en su unidad) a mg/dL. */
export function aMgdl(valorIngresado) {
  const n = Number(valorIngresado);
  if (!Number.isFinite(n)) return NaN;
  return estado.ajustes.unidadGlucosa === 'mmol/L' ? n * 18 : n;
}
