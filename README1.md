# Turnos Ya

Proyecto básico para reservar turnos con roles de dueño, administrador y cliente.

## 📂 Estructura del Proyecto y Arquitectura

La arquitectura de la aplicación está diseñada bajo el estándar profesional de desarrollo seguro (separando el punto de acceso público del código fuente principal) de la siguiente manera:

```text
Proyecto Turnos Ya/
├── database/                # Base de Datos y Scripts de Migración
│   ├── schema.sql           # Script de creación de tablas MySQL
│   ├── add_business_staff_table.php
│   ├── add_coordinates_to_businesses.php
│   ├── add_email_notifications_to_users.php
│   ├── add_password_reset_tokens_table.php
│   ├── add_whatsapp_to_users.php
│   ├── create_notifications_table.php
│   ├── update_remember_tokens.php
│   ├── update_schema.php
│   └── update_schema_v2.php
├── public/                  # DocumentRoot (Punto de acceso público seguro)
│   ├── js/                  # Lógica frontend interactiva (ES6 Vanilla JS)
│   │   ├── client.js        # Vista de Clientes, reservas y turnos
│   │   ├── dashboard.js     # Panel comercial de dueños de negocios
│   │   ├── crear_negocio.js # Wizard de registro comercial (Paso 1)
│   │   ├── agregar_horario.js # Wizard de registro comercial (Paso 2)
│   │   ├── notifications.js # Lógica de notificaciones en tiempo real
│   │   └── sistema.js       # Lógica del panel global Superadmin
│   ├── .htaccess            # Reglas de redirección de Apache para XAMPP
│   ├── api.php              # Enrutador y controlador de la API RESTful PHP
│   ├── index.php            # Index público principal
│   └── router.php           # Enrutador alternativo para pruebas con php -S
├── routes/                  # Enrutamiento Backend
│   └── router.php           # Enrutador simple del servidor para HTML y APIs
├── src/                     # Núcleo de la Aplicación (Backend Principal)
│   ├── Controllers/         # Controladores de la API (Mapeo de rutas)
│   │   ├── AgendaController.php
│   │   ├── AppointmentController.php
│   │   ├── AuthController.php
│   │   ├── BusinessController.php
│   │   ├── MailQueueController.php
│   │   ├── NotificationController.php
│   │   ├── ReviewController.php
│   │   ├── ScheduleController.php
│   │   ├── SecurityLocksController.php
│   │   ├── ServiceController.php
│   │   ├── StaffController.php
│   │   ├── SystemLogController.php
│   │   ├── SystemStatsController.php
│   │   └── UserController.php
│   ├── Middleware/          # Capa de Filtros Intermedios (Pipeline)
│   │   ├── Middleware.php
│   │   ├── MiddlewarePipeline.php
│   │   ├── AuthMiddleware.php
│   │   └── RateLimitMiddleware.php
│   ├── Models/              # Modelos de base de datos ORM (Eloquent)
│   │   ├── AddressCache.php
│   │   ├── Appointment.php
│   │   ├── Business.php
│   │   ├── BusinessStaff.php  # Relación intermedia dueños-personal
│   │   ├── MailQueue.php
│   │   ├── Notification.php
│   │   ├── PasswordResetToken.php
│   │   ├── Review.php
│   │   ├── Service.php
│   │   ├── User.php
│   │   ├── UserRememberToken.php
│   │   └── WorkSchedule.php
│   ├── Security/            # Utilidades de seguridad, sesión y rate limit
│   │   ├── helpers.php      # Validaciones y respuestas del sistema
│   │   ├── session.php      # Configuración de sesión y remember me
│   │   ├── RateLimiter.php  # Limitador de peticiones general
│   │   └── LoginRateLimiter.php # Limitador contra fuerza bruta por email
│   ├── Services/            # Servicios e Integraciones de Terceros
│   │   ├── Mailer.php       # Gestor y cola asíncrona de correos
│   │   └── WhatsApp.php     # Notificaciones vía Twilio API
│   ├── cron/                # Tareas programadas en segundo plano
│   │   └── process_mail_queue.php
│   └── bootstrap.php        # Inicialización de Eloquent, conexión y lectura de .env
├── vistas/                  # Interfaces de Usuario (Frontend HTML)
│   ├── inicio.html          # Landing de bienvenida y acceso
│   ├── login.html           # Inicio de sesión
│   ├── registro.html        # Registro de usuarios
│   ├── recuperar_clave.html # Formulario de recuperación de contraseña
│   ├── restablecer_clave.html # Formulario para ingresar nueva contraseña
│   ├── crear_negocio.html   # Wizard paso 1: Datos del negocio
│   ├── agregar_horario.html # Wizard paso 2: Horarios de atención
│   ├── pagina_inicio.html   # Turnero del Cliente e historial "Mis Turnos"
│   ├── administrador.html   # Dashboard comercial colapsable y pulcro
│   └── sistema.html         # Panel de Control Global (Superadmin)
├── .env                     # Variables de configuración privada (MySQL)
├── composer.json            # Gestor de dependencias de PHP
└── README.md                # Guía explicativa técnica original
```

