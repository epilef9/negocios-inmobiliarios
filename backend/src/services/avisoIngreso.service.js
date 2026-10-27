// 224: aviso por mail cuando alguien ingresa a una cuenta desde un navegador nuevo.
// Cada navegador lleva una cookie con un número al azar; en el usuario se guarda solo su huella (sha256).
// Si la huella no estaba, se manda «Se ingresó a tu cuenta» con fecha, navegador y ubicación aproximada.
// Nunca frena el ingreso: si algo falla, se registra y listo.
const crypto = require('node:crypto');
const User = require('../models/user.model');
const emailService = require('./email.service');
const config = require('../config/env');
const { leerCookies } = require('../middlewares/sesion');

const COOKIE = 'dispositivo';
const MAXIMO = 10;
const UN_ANIO_MS = 400 * 24 * 60 * 60 * 1000;

const huellaDe = (valor) => crypto.createHash('sha256').update(String(valor)).digest('hex');

// "Chrome en Windows", "Safari en iPhone"…
const describirNavegador = (agente = '') => {
    const a = String(agente);
    const navegador = /Edg\//.test(a) ? 'Edge' : /OPR\//.test(a) ? 'Opera' : /Firefox\//.test(a) ? 'Firefox' : /Chrome\//.test(a) ? 'Chrome' : /Safari\//.test(a) ? 'Safari' : 'un navegador';
    const sistema = /iPhone/.test(a) ? 'iPhone' : /iPad/.test(a) ? 'iPad' : /Android/.test(a) ? 'Android' : /Windows/.test(a) ? 'Windows' : /Mac OS X/.test(a) ? 'Mac' : /Linux/.test(a) ? 'Linux' : '';
    return sistema ? `${navegador} en ${sistema}` : navegador;
};

// Ubicación aproximada que agrega Vercel a cada pedido (por la IP). En local no hay.
const ubicacionDe = (req) => {
    const leer = (h) => {
        try {
            return decodeURIComponent(String(req.get(h) || '')).trim();
        } catch {
            return '';
        }
    };
    return [leer('x-vercel-ip-city'), leer('x-vercel-ip-country-region'), leer('x-vercel-ip-country')].filter(Boolean).join(', ');
};

const fechaHora = (fecha = new Date()) =>
    fecha.toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires', weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });

// Se llama después de un ingreso correcto (con la sesión ya puesta en la respuesta)
const revisarIngreso = async (req, res, userId) => {
    try {
        let valor = leerCookies(req)[COOKIE];
        if (!valor || !/^[\da-f]{32}$/.test(valor)) {
            valor = crypto.randomBytes(16).toString('hex');
            res.cookie(COOKIE, valor, { httpOnly: true, secure: config.enProduccion(), sameSite: 'lax', path: '/', maxAge: UN_ANIO_MS });
        }
        const huella = huellaDe(valor);
        const user = await User.findById(userId).select('+dispositivosConocidos email nombre').lean();
        if (!user) return;
        const conocidos = Array.isArray(user.dispositivosConocidos) ? user.dispositivosConocidos : [];
        const yaConocido = conocidos.some((d) => d.huella === huella);
        const actualizados = [{ huella, visto: new Date() }, ...conocidos.filter((d) => d.huella !== huella)].slice(0, MAXIMO);
        await User.updateOne({ _id: userId }, { $set: { dispositivosConocidos: actualizados } });

        // El primer navegador que se registra (primer ingreso, o cuentas de antes de este aviso) no avisa
        if (yaConocido || conocidos.length === 0) return;
        const ubicacion = ubicacionDe(req);
        await emailService.avisarCliente({
            para: user.email,
            nombre: user.nombre,
            asunto: 'Se ingresó a tu cuenta desde un navegador nuevo',
            parrafos: [
                `Se inició sesión en tu cuenta de Negocios Inmobiliarios el ${fechaHora()}.`,
                `Desde: ${describirNavegador(req.get('user-agent'))}${ubicacion ? `\nUbicación aproximada: ${ubicacion}` : ''}`,
                'Si fuiste vos, no tenés que hacer nada. Si no fuiste vos, cambiá la contraseña ahora: al cambiarla se cierran todas las sesiones abiertas.',
            ],
            boton: 'No fui yo: cambiar la contraseña',
            enlace: `${config.urlFrontend()}/olvide-contrasena`,
            pie: 'Te avisamos solo cuando el ingreso es desde un navegador o dispositivo que no reconocemos.',
        });
    } catch (error) {
        console.error('[aviso de ingreso] No se pudo revisar o avisar:', error.message);
    }
};

module.exports = { revisarIngreso, describirNavegador, huellaDe, COOKIE };
