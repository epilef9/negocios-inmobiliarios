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

// Dirección del frontend, para armar los links que van en los mails (verificación de cuenta)
const urlFrontend = () =>
    (process.env.FRONTEND_URL || (process.env.FRONTEND_URLS || '').split(',')[0] || 'http://localhost:3000')
        .trim()
        .replace(/\/$/, '');

// Envío de mails. Dos formas, las dos gratis:
//  - BREVO_API_KEY: API web de Brevo (300 mails por día). Es la que funciona en Render gratis, que bloquea el SMTP.
//  - SMTP_HOST/SMTP_USER/SMTP_PASS: cualquier SMTP, por ejemplo Gmail con una contraseña de aplicación.
// Sin ninguna de las dos, en desarrollo los mails se muestran en la consola del backend.
const mailConfig = () => ({
    brevoApiKey: process.env.BREVO_API_KEY || '',
    smtp: process.env.SMTP_HOST
        ? {
              host: process.env.SMTP_HOST,
              port: Number(process.env.SMTP_PORT) || 587,
              secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true',
              // Google muestra la contraseña de aplicación en grupos de 4 con espacios; sin ellos es la misma
              auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: (process.env.SMTP_PASS || '').replace(/\s+/g, '') } : undefined,
          }
        : null,
    from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
    // A dónde llegan las consultas del formulario de contacto
    contactoPara: process.env.CONTACT_TO || process.env.MAIL_FROM || process.env.SMTP_USER || '',
});

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
    urlFrontend,
    mailConfig,
    validarConfiguracion,
};
