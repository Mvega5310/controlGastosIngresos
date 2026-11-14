# FinControl

Aplicación de finanzas personales: registra ingresos y gastos, y muestra con
claridad cómo se mueve el dinero. Funciona en el navegador del móvil y del PC
con el mismo código, se instala como aplicación y sigue funcionando sin
conexión.

**En producción:** https://fincontrol-web-production.up.railway.app

## Qué hace

- **Movimientos** — ingresos, gastos y transferencias, con búsqueda y filtros.
  Una transferencia genera dos apuntes atados, de modo que el balance total no
  varía al mover dinero entre cuentas propias, pero cada cuenta sí lo refleja.
- **Panel** — balance, ingresos y gastos del periodo, variación frente al mes
  anterior, gráfica de flujo acumulado, saldos por cuenta y últimos movimientos.
- **Cuentas** — saldo actual de cada una, calculado desde su saldo de partida
  más todo lo registrado en ella.
- **Calendario** — el mes que estés viendo, con un punto en los días que tienen
  movimientos.
- **Presupuestos** — límite por categoría frente al gasto real de ese periodo,
  con aviso al 80 % y al excederse.
- **Suscripciones** — próximo cobro (teniendo en cuenta los meses cortos), gasto
  mensual y anual; se pueden pausar.
- **Deudas** — pendiente, porcentaje pagado, cuotas que faltan y próximo
  vencimiento.
- **Metas de ahorro** — progreso, cuánto falta y días hasta la fecha límite.
- **Inversiones** — rendimiento en dinero y en porcentaje, por activo y del
  conjunto.
- **Transporte** — días hasta el SOAT y la tecnomecánica, con aviso de lo
  vencido y lo que vence pronto.
- **Reportes** — desglose del gasto del periodo por categoría.
- Tema claro y oscuro, que respeta la preferencia del sistema y se recuerda.

## Cómo está construido

React 18, TypeScript y Vite. Recharts para la gráfica y Lucide para los iconos.

El estilo es CSS propio con variables de color: Tailwind está instalado pero
solo aporta su _reset_, no se usa ninguna de sus clases de utilidad.

```text
src/
├── core/        cálculo puro: sin DOM, sin almacenamiento, todo bajo pruebas
│   ├── dinero.ts               importes en enteros y su formato
│   ├── finanzas.ts             periodos, totales, saldos, variaciones
│   ├── planificacion.ts        presupuestos, deudas, metas, vigencias
│   ├── sincronizacion.ts       marcas de tiempo y fusión de versiones
│   └── motorSincronizacion.ts  una vuelta de sincronización
├── datos/       catálogo, entidades, migración y Supabase
├── lib/         hooks y utilidades (almacenamiento, colecciones, fechas)
├── components/  piezas de interfaz reutilizables
├── secciones/   las vistas
└── App.tsx      el armazón: estado compartido y qué sección se muestra
```

Dos reglas que sostienen el resto:

**Ninguna cifra se escribe a mano en una vista.** Todo cálculo vive en `core/`,
en módulos puros con pruebas. Si un número aparece en pantalla, salió de ahí.

**El dinero se guarda en enteros, nunca en coma flotante.** Los importes están
en centavos; la interfaz habla en pesos y la conversión ocurre solo al leer un
formulario y al dar formato.

## Ponerlo en marcha

Necesitas Node.js 20.19 o superior.

```bash
npm install
```

```bash
npm run dev
```

Abre la dirección que muestre Vite, normalmente http://localhost:5173.

### Comandos

| Comando             | Qué hace                                        |
| ------------------- | ----------------------------------------------- |
| `npm run dev`       | Servidor de desarrollo con recarga en caliente  |
| `npm test`          | Las pruebas (126)                               |
| `npm run lint`      | ESLint                                          |
| `npm run format`    | Prettier sobre todo el proyecto                 |
| `npm run build`     | Compila a `dist/`                               |
| `npm start`         | Sirve `dist/` en producción                     |
| `npm run verificar` | Formato, lint, pruebas y compilación de una vez |

## Sincronizar entre dispositivos (opcional)

Sin configurar nada, FinControl funciona entero pero los datos se quedan en el
navegador: no viajan de tu móvil a tu PC. Para que viajen:

1. Crea un proyecto gratuito en https://supabase.com.
2. Abre su **SQL Editor** y ejecuta el contenido de `supabase/esquema.sql`.
3. En **Project Settings → API**, copia la _URL_ y la clave _publishable_.
4. Crea un archivo `.env` junto a `package.json` (toma `.env.example` como
   plantilla) con esos dos valores.
