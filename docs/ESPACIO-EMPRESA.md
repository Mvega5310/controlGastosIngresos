# Espacio de la empresa

Rama de trabajo: `feat/espacio-empresa`. No despliega nada: el staging sigue
`feat/redisenio-movil` y producción, `produccion`. Para probarla en un
dispositivo hay que apuntar el staging a esta rama (solo el staging), y para que
llegue a producción hay que autorizarlo aparte y mover `produccion`.

## Para qué

Llevar los registros del proyecto de la empresa (inversión, equipos, nómina,
mercadeo, trámites) con sincronización en la nube, **sin mezclarlos con las
finanzas personales**. Parte del formato del SENA «Herramienta CREAR 2026»,
que sirve para planear; la aplicación añade lo que le falta: registrar lo que se
gasta de verdad y compararlo con lo planeado.

## Decisiones tomadas

1. **Misma aplicación, dos espacios separados** (Personal y Empresa). Cada uno
   tiene sus propias cuentas y movimientos; cambiar de espacio cambia el juego de
   datos, no un filtro.
2. **Lo usarán también los socios de la parte financiera.** Obliga a un modelo de
   espacios compartidos (fase 4), que sí cambia el esquema de Supabase.
3. **La aplicación calcula el costo de cada cargo** con el factor prestacional del
   formato y el salario mínimo vigente.
4. **Guardar facturas y soportes**, lo más sencillo primero y luego escalar.

## Cómo está hecho

- `src/core/espacios.ts`: tipo `Espacio` y `nombreRemoto`. El personal conserva
  los nombres de colección de siempre; lo de la empresa viaja como
  `empresa:<colección>`. Con eso **no hay cambio de esquema** y una versión
  anterior de la aplicación (producción) simplemente no ve esas filas.
- Almacenamiento local aparte: claves `fc-emp-*`. «Borrar todo» y «Cargar
  ejemplos» actúan solo sobre el espacio abierto.
- La sincronización recorre los dos espacios a la vez, esté cuál esté a la vista.
- `src/core/nomina.ts`: costo de cada cargo. Puro y probado contra las cifras que
  calcula el propio formato (35.364.320 al mes; 424.371.840 en 12 meses).

## Nómina

- Factor prestacional del formato: 53,76 % (salud 8,5, pensión 12, ARL 2,44,
  cesantías 8,33, intereses 1, prima 8,33, vacaciones 4,16, parafiscales 9). Todos
  editables.
- Se aplica a los contratos laborales; **prestación de servicios no lleva
  prestaciones**. Se puede forzar cargo por cargo.
- Los importes son enteros en centavos y los porcentajes, en puntos base, para
  que el total no se desvíe por redondeo.
- **Auxilio de transporte.** Por ley lo tiene quien es laboral y gana hasta dos
  salarios mínimos. El formato no lo incluye. Aquí es un interruptor: apagado, el
  costo coincide con el del formato y la pantalla avisa de lo que sumaría. El
  valor del auxilio (24.909.500 centavos = $249.095) **debe confirmarse en el
  decreto vigente**; el salario mínimo ($1.750.905) es el de la hoja «Topes Montos».
- «Registrar pago» crea un gasto en el rubro «Pago de salarios u honorarios» con
  una marca de origen (`nomina:<cargo>:<AAAA-MM>`), así no se registra dos veces.

### Un cruce que conviene revisar en el formato

Las prestaciones de los dos empleados con contrato laboral, con el factor del
propio formato, suman **$3.064.320 al mes**. El plan operativo destina **$2.450.000
al mes** a ese concepto (fila 435 de la hoja «Proyecto»). La diferencia es de
$614.320 al mes, unos $5,5 M en 9 meses.

## Plan por rubro

Equivale a la sección 15 del formato («Plan operativo»): el valor solicitado
repartido por rubro y por mes.

- **Datos del proyecto:** valor solicitado, mes de inicio y meses del plan (9 en el
  formato). El mes de inicio ancla «Mes 1…» a meses reales, que es lo que permite
  compararlos con lo gastado.
- **Planeado frente a gastado**, por rubro y mes. Los pagos de nómina caen solos en
  «Pago de salarios u honorarios». Solo cuentan los gastos: ni ingresos ni traslados.
- **El plan debe sumar el valor solicitado**, como exige el formato; la pantalla dice
  cuánto falta o sobra.
