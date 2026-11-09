// Pruebas de punta a punta: levantan el backend y el frontend en puertos aparte (4100 y 3100) contra una base
// de PRUEBA y recorren el sitio como lo haría una persona. Nunca usan la base real: la dirección sale de
// MONGODB_URI_TEST (backend/.env) y el nombre de la base tiene que incluir "test" (mismo control que los tests).
//
// Uso (desde la carpeta e2e, con el `npm run dev` del frontend cerrado):
//   npm install && npx playwright install chromium   (la primera vez)
//   npm test                                          (o npm run test:ver para mirar el navegador)
const path = require('node:path');
require(path.join(__dirname, '../backend/node_modules/dotenv')).config({ path: path.join(__dirname, '../backend/.env'), quiet: true });
const { defineConfig, devices } = require('@playwright/test');
const { uriDePrueba } = require('../backend/tests/base-de-prueba');

const API = 'http://localhost:4100';
const SITIO = 'http://localhost:3100';
// Falla acá mismo si MONGODB_URI_TEST no está o apunta a la base real
const BASE_PRUEBA = uriDePrueba();

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  // Los pasos dependen unos de otros (la visita y la solicitud las confirma el admin): en orden y de a uno
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  globalSetup: require.resolve('./preparar-base.js'),
  use: {
    baseURL: SITIO,
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    ...devices['Desktop Chrome'],
  },
  webServer: [
    {
      command: 'node src/server.js',
      cwd: path.join(__dirname, '../backend'),
      url: `${API}/api/health`,
      timeout: 60_000,
      reuseExistingServer: false,
      env: {
        PORT: '4100',
        NODE_ENV: 'development',
        MONGODB_URI: BASE_PRUEBA,
        FRONTEND_URL: SITIO,
        // Sin mails de verdad (el sitio muestra el enlace de confirmación), sin captcha y sin cobros
        BREVO_API_KEY: '',
        SMTP_HOST: '',
        SMTP_USER: '',
        TURNSTILE_SECRET_KEY: '',
        MP_ACCESS_TOKEN: '',
        CLOUDINARY_URL: '',
      },
    },
    {
      command: 'npx next dev -p 3100',
      cwd: path.join(__dirname, '../frontend'),
      url: SITIO,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_API_URL: `${API}/api`,
        NEXT_PUBLIC_TURNSTILE_SITE_KEY: '',
        NEXT_PUBLIC_SITE_URL: SITIO,
      },
    },
  ],
});
