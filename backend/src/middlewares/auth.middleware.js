const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config/env');
const { promisify } = require('util');

const verifyToken = promisify(jwt.verify);
// La clave sale de la configuración central (obligatoria en producción)
const getJwtSecret = () => {
    const secreto = config.jwtSecret();
    if (!secreto) throw new Error('JWT_SECRET no está configurada');
    return secreto;
};

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
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

module.exports = authMiddleware;
module.exports.requireAdmin = requireAdmin;
