// Sesión en cookies. El token de sesión va en una cookie httpOnly (el JavaScript de la página no puede leerla,
// así que un script inyectado no se la puede llevar) y se acompaña con una segunda cookie "csrf" que la página sí lee
// y reenvía en el encabezado X-CSRF-Token en cada pedido que cambia datos: un sitio ajeno puede hacer que el navegador
// mande la cookie, pero no puede leer el valor para copiarlo en el encabezado.

const crypto = require('node:crypto');
const { enProduccion } = require('../config/env');

const COOKIE_SESION = 'sesion';
const COOKIE_CSRF = 'csrf';
const DURACION_MS = 24 * 60 * 60 * 1000; // igual que el vencimiento del token (auth.service)
const METODOS_SEGUROS = new Set(['GET', 'HEAD', 'OPTIONS']);

const leerCookies = (req) => {
    const cookies = {};
    for (const par of (req.headers.cookie || '').split(';')) {
        const i = par.indexOf('=');
        if (i < 0) continue;
        const nombre = par.slice(0, i).trim();
        try {
            cookies[nombre] = decodeURIComponent(par.slice(i + 1).trim());
        } catch {
            // Cookie mal formada: se ignora
        }
    }
    return cookies;
};

const opcionesCookie = (extra = {}) => ({
    secure: enProduccion(),
    sameSite: 'lax',
    path: '/',
    maxAge: DURACION_MS,
    ...extra,
});

// Deja la sesión iniciada en el navegador
const establecerSesion = (res, token) => {
    res.cookie(COOKIE_SESION, token, opcionesCookie({ httpOnly: true }));
    res.cookie(COOKIE_CSRF, crypto.randomBytes(32).toString('hex'), opcionesCookie({ httpOnly: false }));
};

const borrarSesion = (res) => {
    const { maxAge, ...sinDuracion } = opcionesCookie();
    res.clearCookie(COOKIE_SESION, { ...sinDuracion, httpOnly: true });
    res.clearCookie(COOKIE_CSRF, sinDuracion);
};

// De dónde viene el token del pedido: la cookie de sesión (navegador) o, para otros clientes, Authorization: Bearer
const extraerToken = (req) => {
    const cookies = leerCookies(req);
    if (cookies[COOKIE_SESION]) return { token: cookies[COOKIE_SESION], porCookie: true, csrf: cookies[COOKIE_CSRF] };
    const token = req.headers.authorization?.split(' ')[1];
    return token ? { token, porCookie: false } : { token: null, porCookie: false };
};

// Un pedido que cambia datos y viene con la cookie de sesión tiene que traer también el valor de la cookie csrf en el encabezado
const csrfValido = (req, { porCookie, csrf }) => {
    if (!porCookie || METODOS_SEGUROS.has(req.method)) return true;
    const enviado = req.headers['x-csrf-token'];
    if (typeof enviado !== 'string' || typeof csrf !== 'string' || !csrf || enviado.length !== csrf.length) return false;
    return crypto.timingSafeEqual(Buffer.from(enviado), Buffer.from(csrf));
};

module.exports = { establecerSesion, borrarSesion, extraerToken, csrfValido };
