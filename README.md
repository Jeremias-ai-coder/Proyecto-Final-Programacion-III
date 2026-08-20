# Turnos_ya - Backend RESTful API

API RESTful para la plataforma de gestión y reserva de turnos en línea **Turnos_ya**. Este módulo gestiona la autenticación de usuarios, administración de comercios, servicios, horarios de atención, reservas de turnos con sistema de *hold* (bloqueo temporal) y webhooks para notificaciones.

---

## 🛠️ Stack Tecnológico

- **Entorno de Ejecución**: [Node.js](https://nodejs.org/) (v20+)
- **Lenguaje**: [TypeScript](https://www.typescriptlang.org/) (v5.1+)
- **Framework Web**: [Express.js](https://expressjs.com/) (v4.18)
- **ORM / BD**: [Prisma ORM](https://www.prisma.io/) (v5.0) conectado a **MySQL**
- **Autenticación y Seguridad**: [JSON Web Tokens (JWT)](https://jwt.io/), [bcrypt](https://www.npmjs.com/package/bcrypt), [Helmet](https://helmetjs.github.io/), [CORS](https://www.npmjs.com/package/cors)
- **Validación de Datos**: [Zod](https://zod.dev/)
- **Ejecución en Desarrollo**: `tsx` (TypeScript Execute / Watch).

---

## 📁 Estructura del Proyecto

```text
Turnos_ya_backend-api-main/
├── prisma/
│   └── schema.prisma        # Modelo de datos Prisma (User, Business, Service, Schedule, Appointment)
├── src/
│   ├── controllers/         # Lógica de procesamiento de peticiones HTTP
│   │   ├── appointment.controller.ts  # Creación, reserva, cancelación y gestión de turnos
│   │   ├── auth.controller.ts         # Registro, inicio de sesión y perfil de usuario
│   │   ├── business.controller.ts     # Alta, edición y consulta de comercios
│   │   ├── schedule.controller.ts     # Configuración de horarios de atención
│   │   └── service.controller.ts      # Gestión de servicios ofrecidos por comercio
│   ├── middlewares/         # Middlewares de Express
│   │   ├── authGuard.ts               # Verificación de JWT y roles (client, owner, administrator)
│   │   └── errorHandler.ts            # Captura centralizada de errores (RFC 7807)
│   ├── routes/              # Declaración de endpoints REST
│   │   ├── admin.routes.ts            # Rutas de administración global
│   │   ├── appointment.routes.ts      # Rutas de turnos y reservas
│   │   ├── auth.routes.ts             # Rutas de autenticación
│   │   └── business.routes.ts         # Rutas de comercios, servicios y horarios
│   ├── services/            # Servicios transversales e integraciones
│   │   └── webhook.service.ts         # Despacho de eventos vía webhooks
│   ├── validators/          # Schemas de validación Zod para payloads
│   │   ├── appointment.validator.ts
│   │   ├── auth.validator.ts
│   │   ├── business.validator.ts
│   │   ├── schedule.validator.ts
│   │   └── service.validator.ts
│   └── server.ts            # Punto de entrada de la aplicación Express
├── _legacy_php/             # Código histórico en PHP (referencia del backend previo)
├── check-db.ts              # Script para verificar conexión a la base de datos
├── grant-admin.ts           # Script para asignar rol administrador a un usuario
├── seed.ts                  # Script de sembrado inicial de datos
├── package.json             # Dependencias y scripts de ejecución
└── tsconfig.json            # Configuración del compilador TypeScript
```

---

## ⚙️ Funcionalidades y Módulos Principales

### 1. Autenticación y Usuarios (`auth`)
- **Registro e Inicio de Sesión**: Generación de tokens JWT con hashing de contraseñas mediante `bcrypt`.
- **Control de Acceso Basado en Roles (RBAC)**: Roles de `client` (cliente que reserva), `owner` (dueño de comercio) y `administrator` (administrador del sistema).

### 2. Gestión de Comercios (`business`)
- **Alta y Perfil de Comercios**: Configuración de nombre, categoría, dirección, coordenadas geográficas (latitud/longitud), teléfono y logo.
- **Configuración de Webhooks**: Endpoint configurable por comercio para recepcionar eventos de reservas.

### 3. Servicios y Horarios (`service` & `schedule`)
- **Catálogo de Servicios**: Definición de duración en minutos, precio, tiempos de colchón (*buffer time*) y políticas de cancelación/reprogramación.
- **Matriz de Horarios**: Horarios de apertura y cierre por día de la semana (`dayOfWeek`, `startTime`, `endTime`).

### 4. Sistema de Reservas y Hold (`appointment`)
- **Reserva Temporal (Hold Token)**: Bloqueo de turnos durante el proceso de pago/confirmación para evitar colisiones.
- **Gestión de Estados**: Ciclo de vida del turno (`PENDING`, `CONFIRMED`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`, `NO_SHOW`).
- **Cancelaciones**: Registro de motivo y usuario solicitante de cancelación.

### 5. Administración del Sistema (`admin`)
- **Panel de Control Global**: Aprobación de servicios, suspensión de comercios y gestión avanzada de usuarios.

---

## 🚀 Comandos de Ejecución

1. **Instalar dependencias**:
   ```bash
   npm install
   ```

2. **Configurar variables de entorno**:
   Crear un archivo `.env` basado en la plantilla:
   ```env
   DATABASE_URL="mysql://usuario:password@localhost:3306/turnos_ya"
   JWT_SECRET="tu_clave_secreta_super_segura"
   PORT=3000
   ```

3. **Ejecutar migraciones de Prisma**:
   ```bash
   npm run db:push
   ```

4. **Iniciar en modo desarrollo**:
   ```bash
   npm run dev
   ```

5. **Compilar y ejecutar en producción**:
   ```bash
   npm run build
   npm start
   ```
