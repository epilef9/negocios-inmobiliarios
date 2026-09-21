const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const config = require('../config/env');
const { promisify } = require('util');

const verifyToken = promisify(jwt.verify);
const getJwtSecret = () => process.env.JWT_SECRET || config.JWT_SECRET || 'inmobiliaria_token_key';

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const decoded = await verifyToken(token, getJwtSecret());
        const user = await User.findById(decoded.id);
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
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
