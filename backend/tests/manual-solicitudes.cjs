// API local para QA visual. No conecta a MongoDB ni envía correos.
// node tests/manual-solicitudes.cjs
// Frontend: NEXT_PUBLIC_API_URL=http://localhost:4100/api npm run dev -- --port 3100
// Login: cliente@example.com / Prueba123! (datos ficticios; cualquier clave sirve en esta API).
const http = require('node:http');
const { infoCliente } = require('../src/services/solicitudes.service');
const { cambioAutomatico } = require('../src/services/solicitudes-ciclo.service');
const fecha = (dias) => new Date(Date.now() - dias * 86400000).toISOString();
let role = 'cliente';
let vendida = false;
const user = () => ({ id: '507f1f77bcf86cd799439001', nombre: 'Ana', apellido: 'Prueba', email: 'cliente@example.com',
    dni: '30123456', telefono: '3434444444', role, createdAt: fecha(20), preferencias: { tema: 'light', paleta: 'corporativo' } });
const propiedad = { _id: '507f1f77bcf86cd799439011', title: 'Casa de prueba con jardín', ciudad: 'Paraná', location: 'Paraná',
    estado: 'disponible', images: ['http://localhost:3100/images/home-inmobiliaria.webp'] };
const solicitudes = [
    { _id: '507f1f77bcf86cd799439021', propiedad, estado: 'pendiente', operacion: 'alquiler', createdAt: fecha(10),
        historialEstados: [
            { estado: 'pendiente', comentario: 'Mensaje antiguo que solo ve administración.', fecha: fecha(100) },
            { estado: 'pendiente', comentario: 'Revisamos los documentos. Falta una imagen más clara.', fecha: fecha(5) },
            { estado: 'pendiente', comentario: 'https://ejemplo.com/' + 'a'.repeat(480), fecha: fecha(2) },
            { estado: 'pendiente', comentario: 'L'.repeat(500), fecha: fecha(1) },
            { estado: 'pendiente', comentario: '', comentarioReferenciaIndice: 3, fecha: fecha(0) },
        ] },
    { _id: '507f1f77bcf86cd799439022', propiedad: { ...propiedad, title: 'Departamento sin respuesta', images: [] }, estado: 'pendiente', operacion: 'compra', createdAt: fecha(61), historialEstados: [] },
];
const actuales = () => solicitudes.map((solicitud) => {
    const inmueble = { ...solicitud.propiedad, estado: vendida ? 'vendido' : 'disponible' };
    const cambio = cambioAutomatico(solicitud, inmueble);
    if (cambio) {
        solicitud.estado = cambio.estado;
        solicitud.historialEstados.push(cambio);
    }
    const publica = infoCliente({ ...solicitud, propiedad: inmueble });
    return { ...publica, historialEstados: solicitud.historialEstados,
        datosPersonales: { titular: user(), ingresosTipo: 'constancia' }, documentos: [], archivada: false };
});

http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3100');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-CSRF-Token, Idempotency-Key');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, OPTIONS');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const path = new URL(req.url, 'http://localhost:4100').pathname;
    if (path.startsWith('/qa')) {
        if (path === '/qa/vendida') vendida = true;
        if (path === '/qa/admin') role = 'admin';
        if (path === '/qa/cliente') role = 'cliente';
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.end('<h1>QA local: datos ficticios</h1><a href="/qa/vendida">Marcar propiedad como vendida</a><br><a href="/qa/admin">Usar rol administrador</a><br><a href="/qa/cliente">Usar rol cliente</a><br><a href="http://localhost:3100/perfil">Ver Mi cuenta</a><br><a href="http://localhost:3100/admin/solicitudes">Ver panel</a>');
    }
    let data = [];
    if (path === '/api/auth/login') data = { user: user() };
    else if (path === '/api/auth/me' || path === '/api/users/me') data = user();
    else if (path === '/api/auth/preferences') data = user().preferencias;
    else if (path === '/api/solicitudes/mias') data = actuales().map((item) => ({ ...item, historialEstados: infoCliente(item).historialEstados }));
    else if (path === '/api/solicitudes/admin') data = actuales();
    else if (path === '/api/solicitudes/admin/pendientes') data = actuales().filter((item) => item.estado === 'pendiente').length;
    else if (path === '/api/reservas/pendientes/cantidad') data = 0;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ data }));
}).listen(4100, '127.0.0.1', () => console.log('QA sin base de datos: http://localhost:4100/qa'));
