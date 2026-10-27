// 223: recordatorios automáticos. Una vez por día (Vercel Cron):
//  1) mail a cada cliente el día antes de su visita, con la dirección y la hora;
//  2) un resumen para la inmobiliaria con los contratos que vencen en los próximos 60 días y los que
//     tienen que actualizar el precio por índice este mes.
// Lo mismo se muestra en el inicio del panel.
const Visita = require('../models/visita.model');
const Contrato = require('../models/contrato.model');
const agenda = require('./agenda.service');
const emailService = require('./email.service');
const config = require('../config/env');

const DIAS_AVISO_VENCIMIENTO = 60;
const ESTADOS_VIGENTES = ['activo', 'firmado', 'por_vencer'];
const MESES_AJUSTE = { Trimestral: 3, Cuatrimestral: 4, Semestral: 6, Anual: 12 };

const mesesEntre = (desdeIso, hastaIso) => {
    const [a1, m1] = desdeIso.split('-').map(Number);
    const [a2, m2] = hastaIso.split('-').map(Number);
    return (a2 - a1) * 12 + (m2 - m1);
};

// ¿Este mes le toca actualizar el precio? (cada N meses desde el inicio, sin contar el mes de inicio)
const tocaActualizar = (contrato, hoyIso) => {
    const inicio = agenda.fechaIso(contrato.fechaInicio);
    const fin = agenda.fechaIso(contrato.fechaFin);
    const cada = MESES_AJUSTE[contrato.ajuste];
    if (!inicio || !cada || (fin && fin < hoyIso)) return false;
    const meses = mesesEntre(inicio, hoyIso);
    return meses > 0 && meses % cada === 0;
};

const venceProntoDias = (contrato, hoyIso) => {
    const fin = agenda.fechaIso(contrato.fechaFin);
    if (!fin || fin < hoyIso) return null;
    const dias = Math.round((Date.parse(`${fin}T12:00:00Z`) - Date.parse(`${hoyIso}T12:00:00Z`)) / 86400000);
    return dias <= DIAS_AVISO_VENCIMIENTO ? dias : null;
};

const datosContrato = (c) => ({
    id: String(c._id),
    numero: c.numeroContrato,
    propiedad: c.propiedad?.titulo || '',
    cliente: [c.cliente?.nombre, c.cliente?.apellido].filter(Boolean).join(' '),
    fechaFin: agenda.fechaIso(c.fechaFin),
    ajuste: c.ajuste || '',
});

const resumenContratos = async (hoyIso) => {
    const contratos = await Contrato.find({ estado: { $in: ESTADOS_VIGENTES }, tipoContrato: { $ne: 'Compraventa' } })
        .select('numeroContrato propiedad cliente.nombre cliente.apellido fechaInicio fechaFin ajuste tipoContrato estado')
        .lean();
    const porVencer = contratos
        .map((c) => ({ c, dias: venceProntoDias(c, hoyIso) }))
        .filter((x) => x.dias !== null)
        .sort((a, b) => a.dias - b.dias)
        .map(({ c, dias }) => ({ ...datosContrato(c), dias }));
    const actualizan = contratos.filter((c) => c.tipoContrato !== 'Alquiler temporario' && tocaActualizar(c, hoyIso)).map(datosContrato);
    return { porVencer, actualizan };
};

const visitasDelDia = async (diaIso, { soloSinAviso = false } = {}) => {
    const visitas = await Visita.find({ estado: { $in: ['pendiente', 'confirmada', 'reprogramada'] }, ...(soloSinAviso ? { recordatorioEnviadoAt: null } : {}) })
        .select('cliente propiedad fecha horario estado recordatorioEnviadoAt')
        .lean();
    return visitas.filter((v) => agenda.fechaIso(v.fecha) === diaIso).sort((a, b) => String(agenda.horaCorta(a.horario)).localeCompare(String(agenda.horaCorta(b.horario))));
};

