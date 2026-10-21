// Guarda las fotos de las propiedades en Cloudinary cuando está configurado (CLOUDINARY_URL).
// Sin esa variable se guardan en la carpeta uploads del servidor, como en desarrollo.
// En el hosting (Render, Vercel) el disco se borra al reiniciar, por eso en producción hace falta Cloudinary.

const crypto = require('node:crypto');

const CARPETA = process.env.CLOUDINARY_FOLDER || 'negocios-inmobiliarios/propiedades';
// Límite del plan gratis de Cloudinary por imagen
const MAXIMO_CLOUDINARY = 10 * 1024 * 1024;

// CLOUDINARY_URL tiene la forma cloudinary://API_KEY:API_SECRET@CLOUD_NAME (se copia del panel de Cloudinary)
const credenciales = () => {
    const valor = process.env.CLOUDINARY_URL;
    if (!valor) return null;
    try {
        const url = new URL(valor);
        const datos = {
            nube: url.hostname,
            clave: decodeURIComponent(url.username),
            secreto: decodeURIComponent(url.password),
        };
        return datos.nube && datos.clave && datos.secreto ? datos : null;
    } catch {
        return null;
    }
};

const usaCloudinary = () => Boolean(credenciales());

// Firma que pide Cloudinary: parámetros ordenados alfabéticamente + el secreto, en SHA-1
const firmar = (parametros, secreto) => {
    const texto = Object.keys(parametros)
        .sort()
        .map((clave) => `${clave}=${parametros[clave]}`)
        .join('&');
    return crypto.createHash('sha1').update(texto + secreto).digest('hex');
};

// Sube una imagen y devuelve su dirección pública (https)
const subirACloudinary = async (contenido, tipo, nombre) => {
    const datos = credenciales();
    if (!datos) throw new Error('Cloudinary no está configurado (falta CLOUDINARY_URL)');
    if (contenido.length > MAXIMO_CLOUDINARY) {
        const error = new Error(`"${nombre}" pesa más de 10 MB, el máximo para fotos`);
        error.statusCode = 413;
        throw error;
    }

    const parametros = { folder: CARPETA, timestamp: Math.floor(Date.now() / 1000) };
    const formulario = new FormData();
    formulario.append('file', new Blob([contenido], { type: tipo }), nombre);
    formulario.append('api_key', datos.clave);
    formulario.append('timestamp', String(parametros.timestamp));
    formulario.append('folder', parametros.folder);
    formulario.append('signature', firmar(parametros, datos.secreto));

    const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${datos.nube}/image/upload`, {
        method: 'POST',
        body: formulario,
    });
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || !cuerpo.secure_url) {
        throw new Error(`Cloudinary rechazó "${nombre}": ${cuerpo.error?.message || respuesta.status}`);
    }
    return cuerpo.secure_url;
};

// Sube una imagen que ya está en internet: Cloudinary la descarga por su cuenta.
// Con un nombre fijo (idPublico) volver a correrlo no duplica fotos: devuelve la que ya estaba.
const subirUrlACloudinary = async (direccion, idPublico) => {
    const datos = credenciales();
    if (!datos) throw new Error('Cloudinary no está configurado (falta CLOUDINARY_URL)');

    const parametros = { folder: CARPETA, overwrite: 'false', public_id: idPublico, timestamp: Math.floor(Date.now() / 1000) };
    const formulario = new FormData();
    formulario.append('file', direccion);
    formulario.append('api_key', datos.clave);
    Object.entries(parametros).forEach(([clave, valor]) => formulario.append(clave, String(valor)));
    formulario.append('signature', firmar(parametros, datos.secreto));

    const respuesta = await fetch(`https://api.cloudinary.com/v1_1/${datos.nube}/image/upload`, {
        method: 'POST',
        body: formulario,
    });
    const cuerpo = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok || !cuerpo.secure_url) {
        throw new Error(`Cloudinary rechazó "${idPublico}": ${cuerpo.error?.message || respuesta.status}`);
    }
    return cuerpo.secure_url;
};

module.exports = { usaCloudinary, subirACloudinary, subirUrlACloudinary, firmar, MAXIMO_CLOUDINARY };
