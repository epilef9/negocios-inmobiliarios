const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config/env');
const { promisify } = require('util');
const { extraerToken, csrfValido } = require('./sesion');

const verifyToken = promisify(jwt.verify);
// La clave sale de la configuración central (obligatoria en producción)
const getJwtSecret = () => {
    const secreto = config.jwtSecret();
    if (!secreto) throw new Error('JWT_SECRET no está configurada');
    return secreto;
};

const authMiddleware = async (req, res, next) => {
    try {
        const sesion = extraerToken(req);
        const token = sesion.token;
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }
        if (!csrfValido(req, sesion)) {
            return res.status(403).json({ message: 'No pudimos validar el pedido. Recargá la página e intentá de nuevo.', code: 'CSRF' });
        }

        // Solo se acepta el algoritmo con el que firmamos (evita tokens armados con otro algoritmo)
        const decoded = await verifyToken(token, getJwtSecret(), { algorithms: ['HS256'] });
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        // Si cambió la contraseña o el email después de iniciar esta sesión, la sesión ya no vale
        if (user.credencialesCambiadasEn && Math.floor(user.credencialesCambiadasEn.getTime() / 1000) > (decoded.iat || 0)) {
            return res.status(401).json({ message: 'Tu sesión venció. Ingresá de nuevo.', code: 'SESION_VENCIDA' });
        }
        // Una cuenta que todavía no confirmó su email no puede usar la sesión
        if (user.emailVerificado === false) {
            return res.status(401).json({ message: 'Confirmá tu email para ingresar.', code: 'EMAIL_NO_VERIFICADO' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Restringe operaciones de administracion al rol admin (RF-09 / RNF-05)
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Acceso denegado. Se requiere rol de administrador.'
        });
    }

    next();
};

// Para rutas públicas que se comportan distinto con sesión (por ejemplo, el administrador agenda fuera de horario).
// Si no hay token, o no es válido, sigue igual que un visitante.
const sesionOpcional = async (req, res, next) => {
    try {
        const sesion = extraerToken(req);
        const token = sesion.token;
        // Con la cookie y sin el encabezado csrf en un pedido que cambia datos, se trata como visitante
        if (token && csrfValido(req, sesion)) {
            const decoded = await verifyToken(token, getJwtSecret(), { algorithms: ['HS256'] });
            const user = await User.findById(decoded.id);
            if (user && user.emailVerificado !== false) req.user = user;
        }
    } catch {
        // Token vencido o inválido: se trata como visitante
    }
    next();
};

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
module.exports.sesionOpcional = sesionOpcional;
