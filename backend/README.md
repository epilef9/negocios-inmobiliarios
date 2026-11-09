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

Crea `backend/.env` a partir de `.env.example` y configura `MONGODB_URI` con la cadena de conexión de tu clúster de MongoDB. El backend no usa una base local como respaldo para evitar mostrar datos distintos de los remotos.

Se recomienda seguir el siguiente orden para desarrollar el backend:

1. Configuración inicial del servidor y middleware (CORS, body-parser).
2. Configuración de la base de datos.
3. Implementación de la autenticación y autorización.
4. Desarrollo de las rutas y controladores para propiedades.
5. Desarrollo de las rutas y controladores para usuarios y clientes.
6. Implementación de validaciones y manejo de errores.
7. Pruebas unitarias y de integración.
8. Documentación de la API.

## Solicitudes de alquiler y compra

Las solicitudes se guardan en MongoDB junto con una referencia privada a cada archivo en GridFS:

- `POST /api/solicitudes`: registra una solicitud multipart para un cliente autenticado. Requiere `Idempotency-Key` (UUID), un campo `datos` en JSON y los documentos indicados por el formulario.
- `POST /api/solicitudes/documentos/:tipo`: sube un documento temporal cifrado para un cliente autenticado. Requiere `Idempotency-Key` (UUID); admite PDF de hasta 4 MB e imágenes JPG/PNG de hasta 20 MB antes de la optimización del cliente.
- `POST /api/solicitudes/:id/documentacion`: permite al titular de una solicitud en `falta_documentacion` reemplazar exactamente los documentos pedidos. Recibe `{ "documentos": [{ "id": "<id temporal>", "tipo": "<tipo>" }] }`; para recibos de sueldo incluye `indice` (0 a 2). Requiere el mismo `Idempotency-Key` usado al subir los archivos. En una transacción reclama los archivos cifrados, actualiza solo las referencias seleccionadas, registra la presentación en el historial, limpia el pedido actual y devuelve la solicitud a `pendiente`. Una notificación administrativa se crea o reactiva dentro de esa transacción; no se eliminan los archivos históricos reemplazados.
- `GET /api/solicitudes/mias`: lista el estado y la propiedad de las solicitudes propias.
- `GET /api/solicitudes/:id`: permite al titular o a un administrador autorizado consultar la solicitud.
- `GET /api/solicitudes/:id/documentos/:tipo`: permite descargar el documento únicamente al titular o a un administrador.
- `GET /api/solicitudes/admin`: deja disponibles para la revisión administrativa las solicitudes y sus datos descifrados.
- `GET /api/solicitudes/admin/notificaciones`: devuelve las notificaciones internas de solicitudes nuevas para el panel de administración.
- `PATCH /api/solicitudes/:id/estado`: solo para administradores y solicitudes pendientes; actualiza el estado a `pendiente`, `falta_documentacion`, `aprobada` o `rechazada`, guarda el comentario de hasta 250 caracteres y agrega una única entrada al historial. Para solicitar correcciones, enviar `documentosSolicitados` con identificadores válidos para la operación y la documentación elegida (los recibos se identifican como `recibosIngresos:0`, `recibosIngresos:1` y `recibosIngresos:2`). Con documentos, el estado debe ser `falta_documentacion`; sin documentos, debe ser `pendiente`. La respuesta incluye el resultado del correo por separado (`enviada`, `simulada`, `fallida` o `sin_destinatario`); un fallo del proveedor no revierte el cambio guardado.
- `POST /api/solicitudes/:id/comentarios`: solo para administradores; agrega una observación al historial asociada al estado vigente, sin cambiar ese estado.
- `PATCH /api/solicitudes/:id/archivo`: solo para administradores; archiva o restaura una solicitud sin cambiar su estado, comentarios ni documentos.
- `DELETE /api/solicitudes/:id`: solo para administradores; elimina una solicitud y sus documentos GridFS exclusivos dentro de una transacción. La operación se cancela si no puede verificar de forma segura la propiedad de los archivos.

Los documentos se cifran con AES-256-GCM antes de guardarse en GridFS y los datos personales se guardan cifrados en el documento de solicitud. Los recibos individuales se consultan con identificadores `recibosIngresos:0`, `recibosIngresos:1` y `recibosIngresos:2`. Configurá `SOLICITUDES_ENCRYPTION_KEY` con una clave hexadecimal aleatoria de 64 caracteres; se puede generar con:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Usá el mismo valor en todos los entornos que deban leer los documentos existentes. Guardalo en el gestor de secretos del hosting y no lo compartas ni lo cambies sin un plan de recifrado. Los archivos no se sirven desde `/uploads` ni se exponen con URLs públicas. La carga multipart inicial acepta hasta 5 MB por archivo; las cargas individuales cifradas admiten PDF de hasta 4 MB e imágenes de hasta 20 MB antes de optimizarse en el cliente.