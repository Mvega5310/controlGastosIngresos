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

| Campo                 | Valor                                                                                                                                          |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Fase actual           | 2 — Movimientos, hecha                                                                                                                         |
| Rama                  | `feat/redisenio-movil`                                                                                                                         |
| Archivos de la fase 2 | `Movimientos.tsx`, nuevo `components/TarjetaMovimiento.tsx`, `index.css`                                                                       |
| Medido                | tarjetas a 320 y 390 px sin desborde, con importes de 9 cifras y textos largos; objetivos táctiles de 44 px (borrar, paginar, buscar, filtrar) |
| Pruebas               | `npm run verificar` en verde; flujo real de traslado creado y borrado comprobando sus dos apuntes                                              |
| Próximo paso          | Fase 3 — Dashboard y calendario                                                                                                                |

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

**Pendiente de fases siguientes:** objetivos táctiles de `text-link`,
`add-account` y `mini-btn` fuera de Movimientos (< 40 px), y la escala
tipográfica de 7–10 px del resto de secciones.

> Este documento es un plan. Revisar siempre el código actual antes de editar.
