import express from 'express';
import propertiesRoutes from './properties.routes.js';
import usersRoutes from './users.routes.js';
import clientsRoutes from './clients.routes.js';
import authRoutes from './auth.routes.js';

const router = express.Router();

router.use('/api/properties', propertiesRoutes);
router.use('/api/users', usersRoutes);
router.use('/api/clients', clientsRoutes);
router.use('/api/auth', authRoutes);

export default router;