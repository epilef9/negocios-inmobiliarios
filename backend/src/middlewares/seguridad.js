// Protecciones generales de la API: encabezados de seguridad, limpieza de datos de entrada y freno de intentos.
// Sin dependencias externas para no sumar paquetes al deploy.

const { enProduccion } = require('../config/env');

// Encabezados que le indican al navegador que no adivine tipos de archivo, no muestre la API dentro de
// otra página y no mande la dirección completa a otros sitios
const encabezados = (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // La API solo devuelve datos: no hace falta que el navegador ejecute nada que venga de acá
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    if (enProduccion()) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    next();
};

// Borra claves que empiezan con "$" o tienen puntos ({ "email": { "$gt": "" } }): así nadie puede
// meter operadores de MongoDB en una consulta a través de un formulario
const limpiarObjeto = (valor, profundidad = 0) => {
    if (profundidad > 10 || valor === null || typeof valor !== 'object') return valor;
    if (Array.isArray(valor)) {
        valor.forEach((item, i) => {
            valor[i] = limpiarObjeto(item, profundidad + 1);
        });
        return valor;
    }
    for (const clave of Object.keys(valor)) {
        if (clave.startsWith('$') || clave.includes('.') || clave === '__proto__' || clave === 'constructor' || clave === 'prototype') {
            delete valor[clave];
        } else {
            valor[clave] = limpiarObjeto(valor[clave], profundidad + 1);
        }
    }
    return valor;
};

const limpiarEntrada = (req, res, next) => {
    if (req.body && typeof req.body === 'object') limpiarObjeto(req.body);
    if (req.params && typeof req.params === 'object') limpiarObjeto(req.params);
    next();
};

// Freno de intentos por IP (y opcionalmente por otra clave, como el email). Vive en la memoria del servidor:
// en Vercel cada instancia lleva su cuenta, alcanza para frenar a quien prueba contraseñas a mano o con un script simple.
// En la compu de cada uno (desarrollo) no frena, para poder probar crear cuentas o ingresar todas las veces que haga falta.
// Para probar los frenos en local: FRENOS_EN_DESARROLLO=1 en backend/.env
const frenosActivos = () => enProduccion() || process.env.FRENOS_EN_DESARROLLO === '1';

const limitar = ({ nombre, ventanaMinutos, maximo, mensaje, clave }) => {
    const ventanaMs = ventanaMinutos * 60 * 1000;
    const registros = new Map();

    return (req, res, next) => {
        if (!frenosActivos()) return next();
        const ahora = Date.now();
        const extra = clave ? clave(req) : '';
        const id = `${req.ip}|${extra}`;
        const recientes = (registros.get(id) || []).filter((t) => ahora - t < ventanaMs);

        if (recientes.length >= maximo) {
            const espera = Math.ceil((ventanaMs - (ahora - recientes[0])) / 1000);
            res.setHeader('Retry-After', String(espera));
            return res.status(429).json({
                message: mensaje || 'Hiciste demasiados intentos seguidos. Probá de nuevo en unos minutos.',
                code: 'DEMASIADOS_INTENTOS',
                segundos: espera,
            });
        }

        recientes.push(ahora);
        registros.set(id, recientes);

        // Limpieza para que la memoria no crezca sin límite
        if (registros.size > 5000) {
            for (const [k, tiempos] of registros) {
                if (!tiempos.some((t) => ahora - t < ventanaMs)) registros.delete(k);
            }
        }
        if (registros.size > 5000) {
            console.warn(`[seguridad] El freno "${nombre}" tiene muchas IPs registradas`);
        }
        next();
    };
};

const emailDelPedido = (req) => (typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '');

const frenos = {
    login: limitar({ nombre: 'login', ventanaMinutos: 15, maximo: 8, clave: emailDelPedido, mensaje: 'Demasiados intentos de ingreso con ese email. Esperá unos minutos o restablecé tu contraseña.' }),
    loginIp: limitar({ nombre: 'login-ip', ventanaMinutos: 15, maximo: 30 }),
    registro: limitar({ nombre: 'registro', ventanaMinutos: 60, maximo: 5, mensaje: 'Se crearon muchas cuentas desde esta conexión. Probá más tarde.' }),
    enlaces: limitar({ nombre: 'enlaces', ventanaMinutos: 15, maximo: 5, mensaje: 'Pediste muchos enlaces seguidos. Esperá unos minutos y revisá tu correo (también el spam).' }),
    tokens: limitar({ nombre: 'tokens', ventanaMinutos: 15, maximo: 20 }),
    visitas: limitar({ nombre: 'visitas', ventanaMinutos: 10, maximo: 5, mensaje: 'Pediste muchas visitas seguidas. Si necesitás más, escribinos por WhatsApp.' }),
    perfil: limitar({ nombre: 'perfil', ventanaMinutos: 15, maximo: 10 }),
};

module.exports = { encabezados, limpiarEntrada, limitar, frenos };
