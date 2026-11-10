# Bahía Command

Centro de control privado del súper administrador. Solo entra el correo en `ADMIN_EMAILS`, con Google.

Muestra en un solo lugar, actualizado cada 60 segundos:

- **Ingresos reales (Stripe):** hoy, 7 días, mes, saldo, meta mensual, ventas por día y pagos recientes (incluye fallidos).
- **Prospectos de Bahía Systems:** nuevos, abiertos, bajas y potencial mensual.
- **Operación de Atalaya:** registros de las últimas 24 h por tabla, sin depender del esquema.
- **Despliegues de Vercel:** estado del último despliegue de cada proyecto.

Es de solo lectura: no cambia datos en ningún sistema.

## Puesta en marcha

1. **Repositorio privado.** En GitHub crea `bahia-command` como **Private**. Descomprime esta carpeta, y en PowerShell:
   ```
   cd $HOME\Documents\bahia-command
   git init; git add -A; git commit -m "Bahía Command"
   git branch -M main
   git remote add origin https://github.com/nightsyrc/bahia-command.git
   git push -u origin main
   ```
2. **Vercel.** Add New → Project → importa `bahia-command`. Antes de desplegar, agrega las variables de `.env.example`.
3. **Google.** console.cloud.google.com → APIs & Services → Credentials → Create OAuth client ID → Web application.
   Redirect URI: `https://TU-DOMINIO/api/auth/callback/google`. Copia el Client ID y el Secret a Vercel.
4. **Stripe.** Dashboard → Developers → API keys → Create restricted key, llamada `bahia-command`, con **Read** en
   Charges, Balance y Checkout Sessions. El resto en None. Pégala como `STRIPE_READ_KEY`.
5. **Neon (en cada base: Atalaya y Bahía).** En el SQL Editor crea un usuario de solo lectura:
   ```sql
   CREATE ROLE command_ro WITH LOGIN PASSWORD 'una-clave-larga';
   GRANT USAGE ON SCHEMA public TO command_ro;
   GRANT SELECT ON ALL TABLES IN SCHEMA public TO command_ro;
   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO command_ro;
   ```
   Arma la URL con ese usuario y pégala en `ATALAYA_DATABASE_URL` y `BAHIA_DATABASE_URL`.
6. **Vercel token.** vercel.com/account/tokens → Create, con acceso a tu equipo. `VERCEL_TEAM_ID` está en Team Settings.
7. **NEXTAUTH_SECRET.** En PowerShell: `[Convert]::ToBase64String((1..32 | % {Get-Random -Max 256}))`.
8. Despliega, abre el dominio, entra con Google. Si una sección dice "Sin conectar", falta esa variable.

## Seguridad

- El acceso exige correo verificado de Google **y** que esté en `ADMIN_EMAILS`; cada página lo vuelve a comprobar.
- Usa llaves de solo lectura. Si una se filtra, nadie puede mover dinero ni borrar datos con ella.
- El sitio no se indexa en buscadores.
