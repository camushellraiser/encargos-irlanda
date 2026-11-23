# TravelSpend 2.0 + Encargos de Irlanda — guía de activación

**Qué está hecho:** Dos aplicaciones móviles independientes, almacenamiento de compras y fotos en Supabase, permisos por cuenta, checklist compartido, compras, devoluciones, abonos y lectura OCR de tickets. **Qué requiere tu acción:** crear Supabase y las dos cuentas, instalar el SQL y publicar el repositorio exclusivo de Irlanda. Estas acciones requieren tu acceso a las plataformas; no se pueden completar desde un HTML.

## 0. Lo que ya está en GitHub

- Tu TravelSpend personal: `https://camushellraiser.github.io/plex-tools/travelspend/`. Se actualiza en el repositorio `camushellraiser/plex-tools`, archivo `travelspend/index.html`.
- La aplicación de Irlanda ya está subida al repositorio independiente `camushellraiser/encargos-irlanda`. La URL prevista tras activar Pages será `https://camushellraiser.github.io/encargos-irlanda/`.
- **La aplicación de Irlanda NO tiene ningún enlace o indicación de que existe tu TravelSpend personal.** Tú sí tendrás un acceso rápido a Irlanda desde Ajustes de TravelSpend cuando la publiques.
- **La privacidad se protege con permisos SQL**, no por la URL ni por esconder botones. Ningún cliente recibe `service_role` ni credenciales de administrador.

## 1. Crea un proyecto Supabase

1. Entra en <https://supabase.com/dashboard> e inicia sesión.
2. Crea un proyecto nuevo, p. ej. `san-diego-2026`. Puedes empezar con el plan gratuito, sujeto a límites, actividad del proyecto y posibles pausas por inactividad.
3. Ve a **Project Settings → API** (en algunas versiones: **Connect / API Keys**) y copia **Project URL** (`https://xxxxxxxx.supabase.co`) y la clave **publishable** (`sb_publishable_...`) o, si usas el formato anterior, la clave pública `anon`.
4. **No utilices ni compartas la clave `service_role` o `secret` en la aplicación, en GitHub, por WhatsApp o en archivos públicos.**

## 2. Crea las cuentas

En **Authentication → Users**, usa **Add user / Create user** para crear dos usuarios *distintos* con correo y contraseña:

- Tu cuenta: administrador de ambas aplicaciones.
- Irlanda: editará su lista, verá compras, comprobantes y abonos; no podrá registrar precios ni abonos.

Si el panel permite confirmar automáticamente las cuentas, confírmalas; alternativamente, completa la verificación por correo. **No publiques ni compartas tu contraseña.** A Irlanda entrégale únicamente la URL de su propia app y su método de acceso.

En **Authentication → Providers → Email**, asegúrate de tener habilitado el ingreso mediante **correo/contraseña**. No desactives controles de seguridad como la verificación de correo sin necesidad.

## 3. Instala la base y los permisos

1. En Supabase abre **SQL Editor → New query**.
2. Copia entero `backend/setup.sql`, pégalo en el editor y pulsa **Run**. Este script crea tablas, políticas de acceso RLS y el bucket **privado** `travelspend-files`. No actives un bucket público.
3. Abre `backend/assign-users.sql`; cambia **solamente** `PON_AQUI_TU_CORREO` y `PON_AQUI_EL_CORREO_DE_IRLANDA` por los correos de las cuentas creadas; ejecuta el contenido en SQL Editor.
4. La consulta final debe regresar **exactamente dos filas**, `owner` y `irlanda`, con sus respectivos correos. Si devuelve menos, revisa que los usuarios ya existan en Authentication. Nunca continúes dando acceso a Irlanda sin comprobar esta asignación.
5. En **Database → Publications** comprueba que `supabase_realtime` incluya `irlanda_wishlist`, `irlanda_purchases`, `irlanda_payments` y `trip_attachments`; el SQL intenta agregarlas automáticamente.
6. En **Storage → Buckets**, comprueba que `travelspend-files` indique **Private**. Nunca lo conviertas en público.

Los gastos privados se almacenan en `personal_expenses`; los encargos compartidos en `irlanda_wishlist`, `irlanda_purchases`, `irlanda_payments` y `trip_attachments`. Las reglas SQL restringen la lectura por rol. Que una tabla exista no significa que Irlanda tenga permiso para leer sus filas.

## 4. Conecta TravelSpend personal

En GitHub abre tu repositorio `camushellraiser/plex-tools` → `travelspend/index.html` → botón de edición.

Cerca del inicio del JavaScript encontrarás:

```js
window.TRAVELSPEND_SUPABASE_CONFIG = null;
```

Cámbialo por (solo valores de ejemplo, reemplázalos por los reales):

```js
window.TRAVELSPEND_SUPABASE_CONFIG = {
  url: 'https://TU-PROYECTO.supabase.co',
  key: 'sb_publishable_TU_CLAVE_PUBLICA'
};
```

Guarda los cambios con **Commit changes**. No modifiques `window.TRAVELSPEND_FIREBASE_CONFIG = null` si nunca configuraste Firebase: al estar Supabase activado, se usa automáticamente como principal. **No pongas claves secretas**.

Abre Safari en tu iPhone y entra a tu TravelSpend. Inicia sesión **con tu cuenta**, nunca con la de Irlanda. Tus movimientos anteriores locales no se borran por cambiar el código, pero quedan en el almacenamiento local de ese Safari hasta migrarlos.

**Muy importante para no perder gastos anteriores:**

