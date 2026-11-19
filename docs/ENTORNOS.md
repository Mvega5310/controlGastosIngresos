# Entornos: producción y staging

Dos copias de la aplicación, aisladas entre sí. La regla de fondo: **nada llega a
producción por accidente**. Para que llegue hay que hacer algo deliberado y
autorizado por separado.

## Cuál es cuál

|                     | Producción                                       | Staging                                               |
| ------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| Proyecto de Railway | `fincontrol`                                     | `fincontrol-staging`                                  |
| Servicio            | `fincontrol-web`                                 | `fincontrol-staging-web`                              |
| Rama que despliega  | `produccion`                                     | `feat/espacio-empresa`                                |
| Dirección           | https://fincontrol-web-production.up.railway.app | https://fincontrol-staging-web-staging.up.railway.app |
| Supabase            | **sí**: datos reales                             | **no**: modo local, no puede tocar datos reales       |
| `ENTORNO`           | sin definir                                      | `staging`                                             |
| Se instala como     | «FinControl»                                     | «FinControl · pruebas»                                |
| Indexable           | sí                                               | no (`X-Robots-Tag` y `robots.txt`)                    |

Cada servicio despliega solo su rama, automáticamente, en cuanto se sube algo a
ella. **Por eso subir a `produccion` es desplegar a producción**, y subir a
cualquier otra rama no lo es.

`claude/quirky-mayer-3caadd` fue la rama de producción hasta el 15 de noviembre de 2026. Ahora es una rama de trabajo más: **ya no despliega nada**. `produccion` es
la única rama que alcanza a los usuarios, y casi nadie sube a ella a diario.

## Por qué un proyecto aparte y no otro servicio

Con proyectos distintos los identificadores, los dominios y las variables no se
comparten: una variable puesta en el sitio equivocado, o un `redeploy` lanzado
por el identificador equivocado, no puede alcanzar a producción. Con dos servicios
en el mismo proyecto, sí.

## Por qué el staging no tiene Supabase

Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` se incrustan al
compilar. Sin ellas, la aplicación arranca en modo local y el paquete de
Supabase ni entra en la compilación. Si el staging apuntara al mismo Supabase
que producción, probar con «Cargar ejemplos» subiría datos de ejemplo a tu
cuenta real, y «Borrar todo» podría borrar los reales.

**Consecuencia:** en staging no se puede probar el acceso (correo, contraseña,
sincronización). Si hace falta probarlo en dispositivos, lo correcto es un
**segundo proyecto de Supabase solo para pruebas** (gratuito), con su propia URL
y clave puestas en el servicio de staging, y su `Site URL` apuntando al staging.
Nunca reutilizar el de producción.

## Reglas

1. **Producción solo cambia moviendo `produccion`**, y solo con una autorización
   explícita y aparte. Es el único acto que despliega a producción.
2. El trabajo vive en `feat/espacio-empresa` (desde el 19 de noviembre de 2026; antes, `feat/redisenio-movil`). Subir ahí despliega solo el staging.
3. `claude/quirky-mayer-3caadd` ya no está conectada a ningún servicio: producción
   sigue `produccion` y el staging `feat/espacio-empresa` (comprobado en la
   configuración de ambos, no empujando a ella). Aun así, hasta que se vea en un
   despliegue real, conviene no usarla para probar eso.
4. Antes de promover: la prueba en dispositivos reales
   (`docs/PRUEBA-EN-DISPOSITIVOS.md`) completa y sus fallos corregidos.
5. Un despliegue de producción puede revertirse en Railway con un clic
   (`rollback` sobre el despliegue anterior), pero los usuarios ya habrían visto
   la versión nueva y la caché del service worker ya se habría actualizado.

## Cómo se lanza a producción (cuando se autorice)

1. Revisar `git log produccion..feat/espacio-empresa` y la prueba en dispositivos.
2. Autorización explícita y por separado.
3. Mover `produccion` al commit aprobado:
   `git push origin <commit>:produccion`. Si la rama ha avanzado, el push
   normal rechaza lo que no sea un avance limpio, que es lo que se quiere.
4. Railway despliega solo; comprobar el despliegue y que el service worker pasa a
   `fincontrol-v3`.

## Qué se hizo para que no se despliegue por accidente

Hasta el 15 de noviembre de 2026 producción desplegaba `claude/quirky-mayer-3caadd`,
una rama en la que se sube a diario, así que la única barrera entre un push y los
usuarios era la disciplina. Ahora el servicio `fincontrol-web` sigue `produccion`.

Railway no ofrece, que se haya podido comprobar, un ajuste de «aprobación
manual» para los push de GitHub. Lo que sí hay, y no se ha activado, es
desactivar los despliegues automáticos o esperar a las comprobaciones de CI; la
rama dedicada resuelve el problema sin depender de ellos y se puede verificar
con `describe-service` (campo `source.branch`).

## Variables y secretos

- El token de gestión de Supabase (`api.supabase.com`) que se guardó para
  configurar el proyecto sigue almacenado como secreto del entorno de trabajo.
  Ya cumplió su función: conviene **revocarlo** en Supabase → Account → Access
  Tokens.
- Ninguna clave se versiona. `.env` está ignorado por git; en Railway las
  variables viven en el servicio.

## Registro de lanzamientos

| Fecha       | Commit    | Despliegue | Qué fue                                                                                | Cómo volver atrás                                                           |
| ----------- | --------- | ---------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| 17 nov 2026 | `a3d74b8` | `bddb37d5` | Rediseño móvil completo: tarjetas, navegación, contraste AA, orientación libre, PWA v3 | Railway → `fincontrol-web` → despliegue `86004ec1` (`1de3287`) → _Rollback_ |
| 15 nov 2026 | `1de3287` | `86004ec1` | Producción pasa a la rama `produccion` (mismo código)                                  | —                                                                           |

Verificado tras el lanzamiento, sobre la dirección real: HTTP 200, service worker
`fincontrol-v3`, nombre «FinControl — Finanzas personales», manifiesto sin
orientación fija, sin `X-Robots-Tag`, Supabase incluido; el guardián responsive
(11 formatos × 12 secciones) y la prueba de PWA sin conexión pasan, y el panel de
cuenta ofrece entrar y crear cuenta.

**No verificado:** iOS Safari y Chrome Android reales, ni el envío real del
correo de acceso (solo se puede probar con una persona y una bandeja de entrada).

Un _rollback_ en Railway devuelve el servicio al despliegue anterior, pero los
navegadores que ya hayan descargado la versión nueva conservan su caché
`fincontrol-v3` hasta que el service worker antiguo la sustituya; por eso, si hay
que volver atrás, conviene subir la caché a `v4` en el commit de reversión en
lugar de limitarse a un rollback.
