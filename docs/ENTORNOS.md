# Entornos: producción y staging

Dos copias de la aplicación, aisladas entre sí. La regla de fondo: **nada llega a
producción por accidente**. Para que llegue hay que hacer algo deliberado y
autorizado por separado.

## Cuál es cuál

|                     | Producción                                       | Staging                                               |
| ------------------- | ------------------------------------------------ | ----------------------------------------------------- |
| Proyecto de Railway | `fincontrol`                                     | `fincontrol-staging`                                  |
| Servicio            | `fincontrol-web`                                 | `fincontrol-staging-web`                              |
| Rama que despliega  | `claude/quirky-mayer-3caadd`                     | `feat/redisenio-movil`                                |
| Dirección           | https://fincontrol-web-production.up.railway.app | https://fincontrol-staging-web-staging.up.railway.app |
| Supabase            | **sí**: datos reales                             | **no**: modo local, no puede tocar datos reales       |
| `ENTORNO`           | sin definir                                      | `staging`                                             |
| Se instala como     | «FinControl»                                     | «FinControl · pruebas»                                |
| Indexable           | sí                                               | no (`X-Robots-Tag` y `robots.txt`)                    |

Cada servicio despliega solo su rama, automáticamente, en cuanto se sube algo a
ella. **Por eso subir a `claude/quirky-mayer-3caadd` es desplegar a producción.**

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

1. **No se sube nada a `claude/quirky-mayer-3caadd`** sin una autorización
   explícita, aparte, para desplegar a producción.
2. El trabajo vive en `feat/redisenio-movil`. Subir ahí despliega solo el staging.
3. Antes de promover: la prueba en dispositivos reales
   (`docs/PRUEBA-EN-DISPOSITIVOS.md`) completa y sus fallos corregidos.
4. Un push a la rama de producción puede revertirse en Railway con un clic
   (`rollback` sobre el despliegue anterior), pero los usuarios ya habrían visto
   la versión nueva y la caché del service worker ya se habría actualizado.

## Cómo se promueve a producción (cuando se autorice)

1. Revisar `git log 1de3287..feat/redisenio-movil` y la prueba en dispositivos.
2. Autorización explícita y por separado.
3. Llevar los commits a `claude/quirky-mayer-3caadd` (fusión o pull request).
4. Railway despliega solo; comprobar el despliegue y que el service worker pasa a
   `fincontrol-v3`.

## Protección adicional posible (no aplicada)

Hoy la única barrera entre un push y producción es la disciplina. Si se quiere
una barrera técnica, hay dos opciones que tocan la configuración de producción y
por eso no se han aplicado sin pedirlo:

- Que producción despliegue una rama dedicada (por ejemplo `produccion`) en la
  que nadie sube a diario, en lugar de `claude/quirky-mayer-3caadd`.
- Activar en Railway la aprobación manual de despliegues del entorno de
  producción, de modo que cada push espere un visto bueno.

## Variables y secretos

- El token de gestión de Supabase (`api.supabase.com`) que se guardó para
  configurar el proyecto sigue almacenado como secreto del entorno de trabajo.
  Ya cumplió su función: conviene **revocarlo** en Supabase → Account → Access
  Tokens.
- Ninguna clave se versiona. `.env` está ignorado por git; en Railway las
  variables viven en el servicio.
