require("dotenv").config();

const connectDB = require('./config/database');
const app = require('./app');
const { validarConfiguracion } = require('./config/env');
const port = Number(process.env.PORT) || 4000;

// En producción no arranca si falta una variable imprescindible (clave de sesiones, base, dirección del frontend)
validarConfiguracion();

connectDB()
    .then(() => {
        const server = app.listen(port, () => {
            console.log(`✅ Backend listening on http://localhost:${port}`);
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`❌ El puerto ${port} ya está en uso. Ya hay otra instancia del backend corriendo.`);
            } else {
                console.error(`❌ Error en el servidor:`, err.message);
            }
            process.exit(1);
        });
    })
    .catch((err) => {
        console.error('❌ Error al inicializar backend:', err);
        process.exit(1);
    });