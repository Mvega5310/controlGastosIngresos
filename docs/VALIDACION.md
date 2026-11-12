# Validación del MVP FinControl

Fecha: 12 de noviembre de 2026
Base revisada: los 14 archivos importados desde Google Drive, commit `603eea7`.

Todo lo que sigue está **verificado ejecutando el proyecto**, no deducido de la
lectura. Instalación sin vulnerabilidades, `tsc -b` y `vite build` sin errores, y
la aplicación arrancada y manejada en escritorio (1440 px) y móvil (Pixel 7).

---

## 1. Qué es realmente este proyecto

Una **aplicación web** React 18 + TypeScript + Vite 6, con Recharts para las
gráficas y Lucide para los iconos. Responsive de verdad: barra lateral en
escritorio, navegación inferior con botón de alta en móvil, sin desborde
horizontal. Tiene 12 secciones, tema claro y oscuro, y una identidad visual
cuidada y coherente.

El trabajo de interfaz está bien hecho y merece conservarse. Lo que falta es la
capa de abajo: no hay modelo de dominio, ni persistencia real, ni cálculos
fiables.

### Discrepancia con el README

El README dice "Construida con React, TypeScript, Vite, **Tailwind CSS**,
Recharts y Lucide". Tailwind está instalado y configurado, pero **no se usa**:

- Cero clases de utilidad de Tailwind en el marcado; todas las clases son
  propias (`.stat-card`, `.panel`, `.nav-item`…).
- El color `brand` definido en `tailwind.config.js` no se referencia en ningún
  sitio.
- Lo único que aporta Tailwind es el *reset* (`@tailwind base`), unos 5 KB.

El sistema de diseño real son **19 KB de CSS escrito a mano** en
`src/index.css`, con variables de color, tres puntos de corte responsive y un
bloque de impresión. Es un buen CSS, pero conviene llamarlo por su nombre:
quitar Tailwind exigiría reponer el *reset*, y mantenerlo como está induce a
error a quien entre al proyecto.

---

## 2. Decisión pendiente y bloqueante: el stack

Antes de ver este código, elegiste **Expo + React Native Web**. Ese camino y
este proyecto son incompatibles: React Native no renderiza `<div>`, `<table>`
ni `<select>`, no entiende hojas CSS, y Recharts necesita el DOM.

Migrar a Expo significa **reescribir la interfaz entera desde cero**: las 12
secciones, los 19 KB de CSS y las gráficas. Se conservarían las ideas de diseño
y poco más.

Mi recomendación es **no migrar**, y en su lugar:

1. Convertir esta web en **PWA instalable**. En Android e iOS se instala desde
   el navegador, con icono propio, pantalla completa y funcionamiento sin
   conexión. Cubre "móvil y PC" sin tocar una línea de la interfaz.
2. Si más adelante hacen falta las tiendas de aplicaciones o funciones nativas
   (biométrico, notificaciones *push* en iOS, leer SMS bancarios), envolver esta
   misma web con **Capacitor**, que reutiliza el 100 % del código.

Expo solo compensaría si la app nativa en tiendas fuese un requisito
innegociable desde ya y se aceptase reescribir la interfaz.

**Esta decisión condiciona todo lo demás, así que conviene cerrarla antes de
seguir.**

---

## 3. Defectos confirmados

Ordenados por gravedad. Todos reproducidos.

> **Estado a 12 de noviembre de 2026.** Los defectos **3.1 a 3.5** (los cinco de
> cálculo) están **corregidos** en el commit «Calcular de verdad las cifras del
> panel», junto con 3.9, 3.10, 3.12 y 3.13. Los cálculos viven ahora en
> `src/core/finance.ts`, un módulo puro. Siguen pendientes **3.6** (transferencias),
> **3.7** (calendario), **3.8** (coma flotante), **3.11** (tema) y **3.14**
> (tamaño del paquete). El texto de cada punto se conserva como registro de lo
> que se encontró.

### Graves: los números que se muestran no son correctos

**3.1. Las tarjetas "del mes" suman todo el histórico** — `src/App.tsx:18`

```ts
const totals = useMemo(() => ({
  income:  movements.filter(m => m.type === 'Ingreso').reduce((a,m) => a + m.amount, 0),
  expense: movements.filter(m => m.type === 'Gasto').reduce((a,m) => a + m.amount, 0)
}), [movements])
```

No hay ningún filtro por fecha en toda la aplicación (`getMonth`, `getFullYear`
y equivalentes no aparecen). "Ingresos del mes", "Gastos del mes" y "Ahorro
disponible" suman **todos** los movimientos registrados. Hoy parece correcto
solo porque los datos de ejemplo son de noviembre de 2026; en diciembre seguirá
sumando los de noviembre. El selector "Noviembre 2026" y el de "Últimos 30 días"
son decorativos: no filtran nada.

**3.2. El balance total parte de cifras inventadas y no cuadra con las cuentas**
— `src/App.tsx:36`

```ts
const balance = 11926000 + totals.income - 935000 - totals.expense
```

