# Turnos Ya

Proyecto básico para reservar turnos con roles de dueño, administrador y cliente.

## 📂 Estructura del Proyecto y Arquitectura

La arquitectura de la aplicación está diseñada bajo el estándar profesional de desarrollo seguro (separando el punto de acceso público del código fuente principal) de la siguiente manera:

```text
Proyecto Turnos Ya/
├── database/                # Base de Datos
│   └── schema.sql           # Script de creación de tablas MySQL
├── public/                  # DocumentRoot (Punto de acceso público seguro)
│   ├── js/                  # Lógica frontend interactiva (ES6 Vanilla JS)
│   │   ├── client.js        # Vista de Clientes, reservas y turnos
│   │   ├── dashboard.js     # Panel comercial de dueños de negocios
│   │   ├── crear_negocio.js # Wizard de registro comercial (Paso 1)
│   │   └── agregar_horario.js # Wizard de registro comercial (Paso 2)
│   ├── .htaccess            # Reglas de redirección de Apache para XAMPP
│   ├── api.php              # Enrutador y controlador de la API RESTful PHP
│   └── index.php            # Index público principal
├── routes/                  # Enrutamiento Backend
│   └── router.php           # Enrutador simple del servidor para HTML y APIs
├── src/                     # Núcleo de la Aplicación (Backend Principal)
│   ├── Models/              # Modelos de base de datos ORM (Eloquent)
│   │   ├── User.php
│   │   ├── Business.php
│   │   ├── Service.php
│   │   ├── WorkSchedule.php
│   │   └── Appointment.php
│   └── bootstrap.php        # Inicialización de Eloquent, conexión y lectura de .env
├── vistas/                  # Interfaces de Usuario (Frontend HTML)
│   ├── inicio.html          # Landing de bienvenida y acceso
│   ├── login.html           # Inicio de sesión
│   ├── registro.html        # Registro de usuarios
│   ├── crear_negocio.html   # Wizard paso 1: Datos del negocio
│   ├── agregar_horario.html # Wizard paso 2: Horarios de atención
│   ├── pagina_inicio.html   # Turnero del Cliente e historial "Mis Turnos"
│   └── administrador.html   # Dashboard comercial colapsable y pulcro
├── .env                     # Variables de configuración privada (MySQL)
├── composer.json            # Gestor de dependencias de PHP
└── README.md                # Esta guía explicativa técnica
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
- `http://localhost:8000/dashboard` - Panel de administrador (si estás autenticado)
- `http://localhost:8000/crear-negocio` - Página para ingresar un nuevo negocio
- `http://localhost:8000/agregar-horario` - Página para definir el horario de un negocio recién creado

## URLs principales

- `http://localhost:8000/` - Página de bienvenida
- `http://localhost:8000/registro` - Formulario de registro
- `http://localhost:8000/login` - Formulario de inicio de sesión
- `http://localhost:8000/pagina-inicio` - Vista de cliente
- `http://localhost:8000/client` - Alias para la vista de cliente
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

## API básica

- `GET /api/businesses`
- `POST /api/businesses`
- `GET /api/services?search=...`
- `POST /api/services`
- `POST /api/appointments`
- `DELETE /api/appointments?id=...`

Comportamiento y validaciones importantes:

- Los endpoints realizan sanitización básica de entradas (strings, enteros, fechas y horas).
- Devuelven códigos HTTP apropiados: `201` para recursos creados, `400` para peticiones mal formadas, `404` cuando no se encuentra un recurso, y `409` cuando hay conflicto (por ejemplo email duplicado).
- Los campos obligatorios devuelven mensajes de error JSON explicativos cuando faltan o son inválidos.

Ejemplo rápido (crear usuario):

```bash
curl -X POST http://localhost:8000/api/users \
	-H "Content-Type: application/json" \
	-d '{"name":"Juan", "email":"juan@ejemplo.com", "role":"client"}'
```

