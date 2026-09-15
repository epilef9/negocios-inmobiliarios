const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('node:path');
const routes = require('./routes/index');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
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