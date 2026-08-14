# Mi Control de Salud

Aplicación móvil personal para registrar los resultados del **glucómetro** y del
**tensiómetro**, la **medicación**, las **comidas**, los **síntomas del día** y la
**actividad física en un calendario**, con **avisos y notificaciones** para no
olvidarse los controles.

Funciona sin internet, se instala en la pantalla de inicio del celular como
cualquier otra app y guarda todo **dentro del propio teléfono**: ningún dato de
salud se envía a ningún servidor.

---

## Cómo instalarla en el celular

La app se publica como una página web que el teléfono guarda como aplicación
(PWA). Una vez instalada se abre desde su ícono, a pantalla completa y sin
barra del navegador.

### 1. Publicarla (una sola vez)

En GitHub: **Settings → Pages → Source: GitHub Actions**. Con eso, cada push a
la rama principal publica la app y queda disponible en:

```
https://<usuario>.github.io/mae-app-control/
```

> Si preferís probarla antes en la computadora, alcanza con abrir una terminal
> en la carpeta del proyecto y ejecutar `python3 -m http.server 8000`, y después
> entrar a `http://localhost:8000`.

### 2. Instalarla en el teléfono

Abrí esa dirección en el celular y:

- **Android (Chrome)**: aparece un cartel "Instalá la app…" con el botón
  **Instalar**. Si no aparece, usá el menú **⋮ → Agregar a la pantalla principal**.
- **iPhone (Safari)**: tocá el botón **Compartir** (el cuadrado con la flecha) y
  elegí **Agregar a inicio**.

Abrí la app desde su ícono. Ya funciona sin conexión.

### 3. Permitir las notificaciones

Entrá a la pestaña **Avisos** y tocá **Activar notificaciones**. Después usá
**Enviar aviso de prueba** para confirmar que llegan bien.

---

## Qué hace

### 💧 Glucómetro
- Carga del resultado con el momento del día (en ayunas, después del almuerzo,
  antes de dormir…), día, hora y notas.
- Clasificación automática de cada valor: en objetivo, sobre el objetivo,
  glucemia baja o muy alta, según **tus** objetivos configurables.
- **Alerta inmediata** cuando el valor queda fuera de rango (hipoglucemia o
  glucemia muy alta): aviso en pantalla + notificación.
- Resumen con promedios de 7 y 30 días y porcentaje de mediciones en objetivo.
- Gráfico de tendencia de 30 días con tu franja objetivo marcada.

### ❤️ Tensiómetro
- Carga de sistólica, diastólica, pulso y brazo, con día, hora y notas.
- Clasificación orientativa: normal, elevada, hipertensión grado 1 y 2, y
  **crisis hipertensiva** (que dispara una alerta).
- Promedios de la semana y gráfico con las dos curvas (sistólica y diastólica).

### 💊 Medicamentos
- Cada toma queda registrada con **qué tomaste, la dosis, el día y la hora**.
- Campo para anotar **cómo te sentiste después** (bien, sin cambios, con molestias).
  Si en el momento no sabés, la app te muestra las tomas de las últimas 24 horas
  para que lo completes con un toque cuando puedas.
- Los medicamentos que ya usaste aparecen como botones: repetir una toma es un toque.
- Contador de cuántas veces te cayó mal en el último mes — dato concreto para la consulta.
- Podés programar **recordatorios de medicación** (ver más abajo).

### 🍽️ Comidas
- Registro de desayuno, media mañana, almuerzo, merienda, cena y colaciones.
- Se propone sola la comida según la hora del día.
- Campo libre para describir qué comiste, más notas.
- En el calendario, las comidas quedan junto a las glucemias del mismo día: así se
  ve qué comiste antes de un valor alto.

### 🩺 Síntomas y eventos
- Lista de síntomas frecuentes (mareo, cansancio, náuseas, vómitos, dolor de cabeza,
  visión borrosa, temblores, palpitaciones y más) y podés elegir varios a la vez.
- Campo "Otro" para escribir cualquier cosa con tus palabras.
- Intensidad (leve, moderado, fuerte), duración y notas.
- **Ante síntomas que no conviene dejar pasar** (dolor de pecho, falta de aire,
  confusión, vómitos) la app te recuerda consultar. No diagnostica nada: sólo evita
  que quede anotado y olvidado.
- Cuando el síntoma lo justifica, te ofrece un atajo para **medirte la glucemia o la
  presión en ese momento**, así el valor queda junto al síntoma.
- Ranking de lo más repetido del mes, para mostrarle al médico.

