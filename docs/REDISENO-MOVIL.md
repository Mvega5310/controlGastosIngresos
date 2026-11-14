# FinControl — Guía de rediseño móvil

Documento de continuidad. Proyecto `Mvega5310/controlGastosIngresos`, rama de
trabajo `feat/redisenio-movil`. Fecha de referencia: 14 de noviembre de 2026.

## 1. Propósito y alcance

Mejorar la experiencia móvil sin reconstruir la aplicación ni alterar sus reglas
financieras. Se conserva React 18, TypeScript, Vite, CSS propio, Lucide,
Recharts, almacenamiento local, PWA y sincronización opcional con Supabase.

Objetivo: que FinControl sea cómodo, legible y confiable en teléfonos de 320 px
en adelante, con la experiencia de escritorio intacta.

**Dentro de esta etapa:** estructura responsive, navegación móvil y menú
lateral, dashboard en una columna, movimientos en tarjetas (móvil) y tabla
(escritorio), calendario, cuentas y ajustes táctiles, formularios/modales/avisos
/menús usables con teclado y tacto, pruebas de regresión.

**Fuera de alcance:** funciones financieras nuevas, cambios del modelo de datos,
monetización, pasarela de pago, conexión bancaria, multimoneda, reescritura de
la sincronización.

## 2. Reglas que no se deben romper

1. Ningún cálculo financiero en componentes visuales: importes, balances,
   periodos, transferencias y agregaciones salen de `src/core/`.
2. El dinero no pasa a coma flotante: se conservan los importes enteros.
3. No se cambia el contrato de `Movement`, `Account` ni las colecciones para
   resolver un problema visual.
4. No se duplica la lógica de transferencias: borrar una elimina sus dos apuntes.
5. No se toca la sincronización ni la resolución de conflictos.
6. No se sustituye el CSS propio por Tailwind (solo aporta el reset).
7. La tabla de escritorio se mantiene.
8. No se esconden controles importantes por falta de espacio: se reubican en una
   acción contextual o un menú accesible.
9. Se respeta tema claro/oscuro, `prefers-color-scheme`, áreas seguras y
   `prefers-reduced-motion`.
10. No se desactiva el zoom del navegador: los campos táctiles evitan el zoom
    automático de iOS con una fuente adecuada, sin bloquear la ampliación manual.

## 3. Diagnóstico y trabajo por archivo

- **`App.tsx`** — topbar usable en 320–390 px; el selector de periodo solo en las
  secciones que lo usan; «Nuevo movimiento» global solo en Inicio y Movimientos;
  el `+` central de la barra inferior se conserva; `aria-label`, `aria-expanded`,
  `aria-current` y gestión del foco al abrir/cerrar el menú. Cambios de
  presentación y composición, no de cálculo.
- **`Sidebar.tsx`** — ancho `min(86vw, 340px)`, `100dvh` con fallback `100vh`,
  áreas seguras, scroll interno, fondo inmóvil mientras está abierto, cierre con
  Escape y foco devuelto al botón que lo abrió. Mismo orden y categorías.
- **`Movimientos.tsx`** — tabla en escritorio, tarjetas en móvil, misma
  `onEliminar` y mismo `Confirmar`. Transferencias como «Cuenta A → Cuenta B» y
  nunca como ingreso/gasto. Búsqueda a ancho completo, filtro compacto,
  «Limpiar filtros» solo con filtros activos. Paginación y búsqueda intactas.
- **`Panel.tsx`** — una columna. Orden móvil: balance destacado, ingresos y
  gastos, ahorro, próximos pagos (si hay), flujo, cuentas, recientes, consejo.
  Sin balances inventados; se mantiene el mensaje «movimientos pero sin cuentas».
- **`Calendario.tsx`** — siete días con celdas táctiles, cabecera sin
  desbordes, listado apilado. Seleccionar un día es mejora opcional; si se hace,
  sin tocar `monthGrid`, `inPeriod` ni `todayISO`.
- **`Ajustes.tsx`** — filas en vertical en móvil, botones a ancho completo, zona
  destructiva diferenciada con su confirmación intacta.

## 4. Sistema responsive

Se usan los breakpoints existentes como punto de partida y se revisan los
`@media` actuales antes de añadir reglas. Sin segundo sistema de diseño: se
reutilizan `--bg --panel --text --muted --line --green --green2 --soft --shadow`.

| Ancho    | Comportamiento                                               |
| -------- | ------------------------------------------------------------ |
| 320–374  | móvil compacto; una columna; controles apilados              |
| 375–600  | móvil estándar; tarjetas compactas; navegación inferior fija |
| 601–767  | móvil grande / tablet pequeña                                |
| 768–1023 | tablet; padding reducido, grids adaptables                   |
| ≥ 1024   | escritorio; sidebar fija y layout actual                     |

