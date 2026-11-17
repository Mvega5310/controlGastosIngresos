# Prueba en dispositivos reales

Lo que un navegador simulado no puede comprobar: iOS Safari, Chrome Android, la
app instalada como PWA, las áreas seguras y el teclado en pantalla. Todo lo demás
del rediseño móvil (`docs/REDISENO-MOVIL.md`) está medido con navegador simulado;
esto es lo que falta, y es lo que decide si se publica.

Duración estimada: 20 minutos por dispositivo.

## Antes de empezar

**Dirección de pruebas (HTTPS):**
https://fincontrol-staging-web-staging.up.railway.app

Es una copia aislada de producción (ver `docs/ENTORNOS.md`): se instala como
**«FinControl · pruebas»** para no confundirla con la real, y **no tiene
Supabase**, así que nada de lo que se haga ahí toca datos reales.

Hace falta HTTPS: sin él ni el service worker ni la instalación como PWA
funcionan.

**Qué no se puede probar ahí:** el acceso con cuenta. En staging el panel de
cuenta dice que la sincronización no está configurada, así que el paso **C7**
(gestor de contraseñas) queda pendiente hasta tener un Supabase solo para
pruebas, o hasta probarlo en producción tras la autorización.

**Dispositivos mínimos:** un iPhone con iOS 16 o superior (Safari) y un Android
con Chrome actualizado. Si solo hay uno, empezar por el iPhone: iOS es donde más
se aparta del comportamiento de un navegador de escritorio.

**Cargar datos para ver todo:** Ajustes → «Cargar ejemplos». Se borran luego con
«Borrar todo».

Anotar siempre: modelo, versión del sistema, navegador, y si la app va en el
navegador o instalada. Una captura de pantalla de cada fallo vale más que la
descripción.

## A. En el navegador (sin instalar)

| #   | Qué hacer                                               | Esperado                                                                |
| --- | ------------------------------------------------------- | ----------------------------------------------------------------------- |
| A1  | Abrir Inicio                                            | Cabecera completa, sin hora ni cobertura encima; barra inferior visible |
| A2  | Desplazar hasta el final                                | La última tarjeta no queda tapada por la barra inferior                 |
| A3  | Girar a horizontal y volver                             | Nada se corta ni se desplaza de lado                                    |
| A4  | Pellizcar para ampliar                                  | **Debe poder ampliarse** (no se bloquea el zoom)                        |
| A5  | En tema oscuro, tirar de la página hacia abajo (rebote) | Fondo oscuro detrás, **sin banda blanca**                               |

## B. Instalada como PWA

**iOS:** Safari → Compartir → «Añadir a pantalla de inicio» → abrir desde el icono.
**Android:** menú de Chrome → «Instalar aplicación» → abrir desde el icono.

| #   | Qué hacer                                                           | Esperado                                                                                                       |
| --- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| B1  | Abrir instalada                                                     | Sin barra de direcciones; la cabecera **no queda bajo la barra de estado**                                     |
| B2  | Mirar el borde de abajo                                             | La barra inferior no queda bajo el indicador de inicio (iPhone sin botón) ni tras la barra de gestos (Android) |
| B3  | Mirar el color de la barra de estado en tema oscuro                 | Anotar cuál es. Ver «Decisiones abiertas»                                                                      |
| B4  | Modo avión, cerrar del todo la app y abrirla                        | Abre; crear una cuenta y un movimiento funciona; el balance se calcula                                         |
| B5  | Quitar el modo avión                                                | Los datos siguen; si hay sesión, sincroniza                                                                    |
| B6  | Tras un despliegue nuevo: abrir, cerrar del selector de apps, abrir | Entra la versión nueva (la caché es `fincontrol-v3`)                                                           |

## C. Teclado en pantalla — lo más delicado

En iOS el teclado **no reduce** la ventana, solo la tapa; en Android Chrome sí la
reduce. Por eso es donde más puede fallar y donde un simulador no sirve.

| #   | Qué hacer                                                        | Esperado                                                                                  |
| --- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| C1  | Nuevo movimiento (botón `+`) → tocar «Descripción»               | Se abre el teclado y el campo sigue **a la vista**, sin quedar tapado                     |
| C2  | Con el teclado abierto, mirar los botones Cancelar / Guardar     | **Anotar si quedan tapados por el teclado.** Se pueden alcanzar desplazando el formulario |
| C3  | Tocar «Valor en COP»                                             | Teclado numérico, **sin coma**                                                            |
| C4  | Guardar el movimiento                                            | La pantalla **no queda ampliada** (los campos son de 16 px a propósito)                   |
| C5  | Con el teclado abierto, ¿la barra inferior se sube y estorba?    | Anotar. En Android puede subir sobre el teclado y quitar espacio                          |
| C6  | Movimientos → tocar el buscador                                  | Escribir filtra; sin zoom; al cerrar el teclado la página vuelve a su sitio               |
| C7  | Icono de nube → «Entrar con mi contraseña» → campo de contraseña | El gestor de contraseñas del sistema ofrece rellenar; el ojo funciona                     |
| C8  | Cualquier modal con el teclado abierto → pulsar atrás/gesto      | Se cierra sin dejar la página desplazada                                                  |

