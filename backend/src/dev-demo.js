// Levanta el backend contra la base de DEMO (MONGODB_URI_DEMO) en vez de la real.
// Uso (desde la carpeta backend): npm run dev:demo
// Antes, llenala con: npm run demo:base
process.env.USAR_BASE_DEMO = '1';
require('./server');