Tokens, solo si hacen falta: `--touch-target: 44px`, `--mobile-gutter: 16px`,
`--mobile-nav-height: 64px`, `--content-max: 1500px`.

## 5. Fases

- **0 — Entorno.** Rama `feat/redisenio-movil`, `npm install`, `npm run verificar`.
- **1 — Estructura y navegación.** `App.tsx`, `Sidebar.tsx`, `index.css`.
- **2 — Movimientos.** `Movimientos.tsx`, tarjeta móvil, `index.css`.
- **3 — Dashboard y calendario.** `Panel.tsx`, `Calendario.tsx`, `GraficaFlujo.tsx`.
- **4 — Formularios, cuentas y ajustes.** Modales, paneles flotantes, `Cuentas`,
  `Ajustes`; objetivos táctiles de 44 px y campos de 16 px.
- **5 — Regresión y cierre.** `npm run verificar`, flujos de movimientos y
  transferencias, tema, offline, PWA y service worker.

## 6. Matriz de pruebas

Tamaños: 320×640, 360×800, 390×844, 430×932, 768×1024, 1366×768, 1440×900.

- [ ] Sin scroll horizontal global.
- [ ] Ningún importe cortado.
- [ ] Ningún botón detrás de la barra inferior.
- [ ] Menú lateral: abre, cierra, navega y no deja desplazarse el fondo.
- [ ] Navegación inferior: Inicio, Movimientos, Calendario, Ajustes y alta rápida.
- [ ] La tabla de escritorio sigue funcionando.
- [ ] Las tarjetas móviles muestran todo lo esencial.
- [ ] Buscar, filtrar, paginar y borrar funcionan.
- [ ] Borrar una transferencia elimina ambos apuntes.
- [ ] Modales usables con teclado y tacto.
- [ ] Contraste correcto en tema claro y oscuro.
- [ ] Los campos no provocan zoom automático en iOS.
- [ ] La app instalada no oculta contenido tras las áreas seguras.
- [ ] `npm run verificar` sin errores.

## 7. Criterios de aceptación

1. Las pantallas principales se usan a 320 px sin desplazamiento horizontal.
2. La información financiera esencial se lee sin zoom.
3. Las acciones frecuentes se alcanzan con el pulgar y tienen área táctil suficiente.
4. No se pierde ninguna acción disponible en escritorio.
5. Coherencia en tema claro y oscuro.
6. Sin cambios en cálculos, importes, persistencia ni sincronización.
7. Pruebas y compilación pasan.
8. El escritorio conserva su estructura y jerarquía.

## 8. Instrucción para continuar con un asistente de código

> Estamos trabajando en FinControl, repositorio `Mvega5310/controlGastosIngresos`,
> rama `feat/redisenio-movil`. Lee primero `docs/REDISENO-MOVIL.md` y revisa el
> estado actual del repositorio. Implementa solamente la siguiente fase
> pendiente. Antes de editar, inspecciona los componentes y CSS existentes. No
> reescribas la arquitectura, no cambies modelos ni reglas financieras, no alteres
> sincronización/Supabase y no sustituyas el CSS propio por Tailwind. Mantén la
> tabla de movimientos en escritorio y crea presentación en tarjetas para móvil.
> Después de cada fase ejecuta las pruebas relevantes y `npm run verificar`.
> Resume archivos modificados, decisiones, pruebas y siguiente paso. No hagas
> deploy a producción sin aprobación explícita.

## 9. Registro de continuidad

| Campo          | Valor                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fase actual    | 5 — regresión y cierre, hecha. **Rediseño completo.**                                                                                                       |
| Rama           | `feat/redisenio-movil` (sin subir; ver nota abajo)                                                                                                          |
| Pruebas        | 208 unitarias en verde; `npm run verificar` limpio                                                                                                          |
| Matriz         | 7 tamaños × 12 secciones × 2 temas: **0 desbordes** (línea base: 12/12 a 320 px)                                                                            |
| Contraste      | **0 fallos AA** en claro y oscuro a 320, 390, 768, 1366 y 1440 px. Los días de otro mes del calendario y la «/» de la miga de pan pasaron de 3,07:1 a 5,0:1 |
| Reglas 1–3 y 5 | `src/core`, `src/datos`, sincronización y Supabase: **0 archivos modificados** (`git diff 1de3287`)                                                         |
| Dependencias   | ninguna nueva                                                                                                                                               |
| Próximo paso   | Prueba en dispositivos reales (`docs/PRUEBA-EN-DISPOSITIVOS.md`); después, aprobación para subir y desplegar                                                |