5. En **Authentication → URL Configuration** pon la dirección real de la
   aplicación como _Site URL_, y añade a _Redirect URLs_ tanto esa dirección
   con `/**` al final como `http://localhost:5173/**`. Sin este paso, los
   enlaces de confirmar la cuenta y de recuperar la contraseña vuelven a
   `http://localhost:3000`, que es el valor de fábrica, y acaban en lo que sea
   que tengas escuchando en ese puerto.
6. Vuelve a compilar. Aparecerá un icono de nube en la barra superior para
   crear la cuenta o entrar.

### Formas de entrar

Hay tres, y cada una necesita algo distinto del proyecto de Supabase.

**Código al correo** (lo que se ofrece primero). Se teclean seis cifras y no
interviene ningún enlace, así que es la única que no depende de la
configuración de redirecciones. Para que el correo lleve el código y no un
enlace, hay que añadir `{{ .Token }}` a la plantilla **Magic Link** en
_Authentication → Emails_; la de fábrica solo trae `{{ .ConfirmationURL }}`.
También sirve para entrar en una cuenta cuya contraseña se ha olvidado, y
confirma el correo si estaba pendiente.

**Contraseña.** No necesita nada más. Si se olvida, el enlace de recuperación
sí depende de las redirecciones.

**Google.** El botón aparece solo cuando el proyecto tiene el proveedor
encendido: la aplicación lo pregunta al arrancar el panel, en vez de enseñar un
botón que lleva a un error. Se configura en _Authentication → Sign In /
Providers → Google_, con un cliente OAuth de Google Cloud cuya URI de
redirección autorizada sea `https://<proyecto>.supabase.co/auth/v1/callback`.

Con el servidor de correo de pruebas de Supabase salen dos mensajes por hora,
así que conviene no pedir códigos en ráfaga.

### Confirmación por correo

De fábrica, Supabase exige confirmar el correo antes de dejar entrar, y lo
envía con su servidor de pruebas: un par de mensajes por hora y, en los
proyectos nuevos, solo a las direcciones del equipo del propio proyecto. Para
un uso personal estorba más de lo que protege.

Se desactiva en **Authentication → Sign In / Providers → Email**, quitando
_Confirm email_. A partir de ahí, crear la cuenta deja dentro al momento y no
depende de que llegue ningún correo. Si prefieres dejarlo puesto, configura un
SMTP propio en **Project Settings → Authentication → SMTP Settings**.

Un apunte que desconcierta: registrarse con un correo que **ya tiene cuenta**
no da error. Supabase responde que todo fue bien, pero no crea nada ni cambia
la contraseña, porque decir «ese correo ya existe» permitiría ir probando
direcciones ajenas para averiguar quién tiene cuenta. La aplicación detecta esa
respuesta —viene sin identidades— y lo dice en vez de anunciar un alta que no
ha ocurrido.

La clave pública está pensada para vivir en el navegador: no da acceso a nada
por sí sola, porque las políticas de la base de datos atan cada fila a su
usuario. La clave _service_role_ no debe usarse aquí.

Cuando no hay credenciales configuradas, el paquete de Supabase ni siquiera
entra en la compilación.

### Cómo se resuelven los conflictos

Gana la última escritura, comparando la marca de tiempo de cada registro. Es
suficiente para un uso personal, donde la misma persona edita desde su móvil y
su PC; no valdría para edición concurrente entre varias personas.

Un borrado no desaparece sin más: deja rastro, para que el otro dispositivo se
entere en vez de volver a subirlo como si fuera nuevo.

Hay dos relojes con papeles distintos. El del dispositivo decide qué versión
gana; el del servidor dice qué cambió allí. Lo que falta por subir no se deduce
de ninguno de los dos, sino de una lista de pendientes.

## Qué no hace todavía

- **Una sola moneda.** Todo está en pesos colombianos. El modelo ya guarda los
  importes en enteros, que es el requisito previo, pero falta la moneda por
  movimiento y congelar la tasa de cambio de cada uno.
- **Sin conexión bancaria.** Los movimientos se registran a mano.
- **Inversiones y vehículos se actualizan a mano.** No consulta cotizaciones ni
  organismos de tránsito.
- **Sin notificaciones ni recordatorios.** El calendario y las suscripciones
  muestran los vencimientos, pero no avisan.
- **Sin verificación en dos pasos.** El acceso es correo y contraseña.

## Documentación

- `docs/VALIDACION.md` — la auditoría inicial del proyecto, con los 14 defectos
  que se encontraron y en qué quedó cada uno.
- `supabase/esquema.sql` — el esquema, comentado, incluidas las políticas que
  aíslan los datos de cada usuario.
