// 304: verificación «no soy un robot» con Cloudflare Turnstile (gratis y casi nunca pide resolver nada).
// Se verifica en el servidor ANTES de crear la cuenta o mandar la consulta: verificarlo solo en el navegador no sirve.
// Sin TURNSTILE_SECRET_KEY configurada (desarrollo, o mientras no se den de alta las claves) no frena nada.
const { enProduccion } = require('../config/env');

const URL_VERIFICAR = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const verificarCaptcha = async (req, res, next) => {
    const secreto = process.env.TURNSTILE_SECRET_KEY;
    const token = typeof req.body?.captchaToken === 'string' ? req.body.captchaToken : '';
    if (req.body) delete req.body.captchaToken;
    if (!secreto) return next();
    if (!token || token.length > 2048) {
        return res.status(400).json({ message: 'Completá la verificación «no soy un robot» y probá de nuevo.', code: 'CAPTCHA' });
    }
    try {
        const respuesta = await fetch(URL_VERIFICAR, {
            method: 'POST',
            headers: { 'content-type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ secret: secreto, response: token, remoteip: req.ip || '' }),
            signal: AbortSignal.timeout(5000),
        });
        const resultado = await respuesta.json();
        if (resultado.success) return next();
        return res.status(400).json({ message: 'No pudimos verificar que no seas un robot. Recargá la página y probá de nuevo.', code: 'CAPTCHA' });
    } catch (error) {
        console.error('[captcha] No se pudo verificar:', error.message);
        // Si Cloudflare no responde, en producción se frena (mejor que dejar pasar bots); en local sigue
        if (enProduccion()) return res.status(503).json({ message: 'No pudimos verificar el formulario. Probá de nuevo en un momento.', code: 'CAPTCHA' });
        return next();
    }
};

module.exports = { verificarCaptcha };