### Decisiones

**Fase 1** (estructura y navegación)

- **Selector de mes** solo en Inicio, Reportes y Presupuestos. Calendario queda
  fuera: lleva sus propias flechas contra el mismo periodo y repetirlas en la
  cabecera era ruido. Movimientos no lo usa (no tiene filtro temporal).
- **«Nuevo movimiento» arriba** solo en Inicio y Movimientos, y solo en
  escritorio: donde hay barra inferior (≤ 900 px) el `+` central cumple ese
  papel y repetirlo con texto era lo que desbordaba a 320 px. El `+` lleva
  `aria-label`.
- **Menú lateral**: `min(86vw, 340px)`, `100dvh`, `visibility: hidden` cerrado
  (antes sus enlaces seguían en el orden del tabulador), fondo bloqueado,
  Escape cierra y el foco vuelve al botón de apertura, y se cierra solo si la
  ventana crece hasta el escritorio.
- **Objetivos táctiles de 44 px** en la cabecera y la barra inferior, con
  `--touch-target`, `--mobile-gutter` y `--mobile-nav-height` en `:root`.

**Fase 2** (Movimientos)

- Dos representaciones de los mismos datos dentro de `TablaMovimientos`: la
  tabla (`.tabla-escritorio`) y una lista de tarjetas (`.lista-movil`). El CSS
  enseña una u otra a 767 px. Datos, página, borrado y `Confirmar` son los
  mismos; `TarjetaMovimiento` es solo presentación.
- Un traslado se lee «Cuenta A → Cuenta B», con la etiqueta _Transferencia_, sin
  signo y sin color de ingreso ni de gasto. Aparece una vez, no dos.
- «Limpiar filtros» solo aparece si hay filtros activos y ahora limpia también la
  búsqueda (antes solo restablecía el tipo).
- El tipo se dice siempre con texto, además de con color.

**Fase 3** (Dashboard y calendario)

- `Panel.tsx` se envuelve en `.panel-flujo`. En escritorio no cambia nada; hasta
  900 px es una columna flex y los dos contenedores en rejilla pasan a
  `display: contents`, de modo que sus secciones se ordenan entre sí con CSS
  `order` y sin duplicar nada en el DOM: balance → próximos pagos → flujo →
  cuentas → recientes → consejo.
- El balance ocupa el ancho entero con un degradado verde de la marca (blanco
  sobre `#1e6b3a`, 6,6:1); ingresos y gastos van de dos en dos y el ahorro, solo
  en su fila, ocupa el ancho. A ≤ 359 px las tarjetas van de una en una para que
  una cifra de doce dígitos no se corte.
- «Próximos pagos» no reserva tarjeta cuando no hay pagos (`.sin-pagos`).
- El periodo junto al título de la gráfica se oculta en móvil: ya está en el
  selector de arriba.
- Calendario: siete columnas a 320 px (celdas de 36×50), flechas de 44 px y
  listado apilado en rejilla (fecha e importe arriba, descripción debajo).
  Los días con movimientos dicen cuántos con texto solo para lectores de
  pantalla; el día actual lleva `aria-current="date"`. No se tocó `monthGrid`,
  `inPeriod` ni `todayISO`. Seleccionar un día queda como mejora opcional.

**Fase 4** (formularios, paneles flotantes, cuentas y ajustes)

- `lib/useDialogo.ts` unifica el comportamiento de todos los modales: Escape
  cierra, el foco entra al primer campo y vuelve a quien abrió, Tab no se
  escapa al fondo y el fondo no se desplaza (clase `dialogo-abierto`, con
  contador por si dos diálogos se solapan). Lo usan `Modal`, `FormModal`,
  `Confirmar` y `PanelCuenta`; antes el de nuevo movimiento no se cerraba con
  Escape ni llevaba rol. Avisos y menú de perfil cierran con Escape.
- `Modal.tsx`: `role="dialog"`, `aria-modal`, nombre accesible, etiquetas
  enlazadas a sus campos (tocar el texto enfoca el campo), `aria-pressed` en el
  tipo e `inputMode="numeric"` en el valor.
- Los modales caben en pantallas bajas (probado a 320×480), desplazan por
  dentro con `100dvh`, y los botones de guardar quedan fijos en el borde de
  abajo en móvil. Campos de 44 px y 16 px de letra; botones de 44 px.
- Los paneles de avisos y de perfil salen con `top: calc(100% + 6px)` respecto
  a la cabecera, sea cual sea su alto (antes se montaban sobre su borde).
