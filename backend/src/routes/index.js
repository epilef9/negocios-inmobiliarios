const express = require('express');
const propertiesRoutes = require('./properties.routes');
const usersRoutes = require('./users.routes');
const clientsRoutes = require('./clients.routes');
const authRoutes = require('./auth.routes');
const localidadesRoutes = require('./localidades.routes');
const contratosRoutes = require('./contratos.routes');

const router = express.Router();

router.use('/properties', propertiesRoutes);
router.use('/users', usersRoutes);
router.use('/clients', clientsRoutes);
router.use('/auth', authRoutes);
router.use('/localidades', localidadesRoutes);
router.use('/contratos', contratosRoutes);

module.exports = router;