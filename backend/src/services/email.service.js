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

// Botón y pie comunes de los mails con enlace
const mailConEnlace = ({ para, asunto, saludo, cuerpo, boton, enlace, pie }) =>
    enviar({
        para,
        asunto,
        texto: `${saludo}\n\n${cuerpo}\n${enlace}\n\n${pie}`,
        html: `<p>${escapar(saludo)}</p>
<p>${escapar(cuerpo)}</p>
<p><a href="${escapar(enlace)}" style="display:inline-block;padding:12px 22px;background:#1a1a1a;color:#fff;text-decoration:none;border-radius:6px">${escapar(boton)}</a></p>
<p style="color:#666;font-size:13px">${escapar(pie)}</p>`,
    });

const enviarRestablecimiento = ({ para, nombre, enlace, minutos }) =>
    mailConEnlace({
        para,
        asunto: 'Cambiá tu contraseña',
        saludo: `Hola${nombre ? ` ${nombre}` : ''},`,
        cuerpo: 'Recibimos un pedido para cambiar la contraseña de tu cuenta en Negocios Inmobiliarios. Para elegir una nueva, entrá a este enlace:',
        boton: 'Elegir contraseña nueva',
        enlace,
        pie: `El enlace vale ${minutos} minutos y se puede usar una sola vez. Si no lo pediste, ignorá este mail: tu contraseña sigue siendo la misma.`,
    });

const enviarCambioEmail = ({ para, nombre, enlace }) =>
    mailConEnlace({
        para,
        asunto: 'Confirmá tu nuevo email',
        saludo: `Hola${nombre ? ` ${nombre}` : ''},`,
        cuerpo: 'Pediste usar este email en tu cuenta de Negocios Inmobiliarios. Confirmalo desde este enlace:',
        boton: 'Confirmar nuevo email',
        enlace,
        pie: 'El enlace vale 24 horas. Hasta que lo confirmes seguís ingresando con tu email anterior. Si no fuiste vos, ignorá este mail.',
    });

// Aviso al email anterior, por si el cambio no lo hizo la persona dueña de la cuenta
const avisarEmailCambiado = ({ para, nombre, nuevo }) =>
    enviar({
        para,
        asunto: 'Cambió el email de tu cuenta',
        texto: `Hola${nombre ? ` ${nombre}` : ''}, el email de tu cuenta en Negocios Inmobiliarios ahora es ${nuevo}. Si no fuiste vos, respondé este mail o escribinos por WhatsApp.`,
        html: `<p>Hola${nombre ? ` ${escapar(nombre)}` : ''},</p><p>El email de tu cuenta en Negocios Inmobiliarios ahora es <b>${escapar(nuevo)}</b>.</p><p style="color:#666;font-size:13px">Si no fuiste vos, respondé este mail o escribinos por WhatsApp.</p>`,
    });

const avisarPasswordCambiada = ({ para, nombre }) =>
    enviar({
        para,
        asunto: 'Cambiaste tu contraseña',
        texto: `Hola${nombre ? ` ${nombre}` : ''}, la contraseña de tu cuenta en Negocios Inmobiliarios se cambió recién y se cerraron las sesiones abiertas. Si no fuiste vos, pedí un enlace nuevo desde "¿La olvidaste?" y escribinos.`,
        html: `<p>Hola${nombre ? ` ${escapar(nombre)}` : ''},</p><p>La contraseña de tu cuenta en Negocios Inmobiliarios se cambió recién y se cerraron las sesiones abiertas.</p><p style="color:#666;font-size:13px">Si no fuiste vos, pedí un enlace nuevo desde «¿La olvidaste?» en el ingreso y escribinos.</p>`,
    });

const avisarSolicitudPublicacionAprobada = ({ para, nombre, direccion }) =>
    enviar({
        para,
        asunto: '¡Tu solicitud de publicación fue aprobada!',
        texto: `Hola${nombre ? ` ${nombre}` : ''}, te informamos que tu pedido de publicación para la propiedad en ${direccion} fue aprobado por el equipo de Araceli Balbuena Negocios Inmobiliarios. Ya se encuentra dada de alta en nuestro catálogo.`,
        html: `<p>Hola${nombre ? ` ${escapar(nombre)}` : ''},</p><p>Te informamos que tu pedido de publicación para la propiedad en <b>${escapar(direccion)}</b> fue <b>aprobado</b> por nuestro equipo.</p><p>Ya se encuentra dada de alta en nuestro catálogo de propiedades con vos como propietario/a.</p><p style="color:#666;font-size:13px">Cualquier consulta no dudes en comunicarte con nosotros.</p>`,
    });

const avisarSolicitudPublicacionRechazada = ({ para, nombre, direccion, motivo }) =>
    enviar({
        para,
        asunto: 'Actualización sobre tu solicitud de publicación',
        texto: `Hola${nombre ? ` ${nombre}` : ''}, te informamos que tu pedido de publicación para la propiedad en ${direccion} no pudo ser aprobado. Motivo: ${motivo || 'No cumple con los criterios de publicación'}.`,
        html: `<p>Hola${nombre ? ` ${escapar(nombre)}` : ''},</p><p>Te informamos sobre tu pedido de publicación para la propiedad en <b>${escapar(direccion)}</b>.</p><p>Motivo: <i>${escapar(motivo || 'No cumple con los criterios de publicación')}</i>.</p><p style="color:#666;font-size:13px">Si tenés dudas o querés corregir la información, podés contactarnos por WhatsApp o teléfono.</p>`,
    });

module.exports = {
    enviar,
    enviarVerificacion,
    enviarConsulta,
    enviarRestablecimiento,
    enviarCambioEmail,
    avisarEmailCambiado,
    avisarPasswordCambiada,
    avisarSolicitudPublicacionAprobada,
    avisarSolicitudPublicacionRechazada,
};
