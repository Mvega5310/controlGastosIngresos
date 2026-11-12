# FinControl — Frontend MVP

Interfaz web responsive para organizar finanzas personales. Construida con React, TypeScript, Vite, Tailwind CSS, Recharts y Lucide.

## Requisitos
- Node.js 20.19+ o 22.12+
- npm
- Visual Studio Code

## Instalación
1. Descomprime `fincontrol-vscode.zip`.
2. Abre la carpeta `fincontrol` en Visual Studio Code.
3. Abre Terminal → New Terminal.
4. Ejecuta:

```bash
npm install
npm run dev
```

5. Abre la dirección local que muestre Vite (normalmente http://localhost:5173).

## Compilar
```bash
npm run build
npm run preview
```

## Qué incluye
- Dashboard con indicadores, flujo de efectivo, cuentas, movimientos recientes y próximos pagos.
- Movimientos con búsqueda, filtros y creación mediante modal.
- Cuentas, calendario, suscripciones, deudas, metas, presupuestos, inversiones, transporte, reportes y ajustes.
- Tema claro/oscuro.
- Diseño responsive: menú lateral en escritorio y navegación inferior en móvil.
- Movimientos guardados en `localStorage` del navegador.

## Estructura
```text
fincontrol/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── README.md
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── index.css
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── StatCard.tsx
    │   └── Modal.tsx
    └── data/
        └── mock.ts
```

## Identidad visual
- Verde principal: `#1E6B3A`
- Verde secundario: `#4CB873`
- Amarillo: `#F2C230`
- Fondo claro: `#F7F8F6`
- Tipografía: Inter / DM Sans
- Bordes redondeados: 8–12 px

## Sincronizar entre dispositivos (opcional)

Sin configurar nada, FinControl funciona entero pero los datos se quedan en el
navegador: no viajan de tu móvil a tu PC. Para que viajen:

1. Crea un proyecto gratuito en https://supabase.com.
2. Abre su **SQL Editor** y ejecuta el contenido de `supabase/esquema.sql`.
3. En **Project Settings → API**, copia la *URL* y la clave *anon public*.
4. Crea un archivo `.env` junto a `package.json` (toma `.env.example` como
   plantilla) con esos dos valores.
5. Vuelve a compilar. Aparecerá un icono de nube en la barra superior para
   crear la cuenta o entrar.

La clave *anon public* está pensada para vivir en el navegador: no da acceso a
nada por sí sola, porque las políticas de la base de datos atan cada fila a su
usuario. La clave *service_role* no debe usarse aquí.

Mientras no configures esto, el icono de la barra indica que los datos están
solo en este dispositivo, y la aplicación no pide ninguna cuenta.

## Importante: alcance de esta entrega
Esta entrega es un **frontend MVP navegable con datos de demostración**, no una fintech lista para producción. Los datos de movimientos se guardan solo en el navegador actual. Cuentas, pagos, suscripciones, deudas, inversiones y vehículos muestran información ficticia de muestra; algunos botones de alta indican que sus formularios se implementarán en la siguiente fase.

Aún no incluye backend Node/Fastify, PostgreSQL/Drizzle, autenticación real, autorización, cifrado, sincronización entre dispositivos, conexión bancaria, notificaciones, pagos automáticos ni despliegue. No ingreses información bancaria real.

## Siguiente fase técnica recomendada
1. Definir API y esquema PostgreSQL/Drizzle.
2. Implementar registro, login, recuperación de contraseña y onboarding.
3. Persistir usuarios, cuentas, categorías y movimientos en backend.
4. Modelar transferencias como dos movimientos relacionados y excluirlas de ingresos/gastos.
5. Congelar la tasa de cambio utilizada en cada movimiento multimoneda.
6. Añadir calendario, suscripciones, recordatorios y pagos idempotentes.
7. Pruebas, auditoría, backups, seguridad y despliegue.