// Para el inicio del panel
const resumenPanel = async () => {
    const hoy = agenda.ahoraEnArgentina().fecha;
    const manana = agenda.sumarDias(hoy, 1);
    const [visitas, contratos] = await Promise.all([visitasDelDia(manana), resumenContratos(hoy)]);
    return {
        manana,
        visitasManana: visitas.map((v) => ({ id: String(v._id), cliente: v.cliente?.nombre || '', propiedad: v.propiedad?.titulo || '', hora: agenda.horaCorta(v.horario), estado: v.estado, avisado: Boolean(v.recordatorioEnviadoAt) })),
        ...contratos,
    };
};

const fechaLarga = (iso) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

// Lo que corre el cron. Cada mail que falla se registra y no frena a los demás.
const ejecutar = async () => {
    const hoy = agenda.ahoraEnArgentina().fecha;
    const manana = agenda.sumarDias(hoy, 1);
    const resultado = { visitasAvisadas: 0, visitasSinEmail: 0, errores: 0, contratosPorVencer: 0, contratosActualizan: 0, reservasVencidas: 0 };

    for (const v of await visitasDelDia(manana, { soloSinAviso: true })) {
        if (!v.cliente?.email) {
            resultado.visitasSinEmail++;
            continue;
        }
        // Se marca antes de mandar: si el cron se repite, no llega dos veces
        const { modifiedCount } = await Visita.updateOne({ _id: v._id, recordatorioEnviadoAt: null }, { $set: { recordatorioEnviadoAt: new Date() } });
        if (!modifiedCount) continue;
        try {
            await emailService.avisarCliente({
                para: v.cliente.email,
                nombre: v.cliente.nombre,
                asunto: `Mañana es tu visita a ${v.propiedad?.titulo || 'la propiedad'}`,
                parrafos: [
                    `Te recordamos la visita de mañana, ${fechaLarga(manana)}, a las ${agenda.horaCorta(v.horario)} h.`,
                    `Propiedad: ${v.propiedad?.titulo || ''}${v.propiedad?.direccion ? `\nDirección: ${v.propiedad.direccion}` : ''}`,
                    'Si no vas a poder ir, cancelala desde Mi cuenta o avisanos por WhatsApp así le damos el horario a otra persona.',
                ],
                boton: 'Ver mis visitas',
                enlace: `${config.urlFrontend()}/visitas`,
                pie: 'Araceli Balbuena · Negocios Inmobiliarios',
            });
            resultado.visitasAvisadas++;
        } catch (error) {
            resultado.errores++;
            await Visita.updateOne({ _id: v._id }, { $set: { recordatorioEnviadoAt: null } });
            console.error('No se pudo mandar el recordatorio de visita:', error.message);
        }
    }

    const { porVencer, actualizan } = await resumenContratos(hoy);
    resultado.contratosPorVencer = porVencer.length;
    resultado.contratosActualizan = actualizan.length;
    // El resumen de contratos va los lunes (o el día 1), para no mandar el mismo mail todos los días
    const diaSemana = new Date(`${hoy}T12:00:00Z`).getUTCDay();
    if ((porVencer.length || actualizan.length) && (diaSemana === 1 || hoy.endsWith('-01'))) {
        try {
            await emailService.avisarInmobiliaria({
                asunto: 'Contratos para revisar esta semana',
                intro: 'Resumen automático de contratos de alquiler.',
                filas: [
                    ...porVencer.map((c) => [`Vence en ${c.dias} días`, `${c.propiedad} · ${c.cliente} (n.º ${c.numero}, ${c.fechaFin})`]),
                    ...actualizan.map((c) => ['Actualiza precio este mes', `${c.propiedad} · ${c.cliente} (n.º ${c.numero}, ajuste ${c.ajuste.toLowerCase()})`]),
                ],
                enlace: `${config.urlFrontend()}/admin/contratos`,
                boton: 'Ver los contratos',
            });
        } catch (error) {
            resultado.errores++;
            console.error('No se pudo mandar el resumen de contratos:', error.message);
        }
    }

    resultado.reservasVencidas = await require('./reservasPropiedad.service').vencerReservas();
    return resultado;
};

module.exports = { tocaActualizar, venceProntoDias, mesesEntre, resumenPanel, ejecutar, DIAS_AVISO_VENCIMIENTO };
