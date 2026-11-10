# Pruebas de punta a punta

Recorren el sitio como una persona, en este orden:

1. Registrarse, confirmar el email e ingresar.
2. Agendar una visita desde la ficha de una propiedad.
3. Mandar una solicitud de alquiler con la documentación.
4. Entrar al panel como administrador, confirmar la visita y aprobar la solicitud.

Corren contra una base de **prueba**, nunca contra la real. La dirección sale de `MONGODB_URI_TEST` en `backend/.env`, y el nombre de la base tiene que incluir `test` (por ejemplo `…mongodb.net/inmobiliaria_test`). Antes de cada corrida la base se vacía y se carga un administrador y una propiedad.

## Cómo correrlas

Primero cerrá el `npm run dev` del frontend: las pruebas levantan su propio backend (puerto 4100) y su propio frontend (puerto 3100).

```bash
cd e2e
npm install
npx playwright install chromium   # solo la primera vez
npm test                          # o npm run test:ver para ver el navegador
npm run informe                   # el informe con capturas si algo falla
```

Durante las pruebas no se mandan mails (el sitio muestra el enlace de confirmación), el captcha queda apagado y no se usa Mercado Pago ni Cloudinary.