## D. Gestos y navegación

| #   | Qué hacer                              | Esperado                                                                    |
| --- | -------------------------------------- | --------------------------------------------------------------------------- |
| D1  | Abrir el menú (☰)                     | Entra con animación, ocupa ~86 % del ancho; el fondo no se desplaza         |
| D2  | Con el menú abierto, deslizar la lista | Se desplaza la lista, **no** la página de detrás                            |
| D3  | Tocar fuera del menú                   | Se cierra                                                                   |
| D4  | Borrar un movimiento                   | Aparece la confirmación; el botón seguro es el destacado; cancelar no borra |
| D5  | Borrar un traslado entre cuentas       | La pregunta avisa de que se borran los dos apuntes                          |
| D6  | Calendario                             | Siete días legibles, flechas cómodas de pulsar con el pulgar                |

## E. Horizontal y plegables

| #   | Qué hacer                                                 | Esperado                                                                                                  |
| --- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| E1  | Girar el móvil a horizontal en Inicio                     | Se ve la cabecera completa y la barra inferior; nada se corta                                             |
| E2  | En horizontal, abrir Nuevo movimiento                     | El modal cabe entero y **Guardar se ve sin desplazar**                                                    |
| E3  | En horizontal, tocar un campo (teclado abierto)           | El campo sigue a la vista. Con el teclado casi no queda pantalla: anotar si se puede escribir cómodamente |
| E4  | Girar con el modal o el menú abiertos                     | No se rompe ni se queda desplazado el fondo                                                               |
| E5  | Plegable: abrir y cerrar la pantalla con la app en marcha | La disposición se adapta al cambiar de tamaño, sin recargar                                               |

## Si algo falla: causa probable y arreglo preparado

- **C2 — el teclado tapa Guardar en iOS.** El modal usa `100dvh`, que en iOS no
  descuenta el teclado. Arreglo: leer `window.visualViewport.height` en
  `lib/useDialogo.ts`, publicarlo en una variable CSS y usarla en el `max-height`
  del modal. No se ha hecho sin poder probarlo: un arreglo a ciegas del teclado
  suele empeorar Android.
- **C5 — la barra inferior estorba con el teclado.** Ocultarla mientras haya un
  campo con el foco (`body:has(input:focus) .mobile-nav { display: none }`).
- **B1/B2 — contenido bajo la barra de estado o los gestos.** La aplicación **no**
  usa `viewport-fit=cover`, así que el sistema recorta la ventana y no hay nada
  que calcular. Si aun así se ve bajo la barra, es que ese navegador la extiende
  igualmente: se vuelve a calcular con `env(safe-area-inset-*)`, que el CSS
  conserva en la cabecera, la barra inferior y los modales.
- **A5 — banda blanca al rebotar en tema oscuro.** Corregido: la página se pinta
  oscura (`html.tema-oscuro`). Si reaparece, mirar que la clase se ponga.

## Decisiones abiertas (necesitan a una persona)

1. **Color de la barra de estado.** La app declara `theme-color` verde de marca
   (`#1e6b3a`) y, en iOS, `status-bar-style: default` (clara). En tema oscuro eso
   puede verse como una barra clara o verde sobre una app oscura. Hay que decidir
   si se prefiere que siga al tema (cabecera blanca/oscura) o se queda de marca.
   En iOS la barra es **estática**: no cambia con el tema.
2. ~~**Orientación.**~~ **Decidido:** se permiten vertical y horizontal; el
   manifiesto ya no fija la orientación (tablets y plegables). Ver los pasos
   E1–E4: en horizontal un móvil mide 844 px de ancho y 390 de alto, y lo que
   falta es altura, no anchura.

## Resultado

| Dispositivo | Sistema | Navegador / instalada | A   | B   | C   | D   | Notas |
| ----------- | ------- | --------------------- | --- | --- | --- | --- | ----- |
|             |         |                       |     |     |     |     |       |
|             |         |                       |     |     |     |     |       |

Marcar cada bloque como ✓ o con el número del paso que falló.