### 🎯 Beneficios de esta Organización
1. **DocumentRoot Seguro (`public/`)**: Los archivos de código fuente central (`src/`), configuraciones privadas (`.env`) y plantillas HTML (`vistas/`) no son accesibles de forma directa mediante la URL en el navegador. Solo la carpeta `public/` se expone al exterior, previniendo fugas de código o información privada.
2. **Separación de Lógica y Presentación (MVC Light)**: Los datos residen de forma limpia en los modelos ORM (`src/Models/`), las interfaces están en `vistas/` y la interacción dinámica se procesa a través de los archivos específicos de `public/js/`. Todo el enrutamiento es centralizado por `routes/`.

## Instalar

1. Copia `.env.example` a `.env`.
2. Ajusta tus datos de MySQL.
3. Ejecuta `composer install`.
4. Importa `database/schema.sql` en MySQL.
5. Usa `php -S localhost:8000 -t public` para probar localmente.
   
Alternativa (recomendada para este proyecto): desde la raíz del proyecto inicia el servidor integrado apuntando al directorio `public`:

```bash
php -S localhost:8000 -t public
```

Luego abre en el navegador:

- `http://localhost:8000/` - Página de inicio (registro / inicio de sesión)
- `http://localhost:8000/pagina-inicio` o `http://localhost:8000/client` - Vista de cliente
- `http://localhost:8000/dashboard` - Panel de administración del negocio (Dueño o Staff)
- `http://localhost:8000/sistema` - Panel de control global del Superadmin
- `http://localhost:8000/crear-negocio` - Página para ingresar un nuevo negocio
- `http://localhost:8000/agregar-horario` - Página para definir el horario de un negocio recién creado

## URLs principales

- `http://localhost:8000/` - Página de bienvenida
- `http://localhost:8000/registro` - Formulario de registro
- `http://localhost:8000/login` - Formulario de inicio de sesión
- `http://localhost:8000/pagina-inicio` - Vista de cliente
- `http://localhost:8000/client` - Alias para la vista de cliente
- `http://localhost:8000/dashboard` - Panel de administración
- `http://localhost:8000/sistema` (o `/admin`) - Panel de control global (Superadmin)
- `http://localhost:8000/crear-negocio` - Formulario para ingresar un negocio
- `http://localhost:8000/agregar-horario` - Formulario para agregar horario de atención
- `http://localhost:8000/api/businesses` - API RESTful

Nota: la ruta raíz `/` ahora sirve la página de inicio con opciones separadas para registrarse o iniciar sesión.

## Router

El proyecto usa un enrutador simple en `public/index.php` que carga `routes/router.php`.
Las rutas internas del frontend utilizan paths relativos como `js/client.js` y `api` para que funcionen incluso si la app se sirve desde un subdirectorio.
Para el servidor PHP integrado se puede usar:

```bash
C:\xampp\php\php.exe -S localhost:8000 -t public
```

## API RESTful Completa

La API se encuentra expuesta bajo el prefijo `/api/` y mapea los siguientes endpoints controlados por middleware:

### Sesión y Cuentas
* **`POST /api/users`**: Registro de nuevos usuarios.
* **`GET /api/users`**: Obtiene todos los usuarios (solo Superadmin) o uno por ID/email.
* **`PUT /api/users`**: Modifica el perfil de usuario (los administradores pueden cambiar roles mediante este endpoint).
* **`DELETE /api/users?id=...`**: Desactiva la cuenta de un usuario mediante borrado lógico (solo Superadmin).
* **`POST /api/login`**: Inicio de sesión (con protección de bloqueo por fuerza bruta y regeneración de sesión).
* **`POST /api/logout`**: Cierre de sesión y limpieza de tokens *Remember Me*.

### Negocios
* **`GET /api/businesses`**: Lista todos los negocios. Admite filtro `?owner_id=...` y paginación. Si es solicitado por un staff, devuelve sus negocios asignados.
* **`POST /api/businesses`**: Crea un nuevo negocio (geolocaliza la dirección vía Nominatim de forma asíncrona con fallback).
* **`PUT /api/businesses`**: Modifica un negocio existente (solo dueño o administrador).
* **`DELETE /api/businesses?id=...`**: Elimina un negocio y limpia dependencias en cascada (dueño o Superadmin).
* **`POST /api/businesses-with-schedule`**: Crea un negocio y asocia múltiples horarios de atención en una transacción atómica.

