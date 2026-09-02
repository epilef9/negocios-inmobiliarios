const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const routes = require('./routes/index');
const { errorHandler, notFoundHandler } = require('./middlewares/error.middleware');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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