- Ajustes: cada fila en vertical con el botón a ancho completo. «Borrar todo»
  sigue pidiendo confirmación. Botones de editar/borrar de 44 px.
- Con `prefers-reduced-motion: reduce` el menú lateral no se anima.

**Fase 5** (regresión y cierre)

- **Contraste.** Un auditor que calcula la razón de cada texto contra su fondo
  real encontró 29 clases por debajo de AA entre los dos temas. Causas: el gris
  `--muted` (3,0:1 → `#66726a`, 5,0:1), los importes verde y rojo (`#1a7a41` y
  `#c0392b`, con variantes claras en oscuro) y, sobre todo, **el verde de marca
  usado como color de texto sobre fondo oscuro** (1,9–2,5:1). Para esto último
  nace `--verde-texto` (`#1e6b3a` en claro, `#7bd89a` en oscuro); `--green`
  sigue siendo el de los fondos. Quedan fuera los que van sobre un fondo fijo
  claro (`.avatar`, `.top-avatar`).
  Revisión posterior: los días de otro mes del calendario y la «/» de la miga de
  pan son texto, así que también pasan a `--muted` (5,0:1). Y el texto
  secundario de la tarjeta del balance, que el auditor no mide por tener
  degradado, se calculó a mano: al 86 % de blanco daba 4,09:1 en el extremo
  claro, así que pasa a blanco pleno (4,92:1).
- **Un error mío de la fase 1.** Envolver «Mi espacio» en un `<span>` hizo que la
  regla de la barra separadora lo pintara casi invisible. Detectado al ver la
  captura del tablet; el auditor no lo vio porque se corrió solo a 390 px, donde
  ese texto está oculto.
- **Tipografía.** Lo que quedaba entre 7 y 10 px en planificación y patrimonio
  pasa a 11–14 px; los botones de cabecera de panel a 44 px.
- **PWA.** Manifiesto standalone con icono maskable; service worker activo; sin
  red la aplicación abre, permite crear una cuenta y un movimiento y calcula el
  balance; al volver la red no se pierde nada. Caché `fincontrol-v3`: las
  anteriores se purgan al activarse.
- **Tema.** Sigue al sistema la primera vez, guarda la elección y la respeta al
  recargar; el botón de la cabecera y el de Ajustes lo cambian.
- **`npm run revision:responsive`** deja la matriz como regresión del
  repositorio. Contra `1de3287` (antes del rediseño) falla con 35 problemas;
  contra esta rama pasa.

**Decisiones que se apartan de la letra de la guía**

- Calendario no repite el selector de mes (lleva el suyo).
- «Nuevo movimiento» arriba no se muestra donde hay barra inferior (≤ 900 px).
- No se implementó seleccionar un día del calendario: la guía lo marca como
  mejora opcional.
- Se añadió `inputMode="numeric"` al valor del movimiento: el campo ya rechazaba
  decimales (`step` por defecto), así que el teclado sin coma evita el error.
- `package.json` recibió un script nuevo (`revision:responsive`); nada más.
- **Orientación libre** (decisión del propietario): el manifiesto ya no fija
  `portrait-primary`, para no limitar tablets ni plegables. Al hacerlo, el
  guardián se amplió a 11 formatos (horizontales y un plegable) y encontró dos
  fallos que el vertical no enseñaba: el avatar medía 31 px entre 601 y 900 px,
  y a 844×390 el botón de guardar del modal quedaba fuera de vista porque los
  botones fijos dependían del ancho y no de la altura. Corregidos.

**Nota sobre la rama.** El entorno de esta sesión fija la rama de desarrollo en
`claude/quirky-mayer-3caadd`, y Railway despliega solo lo que se sube a ella; la
guía pide no desplegar sin aprobación. Por eso el trabajo está en
`feat/redisenio-movil` y **no se ha subido**.

**Pendiente tras el rediseño:** la prueba en iOS Safari y Chrome Android
reales, con la app instalada y el teclado en pantalla, que un navegador
simulado no sustituye. El protocolo, con el resultado esperado de cada paso y el
arreglo preparado para cada fallo probable, está en
`docs/PRUEBA-EN-DISPOSITIVOS.md`. Mientras tanto se corrigió lo que sí se podía
razonar sin teléfono: el tema oscuro solo pintaba el fondo de la aplicación y no
el de la página, así que el rebote de iOS y la franja de las áreas seguras
enseñaban una banda clara. `html` y `body` ahora siguen el tema, y la clase se
pone antes de que arranque React para que no haya destello.

> Este documento es un plan. Revisar siempre el código actual antes de editar.
