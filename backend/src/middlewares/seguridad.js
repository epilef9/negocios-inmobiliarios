// Protecciones generales de la API: encabezados de seguridad, limpieza de datos de entrada y freno de intentos.
// Sin dependencias externas para no sumar paquetes al deploy.

const { enProduccion } = require('../config/env');
const Freno = require('../models/freno.model');

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

// Freno de intentos por IP (y opcionalmente por otra clave, como el email). El conteo vive en MongoDB (colección "frenos",
// con índice TTL que borra cada registro al terminar su ventana): en Vercel cada pedido puede caer en un servidor distinto
// y así el límite es uno solo para todos.
// En la compu de cada uno (desarrollo) no frena, para poder probar crear cuentas o ingresar todas las veces que haga falta.
// Para probar los frenos en local: FRENOS_EN_DESARROLLO=1 en backend/.env
const frenosActivos = () => enProduccion() || process.env.FRENOS_EN_DESARROLLO === '1';

const limitar = ({ nombre, ventanaMinutos, maximo, mensaje, clave }) => {
    const ventanaMs = ventanaMinutos * 60 * 1000;

    return async (req, res, next) => {
        if (!frenosActivos()) return next();
        try {
            const ahora = new Date();
            const extra = clave ? clave(req) : '';
            const id = `${nombre}|${req.ip}|${extra}`;
            // Una sola operación atómica: si la ventana anterior venció arranca en 1, si no suma 1
            const registro = await Freno.findOneAndUpdate(
                { _id: id },
                [
                    {
                        $set: {
                            cuenta: { $cond: [{ $lte: ['$vence', ahora] }, 1, { $add: ['$cuenta', 1] }] },
                            vence: { $cond: [{ $lte: ['$vence', ahora] }, new Date(ahora.getTime() + ventanaMs), '$vence'] },
                        },
                    },
                ],
                { upsert: true, returnDocument: 'after', updatePipeline: true }
            );

            if (registro.cuenta > maximo) {
                const espera = Math.max(1, Math.ceil((registro.vence.getTime() - ahora.getTime()) / 1000));
                res.setHeader('Retry-After', String(espera));
                return res.status(429).json({
                    message: mensaje || 'Hiciste demasiados intentos seguidos. Probá de nuevo en unos minutos.',
                    code: 'DEMASIADOS_INTENTOS',
                    segundos: espera,
                });
            }
        } catch (error) {
            // Si la base falla, mejor dejar pasar el pedido que dejar a todos sin poder ingresar
            console.error(`[seguridad] No se pudo contar el intento en el freno "${nombre}":`, error.message);
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
    solicitudes: limitar({ nombre: 'solicitudes', ventanaMinutos: 60, maximo: 5, mensaje: 'Enviaste varias solicitudes en poco tiempo. Probá de nuevo más tarde.' }),
    perfil: limitar({ nombre: 'perfil', ventanaMinutos: 15, maximo: 10 }),
    contacto: limitar({ nombre: 'contacto', ventanaMinutos: 10, maximo: 5, mensaje: 'Enviaste muchas consultas seguidas. Probá de nuevo en unos minutos.' }),
    reservas: limitar({ nombre: 'reservas', ventanaMinutos: 10, maximo: 5, mensaje: 'Enviaste muchas reservas seguidas. Esperá unos minutos o escribinos por WhatsApp.' }),
    uploads: limitar({ nombre: 'uploads', ventanaMinutos: 10, maximo: 10, mensaje: 'Subiste muchos archivos seguidos. Probá de nuevo en unos minutos.' }),
};

module.exports = { encabezados, limpiarEntrada, limitar, frenos };