### Servicios y Horarios
* **`GET /api/services`**: Lista servicios del sistema. Admite parámetros de búsqueda `?search=...` y filtro `?business_id=...` agrupados de forma segura en SQL.
* **`POST /api/services`**: Crea un servicio en un negocio (solo dueño del negocio o administrador).
* **`DELETE /api/services?id=...`**: Elimina un servicio (solo dueño o administrador).
* **`POST /api/schedule`**: Agrega un horario de trabajo individual a un negocio (solo dueño o administrador).
* **`DELETE /api/schedule?id=...`**: Elimina un horario (solo dueño o administrador).

### Reservas (Turnos) y Agenda
* **`GET /api/agenda?business_id=...&date=...`**: Devuelve los turnos ocupados y el horario del negocio para un día específico. La información de los usuarios que reservaron se mantiene estrictamente anónima a menos que la petición provenga del dueño del negocio o un administrador.
* **`GET /api/appointments`**: Obtiene el listado de turnos del usuario autenticado (autocompleta síncronamente turnos pasados en un lote SQL optimizado en caliente).
* **`POST /api/appointments`**: Reserva un nuevo turno (valida que el horario esté dentro del horario del negocio, no sea en el pasado y no colisione con otra reserva).
* **`PUT /api/appointments`**: Actualiza el estado de un turno (`pending`, `completed`, `cancelled`). Los clientes solo pueden cambiar su turno a `cancelled` y están sujetos a la regla de cancelación con 24 horas de anticipación.
* **`DELETE /api/appointments?id=...`**: Cancela un turno aplicando la regla de cancelación con 24 horas de anticipación para clientes.

### Calificaciones y Notificaciones
* **`GET /api/reviews?business_id=...`**: Lista las reseñas y puntuación de un negocio.
* **`POST /api/reviews`**: Califica un turno completado (valida que el turno haya concluido y pertenezca al usuario).
* **`GET /api/notifications`**: Obtiene las últimas 40 notificaciones in-app del usuario.
* **`PUT /api/notifications`**: Marca una o todas las notificaciones del usuario como leídas.

### Administración de Personal (Staff)
* **`GET /api/staff?business_id=...`**: Lista el personal autorizado de un negocio (dueño o administrador).
* **`POST /api/staff`**: Agrega un usuario como personal de un negocio mediante correo electrónico (dueño o administrador).
* **`DELETE /api/staff?business_id=...&user_id=...`**: Revoca el acceso de un empleado a un negocio (dueño o administrador).

---

## 🔒 Mejoras de Seguridad, Lógica y Rendimiento Recientes

1. **Protección contra Fuerza Bruta (Lockout):** Se implementó un limitador de intentos en el login (`LoginRateLimiter`) que bloquea temporalmente por 15 minutos el acceso a un email tras acumular 5 fallos consecutivos.
2. **Mitigación de Secuestro de Sesión (Session Fixation):** Se fuerza la regeneración del ID de sesión de PHP (`session_regenerate_id(true)`) al autenticarse exitosamente.
3. **Privacidad de Datos Personales:** Ocultamiento automático del hash `password` en el modelo Eloquent `User` y restricción condicional de la relación `user` en el listado público de turnos (`/api/agenda`).
4. **Control de Acceso y Autorización Robusto:** Validación estricta de propiedad/rol en la creación de servicios, horarios y transiciones de estado de reservas (PUT/DELETE) previniendo que los clientes marquen sus propias citas como completadas o evadan el límite de cancelación de 24 horas.
5. **Optimización de Base de Datos:** Corrección de la precedencia lógica del operador `OR` en búsquedas de servicios SQL y migración del autocompletado iterativo individual a actualizaciones masivas (bulk update) en peticiones GET.
6. **Robustez y Portabilidad:** Soporte de timeouts y fallbacks para fallos de la API Nominatim, y soporte multiplataforma (Windows y Linux) para disparar el procesamiento de correos en segundo plano.
7. **Delegación de Administradores de Negocio (Staff):** Los dueños de negocios pueden delegar a personal administrativo por correo electrónico. El personal de negocio (staff) puede gestionar citas, servicios y horarios, pero tiene restringida la alteración del branding y logo, la adición de nuevas sucursales y la eliminación de la sucursal activa.
8. **Panel de Control Global (Superadmin):** Los administradores globales disponen de una interfaz en `/sistema` para gestionar todos los usuarios (promover roles a dueño o admin, desactivar cuentas) y moderar negocios (ver todos los registrados y eliminarlos si infringen normas).