1. **Antes** de activar la nube, abre TravelSpend y exporta **Ajustes → Respaldo JSON**. Guarda el archivo en Archivos/iCloud Drive.
2. Tras iniciar sesión en la versión con Supabase, abre **Ajustes → Subir gastos locales a la nube** para importar los que ya estaban en Safari.
3. Comprueba que el total y la cantidad de movimientos coincidan con tu respaldo. Si no aparecen locales, utiliza **Importar JSON** con el archivo anterior.
4. Las nuevas fotos de los tickets o productos se guardarán en **Storage** y se verán al editar el gasto. En modo local **no se conservan fotos**.
5. El **Respaldo JSON exporta cantidades y conceptos, no los bytes de las fotografías**. Conserva los originales importantes en iCloud o en otro almacenamiento aparte.

## 5. Publica la aplicación de Irlanda sin exponer tu otra app

1. El repositorio público `encargos-irlanda` ya fue creado y poblado con la aplicación.
2. Abre `config.js` del repositorio `encargos-irlanda` desde GitHub y sustituye URL y clave pública de Supabase. Por ejemplo:

```js
window.IRLANDA_SUPABASE = {
  url: 'https://TU-PROYECTO.supabase.co',
  key: 'sb_publishable_TU_CLAVE_PUBLICA'
};
```

3. Los archivos ya están subidos a la raíz del repositorio nuevo; no necesitas subir ningún ZIP. Edita únicamente `config.js` tras crear el proyecto de Supabase.
4. En **Settings → Pages**, establece **Deploy from a branch → `main` → `/ (root)`**. Guarda y comprueba la dirección `https://camushellraiser.github.io/encargos-irlanda/`.
5. Abre la URL en Safari. Tú ingresas con tu usuario administrador; Irlanda con el suyo. Solo comparte **esta URL** con ella. La interfaz no menciona tu app personal.
6. En ambos iPhone, Safari → **Compartir → Agregar a pantalla de inicio**, si les conviene.

Nota sobre privacidad de código: los repositorios públicos de GitHub tienen archivos inspeccionables. Por eso **no debe haber contraseñas, datos reales ni claves secretas en el código**. Los datos privados permanecen en Supabase con RLS. No puede garantizarse que otra persona nunca encuentre un repositorio público asociado a una cuenta GitHub, aunque no existan enlaces entre las apps.

## 6. Pruebas antes de viajar

- **Personal:** entrar con tu usuario, registrar `$1.99` en `Prueba`, adjuntar una foto de ticket, cerrar y volver a abrir Safari y comprobar que persisten movimiento e imagen; después eliminar la prueba.
- **Irlanda – tú:** añadir `Prueba de encargo`, registrar una compra de `$2.00`, adjuntar foto del producto y ticket; registrar un abono de `$1.00` y comprobar saldo por pagar `$1.00`.
- **Irlanda – su cuenta:** iniciar sesión en otro navegador o teléfono y verificar en tiempo real lista, compra, fotos, abono y saldo. Agregar/editar/quitar un encargo de prueba.
- **Permisos:** desde la cuenta de Irlanda, verificar que **no hay botones de modificar compras o abonos**. Aunque alguien alterara la interfaz, el RLS del servidor debe rechazar modificaciones no autorizadas. Comprueba en SQL Editor que la política de `personal_expenses` solo admite `owner`.
- **Datos persistentes:** cerrar sesión y entrar otra vez; los datos reales deben seguir allí. Si ves errores de permisos o fotos que no cargan, no empieces a usarlo para cuentas reales hasta resolverlo.
- **Conexión:** con el iPhone desconectado o mala señal, la app puede no sincronizar. Comprueba el indicador antes de dar una compra por registrada. No prometemos sincronización offline garantizada.

## 7. Dónde queda cada cosa

| Elemento | Destino |
|---|---|
| Tu cantidad, comercio, notas, fecha | `personal_expenses` en Supabase, solo rol `owner` |
| Fotos privadas de tus tickets/productos | Supabase Storage privado → `travelspend-files/personal/...` |
| Lista y fotos de referencia de Irlanda | `irlanda_wishlist` y Storage → `wishlist/...` |
| Compras y fotos de Irlanda | `irlanda_purchases`, `trip_attachments` y Storage → `irlanda/...` |
| Abonos de Irlanda | `irlanda_payments` |
| Tipo de cambio USD/MXN | Frankfurter, consultado automáticamente; última cotización almacenada en el navegador |
| Respaldos CSV / JSON | Se descargan **en tu dispositivo** y NO se suben solos a la nube |

El OCR utiliza Tesseract.js en el navegador para proponer comercio y total. **Siempre confirma**: los tickets pueden tener impuestos, propinas, subtotales, cashback y otros importes. Se pueden adjuntar fotos sin usar OCR. Las fotos se comprimen a JPEG y no se publican en URLs permanentes.

## 8. Archivos del paquete

- `personal/index.html` — copia de la versión actualizada de tu app personal.
- `irlanda/` — proyecto completo que se sube al nuevo repositorio.
- `backend/setup.sql` — modelo de datos + RLS + bucket privado.
- `backend/assign-users.sql` — plantilla para adjudicar roles a las dos cuentas.
- `tests/` — scripts de pruebas locales con servidor simulado; no prueban el Supabase remoto real.

**Limitación honesta:** sin credenciales públicas de tu nuevo Supabase ni las dos cuentas creadas, no es posible probar la persistencia entre dispositivos en producción. Sin un permiso de creación de repositorios, tampoco se puede crear desde esta sesión el repositorio nuevo de Irlanda: por eso se entrega listo para subir.