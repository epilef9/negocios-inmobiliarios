// Enlaces de los mails de una visita (gestionar la visita, confirmar asistencia), para quien la pidió sin cuenta.
// Mismo patrón que los enlaces de auth.service: token aleatorio de 32 bytes en el mail y solo su hash en la base.
// Un enlace vale hasta que empieza la visita y mientras la visita siga en el estado en que se mandó.
const crypto = require('node:crypto');
const TokenVisita = require('../models/tokenVisita.model');
const Visita = require('../models/visita.model');
const agenda = require('./agenda.service');

const TOKEN_VALIDO = /^[a-f0-9]{64}$/;

const hashDe = (token) => crypto.createHash('sha256').update(token).digest('hex');

// Día y hora de la visita en Argentina (UTC-3 todo el año, sin horario de verano)
const inicioDeVisita = (visita) => {
    const fecha = agenda.fechaIso(visita.fecha);
    const hora = agenda.horaCorta(visita.horario);
    return fecha && hora ? new Date(`${fecha}T${hora}:00-03:00`) : null;
};

// Crea un enlace nuevo y anula los anteriores con el mismo propósito. Devuelve el token en claro (solo para
// el mail) o null si la visita ya pasó.
const emitir = async (visita, proposito, { unSoloUso = false } = {}) => {
    const expira = inicioDeVisita(visita);
    if (!expira || expira <= new Date()) return null;
    await TokenVisita.deleteMany({ visita: visita._id, proposito });
    const token = crypto.randomBytes(32).toString('hex');
    await TokenVisita.create({ visita: visita._id, proposito, hash: hashDe(token), expira, estadoAlEmitir: visita.estado, unSoloUso });
    return token;
};

// Devuelve { registro, visita } o null. No distingue entre token inexistente, vencido, usado o con la visita
// cambiada: quien prueba tokens al azar no se entera de nada.
const validar = async (token, proposito) => {
    if (typeof token !== 'string' || !TOKEN_VALIDO.test(token)) return null;
    const registro = await TokenVisita.findOne({ hash: hashDe(token), proposito, expira: { $gt: new Date() }, usadoAt: null }).lean();
    if (!registro) return null;
    const visita = await Visita.findById(registro.visita);
    if (!visita || visita.estado !== registro.estadoAlEmitir) return null;
    return { registro, visita };
};

// Marca usado un enlace de un solo uso. Atómico: si llegan dos clics a la vez, solo uno gana.
const consumir = async (registro) =>
    (await TokenVisita.updateOne({ _id: registro._id, usadoAt: null }, { $set: { usadoAt: new Date() } })).modifiedCount === 1;

// Anula los enlaces de una visita (todos, o los de un propósito)
const anular = (visitaId, proposito) => TokenVisita.deleteMany({ visita: visitaId, ...(proposito ? { proposito } : {}) });

module.exports = { emitir, validar, consumir, anular, inicioDeVisita };
