const express = require('express');
const propertiesRoutes = require('./properties.routes');
const usersRoutes = require('./users.routes');
const clientsRoutes = require('./clients.routes');
const authRoutes = require('./auth.routes');
const localidadesRoutes = require('./localidades.routes');
const contratosRoutes = require('./contratos.routes');
const visitasRoutes = require('./visitas.routes');
const solicitudesRoutes = require('./solicitudes.routes');

const router = express.Router();

router.use('/properties', propertiesRoutes);
router.use('/users', usersRoutes);
router.use('/clients', clientsRoutes);
router.use('/auth', authRoutes);
router.use('/localidades', localidadesRoutes);
router.use('/contratos', contratosRoutes);
router.use('/visitas', visitasRoutes);
router.use('/solicitudes', solicitudesRoutes);
router.use('/disponibilidad', require('./disponibilidad.routes'));
router.use('/contacto', require('./contacto.routes'));

module.exports = router;