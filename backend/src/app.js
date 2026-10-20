const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('node:path');
const routes = require('./routes/index');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

dotenv.config();

const { origenesPermitidos } = require('./config/env');

const app = express();

// Detrás del proxy del hosting (Render, Vercel): para que req.protocol sea https
app.set('trust proxy', 1);

// Orígenes que pueden usar la API. Sin CORS_ORIGIN (desarrollo) se acepta cualquiera.
const patrones = origenesPermitidos().map(
    (origen) => new RegExp(`^${origen.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^.]+')}$`)
);
app.use(
    cors(
        patrones.length
            ? { origin: (origen, listo) => listo(null, !origen || patrones.some((patron) => patron.test(origen))) }
            : undefined
    )
);
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'backend' });
});

app.use('/api', routes);

app.use(notFoundHandler);
// Error handling middleware
app.use(errorHandler);

// Export the app
module.exports = app;