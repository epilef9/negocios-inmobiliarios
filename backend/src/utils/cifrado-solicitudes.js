const crypto = require('node:crypto');

const obtenerClave = () => {
    const valor = process.env.SOLICITUDES_ENCRYPTION_KEY || '';
    if (!/^[\da-f]{64}$/i.test(valor)) {
        const error = new Error('Configurá SOLICITUDES_ENCRYPTION_KEY con una clave hexadecimal de 64 caracteres.');
        error.statusCode = 503;
        throw error;
    }
    return Buffer.from(valor, 'hex');
};

const cifrar = (contenido) => {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', obtenerClave(), iv);
    const cifrado = Buffer.concat([cipher.update(contenido), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), cifrado]);
};

const descifrar = (contenido) => {
    if (contenido.length < 29) throw new Error('El documento almacenado no tiene un formato válido.');
    const iv = contenido.subarray(0, 12);
    const tag = contenido.subarray(12, 28);
    const cifrado = contenido.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', obtenerClave(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(cifrado), decipher.final()]);
};

module.exports = { cifrar, descifrar, obtenerClave };
