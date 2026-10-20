// Configuración del backend leída del entorno (archivo .env en desarrollo, variables del hosting en producción)

const enProduccion = () => process.env.NODE_ENV === 'production';

// Clave con la que se firman las sesiones. En desarrollo hay una por defecto para no tener que configurarla;
// en producción es obligatoria: con una clave conocida cualquiera podría armarse una sesión de administrador.
const jwtSecret = () => process.env.JWT_SECRET || (enProduccion() ? null : 'your_jwt_secret');

// Orígenes que pueden llamar a la API, separados por coma. Acepta * dentro del nombre, por ejemplo
// https://negocios-inmobiliarios-*.vercel.app para los links de prueba de Vercel.
const origenesPermitidos = () =>
    (process.env.CORS_ORIGIN || '')
        .split(',')
        .map((origen) => origen.trim().replace(/\/$/, ''))
        .filter(Boolean);

// Frena el arranque en producción si falta algo imprescindible, con un mensaje que dice qué configurar
const validarConfiguracion = () => {
    if (!enProduccion()) return;
    const faltan = [];
    if (!process.env.MONGODB_URI && !process.env.DB_URI) faltan.push('MONGODB_URI');
    if (!process.env.JWT_SECRET) faltan.push('JWT_SECRET');
    else if (process.env.JWT_SECRET.length < 32) faltan.push('JWT_SECRET (al menos 32 caracteres)');
    if (origenesPermitidos().length === 0) faltan.push('CORS_ORIGIN (la dirección del frontend)');
    if (faltan.length) {
        throw new Error(`Faltan variables de entorno para producción: ${faltan.join(', ')}`);
    }
};

module.exports = {
    PORT: process.env.PORT || 4000,
    DB_URI: process.env.MONGODB_URI || process.env.DB_URI,
    enProduccion,
    jwtSecret,
    origenesPermitidos,
    validarConfiguracion,
};