- **Topes** del formato: muebles y vehículos 15 %, adecuaciones estructurales 20 %,
  técnicas 50 %, tasas de propiedad intelectual 20 %, medidos sobre el valor
  solicitado. Se marca el rubro que los pasa. No son editables: son una regla del fondo.
- Los gastos de meses fuera del plan se anotan aparte; los de un rubro sin plan se avisan.
- Probado con el plan del formato: suma 508.000.000, el mes 1 suma 117.176.800 y los
  pesos de los rubros con tope (10,04 %, 2,36 %, 1,97 %, 0,59 %) coinciden con su
  columna «Registrado».

### Dos decisiones de diseño

- **Cada celda rubro × mes tiene un identificador fijo** (`plan-<mes>-<rubro>`). Si
  dos dispositivos escriben la misma celda, es el mismo registro y gana el último;
  con identificadores nuevos quedarían dos registros que sumarían el doble. Una
  celda no se borra: un cero es un registro con importe cero.
- **`fijarRegistro`** (en `core/sincronizacion.ts`) crea o actualiza un registro de
  identificador conocido y **revive uno borrado**. Antes, guardar parámetros tras
  «Borrar todo» creaba otro registro con el mismo identificador junto al borrado, y
  al fusionar ganaba el borrado: lo recién guardado desaparecía. Corregido también
  en los parámetros de nómina y cubierto por pruebas y por la revisión de
  sincronización.

## Compras, mercadeo y trámites

Tres listas que parten de las secciones 7, 8 y 12 del formato, y que alimentan el plan.

- **Compras** (las «inversiones fijas» del formato): qué se compra, rubro, cantidad,
  valor unitario, proveedor, estado (por cotizar, cotizado, comprado) y mes del plan.
  «Registrar compra» crea el gasto real con lo que se pagó de verdad, que puede ser
  distinto de lo planeado.
- **Mercadeo:** las acciones de comunicación, promoción y distribución. El fondo
  exige cumplir un número de «eventos de mercadeo», que el formato cuenta como las
  acciones descritas (7 en el ejemplo); aquí se ve cuántas van realizadas y cuáles
  no tienen evidencia. El gasto cae en «Publicidad y comunicación».
- **Trámites:** costo, días que toma, fecha de inicio y fecha estimada de
  finalización, con aviso de los atrasados. **La constitución legal es un rubro no
  financiable** (la asume el emprendedor) y no entra al plan.
- **Un gasto registrado no se puede registrar dos veces:** lleva una marca de origen
  (`compra:<id>`, `mercadeo:<id>`, `tramite:<id>`, `nomina:<cargo>:<mes>`), y la
  marca viaja con el movimiento, así que otro dispositivo tampoco lo ofrece de nuevo.

### Llenar el plan desde las listas

Cada compra, acción y trámite tiene un mes del plan. En «Plan por rubro» aparece lo
que suman las listas por rubro y mes, con un botón para completar las casillas:

- Solo toca las casillas donde las listas tienen algo que poner; las demás se dejan.
- Si va a **sustituir un importe distinto que ya estaba escrito**, pregunta antes.
- Lo que no tiene mes del plan (o lo tiene fuera de los meses del plan) no se puede
  repartir: se avisa, no se esconde.

Verificado con las cifras del formato: 133.050.000 de inversiones (equipos 60,05 M,
muebles y arriendo 51 M, adecuaciones 12 M y 10 M), 7 eventos de mercadeo que suman
56.200.000, y 3.000.000 de permisos.

## Avisos de la empresa

La campana del espacio de la empresa avisa de lo que sale de los datos del proyecto:

- **Trámites** que pasaron su fecha estimada (vencido) o están a una semana o menos.
- **Nómina del mes** sin registrar, desde cinco días antes de fin de mes.
- **Rubros** que pasan su tope, que gastaron más de lo planeado o que gastan sin plan.
- **El plan** no suma el valor solicitado (falta o sobra).
- **Compras** sin mes del plan, y **mercadeo** realizado sin evidencia.

Los avisos ya vistos se guardan **por espacio**: al abrir la campana se olvidan los
vistos que ya no existen, y con una lista compartida mirar un espacio haría olvidar
los del otro.

## Estado de la sincronización

Funciona en producción: iniciar sesión, subir y bajar entre dispositivos, cada 2
minutos, al volver a la pestaña, al recuperar la conexión y con el botón.