Las cuentas que muestra la propia pantalla suman 6.850.000 + 3.200.000 − 840.000
= **9.210.000**, no 11.926.000. Los dos números fijos no tienen origen
explicable y las dos cifras se contradicen en la misma vista.

**3.3. Una caída se pinta en verde** — `src/components/StatCard.tsx`

```tsx
{change && <span className="positive">{change}</span>}
```

La clase es siempre `positive`. En la captura de inicio, "Gastos del mes
↓ 4,2%" aparece en verde. Con gastos al alza se vería igual de verde: el color,
que es la señal que el ojo lee primero, puede comunicar lo contrario de lo que
pasa.

**3.4. Todos los porcentajes de variación son fijos** — `src/App.tsx`

`↑ 8,4%`, `↑ 12,8%`, `↓ 4,2%`, `↑ 6,1%`, `+8,2%` están escritos a mano. No se
calculan contra ningún periodo anterior y no cambian nunca.

**3.5. La fecha de cabecera está escrita a mano**

`MIÉRCOLES, 11 DE NOVIEMBRE DE 2026` es una cadena literal. **Hoy es 12 de
noviembre: ya muestra una fecha equivocada.**

### Medios: modelo de datos incompleto

**3.6. Las transferencias no transfieren.** El tipo `Transferencia` existe, pero
un movimiento guarda **una sola cuenta**. No hay cuenta de origen y destino, así
que registrar una transferencia no mueve dinero entre cuentas. El punto 4 de la
hoja de ruta del README ya lo identificaba; sigue pendiente y condiciona el
esquema de datos.

**3.7. El calendario es un dibujo.** 35 celdas generadas con un desplazamiento
fijo y el día 11 marcado a mano, con "Noviembre 2026" escrito en el código. Las
flechas de mes no hacen nada.

**3.8. Los importes se guardan como coma flotante.** Para una aplicación de
dinero lo correcto es guardar enteros en la unidad mínima (centavos) y formatear
al mostrar. Con pesos colombianos sin decimales el riesgo es bajo hoy, pero la
multimoneda del punto 5 de la hoja de ruta lo convierte en un problema real.

**3.9. Identificadores por colisión.** `id: Date.now()` repite valor si se
guardan dos movimientos en el mismo milisegundo, y no sirve cuando haya
sincronización entre dispositivos. Procede usar UUID.

**3.10. La lista no se ordena por fecha.** Los movimientos nuevos se anteponen,
así que "Movimientos recientes" muestra los cinco **últimos introducidos**, no
los cinco más recientes por fecha. Un gasto de hace un mes registrado hoy
encabeza la lista.

**3.11. El tema no se recuerda.** Verificado: al recargar vuelve a claro. Solo
los movimientos se guardan en `localStorage`.

### Menores

**3.12.** `<option>` sin `key` en `Modal.tsx` (dos listas): genera un aviso de
React en consola, el único error que aparece al ejecutar.

**3.13. Código muerto y duplicado.** En `App.tsx`, `sections`, `navIcon` y el
icono `CheckCircle2` se declaran y no se usan. En `mock.ts`, `navGroups` no se
importa desde ningún sitio: está duplicado dentro de `Sidebar.tsx`, de modo que
tocar el menú en el sitio equivocado no surte efecto.

**3.14. Un solo paquete de 590 KB** (169 KB comprimido), sin división de código.
Recharts es la mayor parte. En móvil con datos penaliza el primer arranque.

---

## 4. Qué falta para "completa y profesional"

El propio README lo reconoce y la auditoría lo confirma. Diez de las doce
secciones son maquetas: cuentas, calendario, suscripciones, deudas, metas,
presupuestos, inversiones y transporte muestran datos fijos escritos en el
código, y sus botones de alta abren un `alert()`. Solo **Movimientos** y el
dashboard operan con datos reales.

Pendiente, por orden de dependencia:

1. **Modelo de dominio y cálculos** — periodos, saldos por cuenta, transferencia
   como par de apuntes, importes enteros, categorías como entidad.
2. **Persistencia real y sincronización** — es la decisión que ya tomaste
   (local primero + nube). Con IndexedDB local y Supabase por encima encaja bien
   en este stack.
3. **Cuentas de usuario** — registro, acceso y recuperación.
4. **Las diez secciones restantes** con datos y formularios reales.
5. **Presupuestos, recurrentes y recordatorios**.
6. **Pruebas** — hoy no hay ninguna. En una aplicación de dinero, los cálculos
   necesitan pruebas automáticas.
7. **Seguridad y despliegue**.

---

## 5. Recomendación

La interfaz está lista y es buena. Lo que no está listo es todo lo que hay
debajo, y los puntos 3.1 a 3.5 son los más urgentes: **la aplicación muestra
cifras que parecen reales y no lo son**. Mientras eso siga así, no conviene usar
FinControl para llevar cuentas de verdad, ni enseñarla como si calculara.

Orden propuesto:

1. Cerrar la decisión de stack (sección 2).
2. Arreglar los cinco defectos de cálculo, que son contenidos y de efecto
   inmediato.
3. Levantar el modelo de dominio con pruebas.
4. Añadir persistencia y sincronización.
5. Ir completando secciones sobre esa base.
