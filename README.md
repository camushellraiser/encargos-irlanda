# Encargos de Irlanda

Aplicación móvil independiente para gestionar encargos de San Diego: checklist colaborativo, compras, devoluciones, fotos de productos y tickets, abonos y saldo pendiente. Incluye la firma «AL · Developed by Aldo Lizares».

## Estado actual

El código ya está subido, pero **necesitas conectar un proyecto Supabase para registrar y sincronizar información real**. No incluyas contraseñas ni claves administrativas en GitHub.

## Para activarla

1. Crea un proyecto en https://supabase.com/dashboard y dos usuarios distintos en **Authentication → Users**: el administrador y la cuenta de Irlanda.
2. Ejecuta en **SQL Editor** [backend/setup.sql](backend/setup.sql) y luego [backend/assign-users.sql](backend/assign-users.sql) sustituyendo los dos correos de ejemplo. Verifica que aparecen exactamente los roles `owner` e `irlanda`.
3. Abre [config.js](config.js), cambia `url` por la Project URL y `key` por la clave pública **publishable** (o anon legacy) de Supabase. No uses la clave secret/service_role.
4. En GitHub, entra a **Settings → Pages → Build and deployment**, selecciona **Deploy from a branch → main → / (root)** y guarda.
5. Abre https://camushellraiser.github.io/encargos-irlanda/ en Safari. Inicia sesión y prueba agregar un encargo, compra, ticket y abono. Repite con Irlanda en otra sesión para verificar permisos.

**Privacidad:** los archivos HTML/JS son públicos en GitHub, pero los movimientos y fotografías se protegen mediante reglas RLS y Storage privado en Supabase. No hay enlaces visibles hacia los gastos personales.

[Instrucciones detalladas](INSTRUCCIONES.md)
