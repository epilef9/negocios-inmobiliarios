// Envío de mails. Elige el medio según lo configurado en el entorno (ver config/env.js).

const nodemailer = require('nodemailer');
const config = require('../config/env');

const escapar = (texto) =>
    String(texto).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// "Nombre <correo@dominio>" o solo el correo
const separarRemitente = (from) => {
    const m = /^\s*(.*?)\s*<([^>]+)>\s*$/.exec(from);
    return m ? { name: m[1].replace(/^"|"$/g, ''), email: m[2] } : { email: from.trim() };
};

let transporteSmtp = null;

const enviarPorBrevo = async ({ para, asunto, html, texto, responderA }, { brevoApiKey, from }) => {
    const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
            sender: separarRemitente(from),
            to: [{ email: para }],
            subject: asunto,
            htmlContent: html,
            textContent: texto,
            ...(responderA ? { replyTo: { email: responderA } } : {}),
        }),
    });
    if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => '');
        throw new Error(`Brevo rechazó el envío (${respuesta.status}) ${detalle}`.trim());
    }
};

const enviarPorSmtp = async ({ para, asunto, html, texto, responderA }, { smtp, from }) => {
    if (!transporteSmtp) transporteSmtp = nodemailer.createTransport(smtp);
    await transporteSmtp.sendMail({ from, to: para, subject: asunto, html, text: texto, replyTo: responderA });
};

/**
 * Manda un mail. Devuelve { simulado: true } cuando no hay ningún medio configurado en desarrollo.
 * En producción sin configuración, falla con un mensaje claro.
 */
const enviar = async (mensaje) => {
    const cfg = config.mailConfig();

    if (cfg.brevoApiKey) {
        if (!cfg.from) throw new Error('Falta MAIL_FROM (el remitente verificado en Brevo)');
        await enviarPorBrevo(mensaje, cfg);
        return { simulado: false };
    }
    if (cfg.smtp) {
        if (!cfg.from) throw new Error('Falta MAIL_FROM');
        await enviarPorSmtp(mensaje, cfg);
        return { simulado: false };
    }
    if (config.enProduccion()) {
        throw new Error('El envío de mails no está configurado (BREVO_API_KEY o SMTP_HOST)');
    }

    console.log(
        `\n[mail simulado] Para: ${mensaje.para}${mensaje.responderA ? ` · Responder a: ${mensaje.responderA}` : ''}\n` +
            `Asunto: ${mensaje.asunto}\n${mensaje.texto}\n`
    );
    return { simulado: true };
};

const enviarVerificacion = ({ para, nombre, enlace }) =>
    enviar({
        para,
        asunto: 'Confirmá tu email',
        texto: `Hola${nombre ? ` ${nombre}` : ''}, confirmá tu email para activar tu cuenta: ${enlace}\n\nEl enlace vale 24 horas. Si no creaste la cuenta, ignorá este mensaje.`,
        html: `<p>Hola${nombre ? ` ${escapar(nombre)}` : ''},</p>
<p>Confirmá tu email para activar tu cuenta:</p>
<p><a href="${escapar(enlace)}" style="display:inline-block;padding:12px 22px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:6px">Confirmar mi email</a></p>
<p style="color:#666;font-size:13px">El enlace vale 24 horas. Si no creaste la cuenta, ignorá este mensaje.</p>`,
    });

const enviarConsulta = ({ nombre, email, telefono, motivo, mensaje }) => {
    const para = config.mailConfig().contactoPara;
    if (!para && config.enProduccion()) throw new Error('Falta CONTACT_TO (el correo que recibe las consultas)');
    const filas = [
        ['Nombre', nombre],
        ['Email', email],
        ...(telefono ? [['Teléfono', telefono]] : []),
        ...(motivo ? [['Motivo', motivo]] : []),
    ];
    return enviar({
        para: para || 'consultas@localhost',
        responderA: email,
        asunto: `Consulta web${motivo ? ` · ${motivo}` : ''} · ${nombre}`,
        texto: `${filas.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${mensaje}`,
        html: `<table>${filas.map(([k, v]) => `<tr><td><b>${k}</b></td><td>${escapar(v)}</td></tr>`).join('')}</table>
<p style="white-space:pre-wrap">${escapar(mensaje)}</p>`,
    });
};

module.exports = { enviar, enviarVerificacion, enviarConsulta };
