# Real Estate Backend

Este proyecto es un backend para un sistema de gestión inmobiliaria, desarrollado con Node.js y Express.js. Permite la gestión de propiedades, usuarios, clientes y autenticación, siguiendo buenas prácticas REST.

## Requerimientos

El backend debe gestionar las siguientes entidades:

- **Propiedades**: Permite realizar operaciones CRUD (Crear, Leer, Actualizar, Eliminar) sobre propiedades, así como aplicar filtros y búsquedas.
- **Usuarios**: Gestión de usuarios con operaciones CRUD.
- **Clientes**: Gestión de clientes con operaciones CRUD.
- **Autenticación**: Implementación de un sistema de autenticación y autorización.

## Funcionalidades Principales

- **Gestión de Propiedades**:
  - Obtener todas las propiedades.
  - Obtener una propiedad específica.
  - Crear una nueva propiedad.
  - Actualizar una propiedad existente.
  - Eliminar una propiedad.
  - Filtrar y buscar propiedades.

- **Gestión de Usuarios y Clientes**:
  - Obtener todos los usuarios.
  - Crear un nuevo usuario.
  - Actualizar un usuario existente.
  - Eliminar un usuario.

- **Autenticación**:
  - Login de usuario.
  - Logout de usuario.

## Endpoints

- `GET /api/properties`: Obtener todas las propiedades.
- `GET /api/properties/:id`: Obtener una propiedad específica.
- `POST /api/properties`: Crear una nueva propiedad.
- `PUT /api/properties/:id`: Actualizar una propiedad existente.
- `DELETE /api/properties/:id`: Eliminar una propiedad.
- `GET /api/users`: Obtener todos los usuarios.
- `POST /api/users`: Crear un nuevo usuario.
- `PUT /api/users/:id`: Actualizar un usuario existente.
- `DELETE /api/users/:id`: Eliminar un usuario.
- `POST /api/auth/login`: Autenticación de usuario.
- `POST /api/auth/logout`: Cierre de sesión.

## Estructura del Proyecto

```
real-estate-backend
├── src
│   ├── app.js
│   ├── server.js
│   ├── config
│   │   ├── database.js
│   │   └── env.js
│   ├── routes
│   │   ├── index.js
│   │   ├── properties.routes.js
│   │   ├── users.routes.js
│   │   ├── clients.routes.js
│   │   └── auth.routes.js
│   ├── controllers
│   │   ├── properties.controller.js
│   │   ├── users.controller.js
│   │   ├── clients.controller.js
│   │   └── auth.controller.js
│   ├── services
│   │   ├── properties.service.js
│   │   ├── users.service.js
│   │   ├── clients.service.js
│   │   └── auth.service.js
│   ├── models
│   │   ├── property.model.js
│   │   ├── user.model.js
│   │   └── client.model.js
│   ├── repositories
│   │   ├── properties.repository.js
│   │   ├── users.repository.js
│   │   └── clients.repository.js
│   ├── middlewares
│   │   ├── auth.middleware.js
│   │   ├── error.middleware.js
│   │   └── validation.middleware.js
│   ├── validators
│   │   ├── property.validator.js
│   │   ├── user.validator.js
│   │   └── client.validator.js
│   ├── utils
│   │   ├── api-error.js
│   │   └── pagination.js
│   └── docs
│       └── openapi.yaml
├── tests
│   ├── properties.test.js
│   ├── users.test.js
│   └── auth.test.js
├── .env.example
├── package.json
└── README.md
```

## Dependencias

Para el correcto funcionamiento del backend, se recomienda instalar las siguientes dependencias:

- `express`: Framework para construir la API.
- `mongoose` (o `sequelize`, dependiendo de la base de datos): Para interactuar con la base de datos.
- `dotenv`: Para manejar variables de entorno.
- `cors`: Para permitir solicitudes desde el frontend.
- `body-parser`: Para manejar el cuerpo de las solicitudes.
- `jsonwebtoken`: Para manejar la autenticación.
- `jest` (o `mocha`): Para pruebas unitarias.

## Flujo General

1. El frontend realiza solicitudes HTTP a los endpoints del backend.
2. El backend recibe las solicitudes, las procesa a través de controladores y servicios, y accede a la base de datos mediante los repositorios.
3. El backend devuelve respuestas JSON al frontend, que las utiliza para actualizar la interfaz de usuario.

## Desarrollo

Se recomienda seguir el siguiente orden para desarrollar el backend:

1. Configuración inicial del servidor y middleware (CORS, body-parser).
2. Configuración de la base de datos.
3. Implementación de la autenticación y autorización.
4. Desarrollo de las rutas y controladores para propiedades.
5. Desarrollo de las rutas y controladores para usuarios y clientes.
6. Implementación de validaciones y manejo de errores.
7. Pruebas unitarias y de integración.
8. Documentación de la API.