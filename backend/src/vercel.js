require("dotenv").config();

const app = require("./app");
const connectDB = require("./config/database");
const { validarConfiguracion } = require("./config/env");

validarConfiguracion();

let connectionPromise;

const ensureDatabaseConnection = () => {
    if (!connectionPromise) {
        connectionPromise = connectDB().catch((error) => {
            connectionPromise = undefined;
            throw error;
        });
    }

    return connectionPromise;
};

module.exports = async (request, response) => {
    try {
        await ensureDatabaseConnection();
        return app(request, response);
    } catch (error) {
        console.error("❌ Error al conectar con MongoDB:", error.message);
        return response.status(503).json({
            message: "El servicio no está disponible temporalmente",
        });
    }
};
