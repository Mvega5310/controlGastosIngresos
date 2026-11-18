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

## Hoja de ruta

| Fase | Contenido                                                                  | Estado    |
| ---- | -------------------------------------------------------------------------- | --------- |
| 1    | Espacios separados, selector, sincronización de ambos, **nómina**          | hecha     |
| 2    | Rubros con tope y plan operativo por mes (planeado frente a ejecutado)     | pendiente |
| 3    | Compras de equipos (cotizado / comprado, proveedor), mercadeo, trámites    | pendiente |
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
npm run revision:responsive     # 11 tamaños × 19 secciones
```

Para las revisiones locales **no** hay que definir `REVISION_PROXY`: salir por el
proxy hace que el navegador no encuentre el servidor local.