**Subida rápida (en esta rama, aún no en producción).** Lo guardado sale a los 3
segundos, y al ocultar o cerrar la pestaña sale en seguida. La vuelta rápida solo
recorre las colecciones con algo pendiente y no enseña «sincronizando», para que
el icono no parpadee en cada guardado. Sin conexión no se intenta: queda en la
cola local y sale al volver. El plazo de 3 segundos lo fija el primer cambio y no
se reinicia con cada tecla, para que quien escribe sin parar no deje de subir
nunca. Al ocultar o cerrar, el navegador no garantiza que la petición termine; lo
que no salga queda en la cola local y sale la próxima vez que se abra.

**Dos defectos que esto sacó a la luz, ya corregidos:**

- **Una sincronización pisaba lo guardado mientras ella corría.** Leía las
  colecciones al empezar y, al terminar, escribía ese resultado encima de lo que
  hubiera: lo escrito mientras el servidor contestaba desaparecía, con su marca de
  pendiente. Era una ventana rara con un ciclo cada 2 minutos, y habría sido
  frecuente subiendo a los 3 segundos. Ahora, al terminar, se parte de lo guardado
  en ese instante (`reconciliarTrasSync`): gana la versión más reciente y siguen
  pendientes los registros escritos o modificados durante la vuelta.
- **El almacenamiento se escribía en un efecto, después de pintar.** Ahora cada
  guardado lo escribe en el acto, y el estado de React es solo su reflejo. Así una
  sincronización no puede leer lo guardado sin el cambio recién hecho ni escribir
  un estado viejo encima de lo que bajó del servidor.
- **La hora del servidor, que fija el corte de la siguiente vuelta, se pedía
  después de leer.** Lo que otro dispositivo escribiera en ese intervalo quedaba
  con una marca anterior al corte sin haber llegado: no se bajaba nunca. Ahora se
  pide antes de leer; como mucho, vuelve a bajar lo ya recibido, y la fusión es
  idempotente.

La revisión de dos dispositivos reproduce la escritura durante una vuelta con un
servidor lento. Se comprobó con una mutación: sin la reconciliación la prueba falla.

**Aún no está en producción:** la corrección `e36d174` (los datos guardados antes
de que existiera la sincronización no se subían), la subida rápida y todo el
espacio de la empresa. La sincronización de la empresa solo se ha probado contra
un Supabase de mentira, nunca contra el real: el staging no tiene Supabase.

**Límites del diseño actual:**

- No hay envío en tiempo real: el otro dispositivo se entera en su siguiente ciclo
  (hasta 2 minutos) o al volver a su pestaña.
- Gana la última escritura **de todo el registro**, comparando la hora del
  dispositivo. Un reloj mal puesto puede ganar cuando no debe.
- Los borrados dejan una marca que nunca se limpia (`purgar` existe y no se usa).
- Los adjuntos (facturas) no existen todavía.
- Compartir con socios exige tablas nuevas y permisos por pertenencia (fase 6).

## Hoja de ruta

| Fase | Contenido                                                                  | Estado    |
| ---- | -------------------------------------------------------------------------- | --------- |
| 1    | Espacios separados, selector, sincronización de ambos, **nómina**          | hecha     |
| 2    | Rubros con tope y plan operativo por mes (planeado frente a ejecutado)     | hecha     |
| 3    | Compras de equipos (cotizado / comprado, proveedor), mercadeo, trámites    | hecha     |
| 4    | Facturas y soportes (foto o PDF) en almacenamiento de Supabase             | pendiente |
| 5    | Importador del formato del SENA y exportación para el informe de ejecución | pendiente |
| 6    | Espacio compartido con socios: miembros, roles y permisos                  | pendiente |

### Fase 6: lo que exige

Hoy cada fila de `registros` pertenece a un usuario y la seguridad (RLS) se
decide por `usuario_id`. Compartir un espacio pide tablas nuevas (espacios,
miembros con rol, y registros por espacio) con políticas por pertenencia, y las
ejecuta una persona en el editor SQL de Supabase. Además, la sincronización
resuelve conflictos por «gana la última escritura» por registro, que basta cuando
cada persona edita lo suyo, pero no es edición simultánea sobre el mismo dato.
Conviene decidir roles (por ejemplo, gerente edita, contadora edita, socio solo
lee) antes de escribir el SQL.

## Cómo probarlo

```bash
npm run verificar               # formato, lint, pruebas y compilación
npm run revision:sincronizacion # dos dispositivos contra un Supabase de mentira
npm run revision:responsive     # 11 tamaños × 23 secciones
```

Para las revisiones locales **no** hay que definir `REVISION_PROXY`: salir por el
proxy hace que el navegador no encuentre el servidor local.