### 📅 Calendario y ejercicio
- Calendario mensual: cada día muestra puntos de color según lo registrado
  (glucemia, presión, ejercicio) y un triángulo ▲ si ese día anotaste síntomas.
  La medicación y las comidas no llevan marca propia porque se registran todos los
  días: un punto en las 31 casillas no diría nada. Se ven al tocar el día.
- Se toca un día y se carga **a qué hora** se hizo ejercicio, **qué fue**
  (caminata, bici, natación, gimnasio… o lo que escribas), cuántos minutos y con
  qué intensidad.
- Al elegir un día se ve **todo** lo registrado en esa fecha: actividad, glucemias,
  presión, medicación, comidas y síntomas, uno debajo del otro.
- Resumen del mes: sesiones, minutos totales y días activos.

### 🔔 Recordatorios
- Avisos configurables por tipo (glucómetro, tensiómetro, **medicamento**, ejercicio),
  con nombre propio, hora y días de la semana.
- Vienen dos cargados de fábrica: glucemia a las 07:30 y presión a las 20:00,
  todos los días. Se pueden editar, pausar o borrar.
- Si a la hora prevista ya habías cargado la medición, el aviso no molesta.
- La pantalla de inicio muestra **los controles que quedaron pendientes hoy**.

### ⚙️ Ajustes
- Tu nombre, unidad de glucemia (mg/dL o mmol/L) y sonido de los avisos.
- Tus objetivos de glucemia (los que te haya indicado tu médico).
- **Exportar a CSV** cualquiera de los seis registros (glucemias, presión,
  medicamentos, comidas, síntomas y ejercicio), para imprimir o abrir en Excel
  y llevar a la consulta.
- **Copia de seguridad** en un archivo, y restauración desde ese archivo.

---

## Sobre los avisos: qué esperar

Esto es importante para que no haya sorpresas:

- Los recordatorios se disparan mientras la app está **abierta o en segundo
  plano** en el teléfono. Es la forma en que funcionan las apps web instaladas,
  sin necesitar un servidor propio.
- Si cerraste la app por completo, el aviso te llega **la próxima vez que la
  abras**, siempre que no hayan pasado más de 3 horas de la hora prevista.
- Además, al abrir la app siempre vas a ver en la pantalla de inicio los
  controles del día que todavía no cargaste, aunque la notificación no haya
  llegado.
- En iPhone hace falta iOS 16.4 o superior **y** tener la app agregada a la
  pantalla de inicio: Safari no envía notificaciones desde una pestaña común.

Si querés avisos con la fiabilidad de un despertador incluso con la app cerrada
y el teléfono reiniciado, hace falta una app nativa (Android/iOS) o un servidor
de notificaciones push. Como red de seguridad, sirve combinar estos
recordatorios con una alarma del reloj del teléfono.

---

## Dónde quedan los datos

Todo se guarda en el almacenamiento local del navegador del teléfono
(`localStorage`), en el propio dispositivo. No hay cuentas, ni servidores, ni
envío de información.

Como contrapartida: **si cambiás de teléfono, borrás los datos del navegador o
desinstalás la app, los registros se pierden.** Por eso conviene descargar cada
tanto una copia de seguridad desde **Ajustes → Copia de seguridad**.

---

## Estructura del proyecto

```
index.html               Estructura de la app y menú inferior
manifest.webmanifest     Datos de instalación (nombre, íconos, accesos directos)
sw.js                    Service worker: uso sin internet y notificaciones
css/styles.css           Estilos, modo claro y oscuro
js/app.js                Navegación y arranque
js/store.js              Datos, objetivos y clasificación clínica
js/notify.js             Motor de recordatorios y alertas
js/charts.js             Gráficos de tendencia en SVG
js/componentes.js        Piezas de interfaz reutilizadas
js/utils.js              Fechas, formato y exportación
js/views/                Una pantalla por archivo (glucosa, presión, ejercicio,
                         medicamentos, comidas, síntomas, recordatorios, ajustes)
icons/                   Íconos de la app
```

No usa librerías externas ni requiere compilación: son archivos estáticos.

---

## Aviso importante

Esta aplicación sirve para **llevar un registro ordenado** de tus controles.
No es un producto médico, no realiza diagnósticos y no debe usarse para decidir
tratamientos ni dosis de medicación. Las clasificaciones de glucemia y presión,
y los avisos ante ciertos síntomas, son orientativos. Nunca cambies ni suspendas
un medicamento por tu cuenta. Ante cualquier valor o síntoma que te preocupe,
consultá a un profesional de la salud.
