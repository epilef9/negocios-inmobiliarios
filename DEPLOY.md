# Publicar el sitio

- **Frontend** (Next.js) → **Vercel**, gratis. Publica `main` como sitio oficial y arma un link de prueba para cada rama.
- **Backend** (Express) → **Render**, gratis. En el plan gratis se duerme después de 15 minutos sin uso, y la primera visita tarda unos 50 segundos en despertarlo.
- **Base de datos** → la misma de **MongoDB Atlas**.
- **Fotos de las propiedades** → **Cloudinary**, gratis. En Render el disco se borra al reiniciar, así que las fotos no pueden quedar en `backend/uploads`.

## 0. Antes de empezar (una sola vez)

1. **Cambiar la contraseña de MongoDB Atlas.** La anterior quedó en el historial de GitHub.
   - Atlas → Database Access → editar el usuario → Edit Password.
   - Actualizar `MONGODB_URI` en el `backend/.env` de cada integrante del equipo.
2. **Permitir conexiones desde Render.** Atlas → Network Access → Add IP Address → `0.0.0.0/0`.
   Hace falta porque Render no tiene una IP fija en el plan gratis.
3. **Crear una cuenta en [Cloudinary](https://cloudinary.com).**
   - Copiar el valor de **API environment variable**, que tiene la forma `cloudinary://API_KEY:API_SECRET@CLOUD_NAME`.

## 1. Pasar las fotos actuales a Cloudinary

Las fotos que ya se subieron están en `backend/uploads`, y en la base quedaron links con `localhost`. Para pasarlas:

1. Agregar `CLOUDINARY_URL=...` al `backend/.env`.
2. Desde `backend`, ver primero qué va a cambiar (este paso no toca nada):
   ```
   npm run migrar:imagenes -- --probar
   ```
3. Si la lista está bien, hacer la migración de verdad:
   ```
   npm run migrar:imagenes
   ```

Desde ese momento, con `CLOUDINARY_URL` configurada, las fotos nuevas también se suben directo a Cloudinary.

## 2. Backend en Render

1. Render → **New → Blueprint** → elegir el repositorio. Render lee `render.yaml` y arma el servicio.
2. Completar las variables que pide:
   - `MONGODB_URI`: la URI de Atlas con la contraseña nueva.
   - `CLOUDINARY_URL`: la de Cloudinary.
   - `CORS_ORIGIN`: por ahora se puede dejar `https://*.vercel.app`. En el paso 4 se cambia por la dirección real.
   - `JWT_SECRET` lo genera Render solo.
3. Cuando termine, probar `https://<servicio>.onrender.com/api/health`. Tiene que responder `{"status":"ok"}`.

## 3. Frontend en Vercel

1. Vercel → **Add New → Project** → importar el repositorio.
2. **Root Directory**: `frontend`.
3. **Environment Variables**: `NEXT_PUBLIC_API_URL` = `https://<servicio>.onrender.com/api`.
4. Deploy.

## 4. Cerrar el acceso a la API

En Render, cambiar `CORS_ORIGIN` por la dirección real del frontend y la de sus links de prueba:

```
https://negocios-inmobiliarios.vercel.app,https://negocios-inmobiliarios-*.vercel.app
```

## Ramas

- **`main`** es el sitio publicado. Para publicar, se abre un PR de `develop` a `main`.
- Cada rama y cada PR tiene su link de prueba en Vercel. El backend publicado es uno solo, el de `main`.

## Qué controla el backend en producción (`NODE_ENV=production`)

- No arranca si falta `MONGODB_URI`, `JWT_SECRET` (32 caracteres o más) o `CORS_ORIGIN`, y avisa cuál falta.
- Clientes, contratos, usuarios y la gestión de visitas son solo para el administrador. Pedir una visita sigue abierto a cualquiera.
- No carga visitas de ejemplo y no permite reiniciar las visitas.

## Si algo falla

- **El sitio carga pero no aparecen propiedades:** el backend puede estar despertando (hasta 50 segundos). Si sigue igual, revisar `NEXT_PUBLIC_API_URL` en Vercel y `CORS_ORIGIN` en Render.
- **En Render aparece "Faltan variables de entorno para producción":** cargar las que nombra el mensaje.
- **No se pueden guardar cambios ("not primary") o no conecta a Atlas:** revisar Network Access en Atlas y la contraseña de `MONGODB_URI`.
