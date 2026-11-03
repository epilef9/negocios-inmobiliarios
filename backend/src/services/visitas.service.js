const visitasRepository = require('../repositories/visitas.repository');
const agenda = require('./agenda.service');
const emailService = require('./email.service');
const config = require('../config/env');
const tokensVisita = require('./tokensVisita.service');

const ENLACE_INVALIDO = 'Este enlace no es válido o ya venció. Si necesitás cambiar tu visita, escribinos por WhatsApp.';

// Estados en los que el cliente todavía puede cancelar su visita
const CANCELABLES = ['pendiente', 'confirmada', 'reprogramada'];

// Se puede cancelar si no se canceló/rechazó y todavía no llegó el día y la hora de la visita
const puedeCancelar = (visita, ahora = agenda.ahoraEnArgentina()) => {
    if (!visita || !CANCELABLES.includes(visita.estado)) return false;
    const fecha = agenda.fechaIso(visita.fecha);
    const hora = agenda.horaCorta(visita.horario);
    if (!fecha || !hora) return false;
    if (fecha !== ahora.fecha) return fecha > ahora.fecha;
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m > ahora.minutos;
};

const cuandoEs = (visita) => {
    const fecha = agenda.fechaIso(visita.fecha);
    const hora = agenda.horaCorta(visita.horario);
    return fecha && hora ? `${agenda.fechaLarga(fecha)} a las ${hora} h` : `${visita.fecha} · ${visita.horario}`;
};

const TEXTOS_GESTION = {
    agendada: { asunto: 'Recibimos tu pedido de visita', intro: (cuando) => `Pediste visitar la propiedad el ${cuando}. Te avisamos por mail cuando la confirmemos.` },
    confirmada: { asunto: 'Tu visita está confirmada', intro: (cuando) => `Tu visita quedó confirmada para el ${cuando}. Te esperamos.` },
    reprogramada: { asunto: 'Cambiamos el horario de tu visita', intro: (cuando) => `Reprogramamos tu visita para el ${cuando}.` },
    cambiada: { asunto: 'Recibimos tu cambio de horario', intro: (cuando) => `Pediste pasar tu visita al ${cuando}. Te avisamos cuando la confirmemos.` },
};

// Mail al cliente con el botón "Gestionar mi visita" (enlace nuevo: el anterior deja de valer).
// Devuelve el token emitido o null. Nunca tira error: si el mail falla, la visita queda igual.
const avisarGestion = async (visita, motivo) => {
    if (!visita?.cliente?.email) return null;
    let token = null;
    try {
        const textos = TEXTOS_GESTION[motivo];
        const sitio = config.urlPublica();
        token = sitio ? await tokensVisita.emitir(visita, 'gestion') : null;
        const { titulo = 'la propiedad', direccion } = visita.propiedad || {};
        await emailService.avisarCliente({
            para: visita.cliente.email,
            nombre: visita.cliente.nombre,
            asunto: `${textos.asunto} · ${titulo}`,
            parrafos: [textos.intro(cuandoEs(visita)), `Propiedad: ${titulo}${direccion ? `\nDirección: ${direccion}` : ''}`],
            ...(token ? { boton: 'Gestionar mi visita', enlace: `${sitio}/visitas/gestionar#t=${token}` } : {}),
            pie: token
                ? 'Desde el botón podés ver tu visita, cancelarla o pedir otro horario. El enlace vale hasta el día de la visita. Araceli Balbuena · Negocios Inmobiliarios'
                : 'Si necesitás cambiar algo, escribinos por WhatsApp. Araceli Balbuena · Negocios Inmobiliarios',
        });
    } catch (error) {
        console.error('No se pudo mandar el mail de la visita:', error.message);
    }
    return token;
};

// Lo que ve quien abre el enlace: sin teléfono ni email
const datosGestion = (visita) => ({
    nombre: String(visita.cliente?.nombre || '').split(' ')[0],
    propiedad: { id: visita.propiedad?.id || '', titulo: visita.propiedad?.titulo || '', direccion: visita.propiedad?.direccion || '' },
    fecha: agenda.fechaIso(visita.fecha),
    horario: agenda.horaCorta(visita.horario),
    estado: visita.estado,
    cancelable: puedeCancelar(visita),
});

const INITIAL_SEED_VISITAS = [
    {
        cliente: {
            nombre: 'Martina López',
            telefono: '+54 9 343 555 1234',
            email: 'martina.lopez@gmail.com',
            iniciales: 'ML',
        },
        propiedad: {
            titulo: 'Dpto. 2 amb. Centro',
            direccion: 'San Martín 840, Paraná',
            precio: 'USD 55.000',
        },
        fecha: '08/07/2026',
        horario: '10:30 h',
        estado: 'pendiente',
        notaAdicional: 'Interesada en ver las condiciones de iluminación y expensas.',
    },
    {
        cliente: {
            nombre: 'Federico Soria',
            telefono: '+54 9 343 555 5678',
            email: 'fede.soria@hotmail.com',
            iniciales: 'FS',
        },
        propiedad: {
            titulo: 'Casa 3 dorm. Oro Verde',
            direccion: 'Los Tilos 340, Oro Verde',
            precio: 'USD 120.000',
        },
        fecha: '09/07/2026',
        horario: '16:00 h',
        estado: 'confirmada',
        notaAdicional: 'Asistirá con su pareja. Solicita ver el patio y la cochera.',
    },
    {
        cliente: {
            nombre: 'Carla Méndez',
            telefono: '+54 9 343 555 6102',
            email: 'carla.mendez@yahoo.com',
            iniciales: 'CM',
        },
        propiedad: {
            titulo: 'Dpto. monoambiente Centro',
            direccion: 'Urquiza 1120, Paraná',
            precio: 'USD 38.000',
        },
        fecha: '09/07/2026',
        horario: '11:00 h',
        estado: 'pendiente',
        notaAdicional: 'Consulta si aceptan mascota pequeña.',
    },
    {
        cliente: {
            nombre: 'Joaquín Pérez',
            telefono: '+54 9 343 555 3344',
            email: 'joaquin.perez@live.com',
            iniciales: 'JP',
        },
        propiedad: {
            titulo: 'Local comercial San Martín',
            direccion: 'San Martín 450, Paraná',
            precio: 'ARS 450.000 / mes',
        },
        fecha: '10/07/2026',
        horario: '09:00 h',
        estado: 'reprogramada',
        notaAdicional: 'Reprogramada a pedido del cliente por motivos laborales.',
    },
    {
        cliente: {
            nombre: 'Sofía Ramírez',
            telefono: '+54 9 343 555 7766',
            email: 'sofia.ramirez@gmail.com',
            iniciales: 'SR',
        },
        propiedad: {
            titulo: 'Casa 4 dorm. Bajada Grande',
            direccion: 'Larramendi 2240, Paraná',
            precio: 'USD 145.000',
        },
        fecha: '11/07/2026',
        horario: '17:30 h',
        estado: 'confirmada',
        notaAdicional: 'Confirmada telefónicamente.',
    },
    {
        cliente: {
            nombre: 'Lucas Benítez',
            telefono: '+54 9 343 555 8899',
            email: 'lucas.benitez@gmail.com',
            iniciales: 'LB',
        },
        propiedad: {
            titulo: 'Dpto. 1 dorm. Parque Urquiza',
            direccion: 'Mitre 250, Paraná',
            precio: 'USD 62.000',
        },
        fecha: '12/07/2026',
        horario: '14:00 h',
        estado: 'rechazada',
        motivoRechazo: 'El propietario no tiene disponibilidad en ese horario.',
    },
    {
        cliente: {
            nombre: 'Mariana Gómez',
            telefono: '+54 9 343 555 9911',
            email: 'mariana.gomez@gmail.com',
            iniciales: 'MG',
        },
        propiedad: {
            titulo: 'Casa quinta Las Colinas',
            direccion: 'Ruta 11 Km 15, Oro Verde',
            precio: 'USD 95.000',
        },
        fecha: '13/07/2026',
        horario: '18:00 h',
        estado: 'rechazada',
        motivoRechazo: 'Propiedad con seña previa en trámite.',
    },
    {
        cliente: {
            nombre: 'Gonzalo Fernández',
            telefono: '+54 9 343 555 2233',
            email: 'gonzalo.f@gmail.com',
            iniciales: 'GF',
        },
        propiedad: {
            titulo: 'Dpto. 3 amb. Costanera',
            direccion: 'Güemes 120, Paraná',
            precio: 'USD 115.000',
        },
        fecha: '14/07/2026',
        horario: '10:00 h',
        estado: 'pendiente',
    },
    {
        cliente: {
            nombre: 'Valentina Rossi',
            telefono: '+54 9 343 555 4455',
            email: 'valen.rossi@gmail.com',
            iniciales: 'VR',
        },
        propiedad: {
            titulo: 'Local céntrico Peatonal',
            direccion: 'Peatonal San Martín 680, Paraná',
            precio: 'ARS 600.000 / mes',
        },
        fecha: '15/07/2026',
        horario: '11:30 h',
        estado: 'pendiente',
    },
    {
        cliente: {
            nombre: 'Mateo Álvarez',
            telefono: '+54 9 343 555 6677',
            email: 'mateo.alvarez@gmail.com',
            iniciales: 'MA',
        },
        propiedad: {
            titulo: 'Casa 2 dorm. San Agustín',
            direccion: 'Galán 1420, Paraná',
            precio: 'USD 70.000',
        },
        fecha: '16/07/2026',
        horario: '15:30 h',
        estado: 'pendiente',
    },
    {
        cliente: {
            nombre: 'Camila Torres',
            telefono: '+54 9 343 555 1122',
            email: 'cami.torres@gmail.com',
            iniciales: 'CT',
        },
        propiedad: {
            titulo: 'Dpto. 2 amb. Balcón al Río',
            direccion: 'Laurencena 410, Paraná',
            precio: 'USD 88.000',
        },
        fecha: '17/07/2026',
        horario: '16:30 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Diego Navarro',
            telefono: '+54 9 343 555 3322',
            email: 'diego.navarro@gmail.com',
            iniciales: 'DN',
        },
        propiedad: {
            titulo: 'Oficina céntrica equipada',
            direccion: '25 de Mayo 180, Paraná',
            precio: 'ARS 350.000 / mes',
        },
        fecha: '18/07/2026',
        horario: '09:30 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Lucía Morales',
            telefono: '+54 9 343 555 9988',
            email: 'lucia.morales@gmail.com',
            iniciales: 'LM',
        },
        propiedad: {
            titulo: 'Casa estilo clásico',
            direccion: 'Alameda de la Federación 320, Paraná',
            precio: 'USD 160.000',
        },
        fecha: '19/07/2026',
        horario: '11:00 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Esteban Díaz',
            telefono: '+54 9 343 555 4411',
            email: 'esteban.diaz@gmail.com',
            iniciales: 'ED',
        },
        propiedad: {
            titulo: 'Terreno 500m2 loteo cerrado',
            direccion: 'Acceso Norte, Paraná',
            precio: 'USD 32.000',
        },
        fecha: '20/07/2026',
        horario: '15:00 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Florencia Castro',
            telefono: '+54 9 343 555 7722',
            email: 'flor.castro@gmail.com',
            iniciales: 'FC',
        },
        propiedad: {
            titulo: 'Dpto. semipiso c/cochera',
            direccion: 'Santa Fe 290, Paraná',
            precio: 'USD 130.000',
        },
        fecha: '21/07/2026',
        horario: '17:00 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Javier Romero',
            telefono: '+54 9 343 555 8833',
            email: 'javier.romero@gmail.com',
            iniciales: 'JR',
        },
        propiedad: {
            titulo: 'Monoambiente a estrenar',
            direccion: 'Gualeguaychú 520, Paraná',
            precio: 'USD 42.000',
        },
        fecha: '22/07/2026',
        horario: '10:30 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Paula Herrera',
            telefono: '+54 9 343 555 2211',
            email: 'paula.herrera@gmail.com',
            iniciales: 'PH',
        },
        propiedad: {
            titulo: 'Galpón industrial 300m2',
            direccion: 'Almafuerte 3100, Paraná',
            precio: 'ARS 850.000 / mes',
        },
        fecha: '23/07/2026',
        horario: '16:00 h',
        estado: 'confirmada',
    },
    {
        cliente: {
            nombre: 'Agustín Giménez',
            telefono: '+54 9 343 555 6644',
            email: 'agustin.gimenez@gmail.com',
            iniciales: 'AG',
        },
        propiedad: {
            titulo: 'Casa con pileta y quincho',
            direccion: 'Bv. Racedo 780, Paraná',
            precio: 'USD 175.000',
        },
        fecha: '24/07/2026',
        horario: '18:00 h',
        estado: 'confirmada',
    },
];

class VisitasService {
    async getAllVisitas(filters = {}) {
        // Las visitas de ejemplo solo se cargan en desarrollo: en el sitio publicado serían datos inventados
        if (process.env.NODE_ENV !== 'production') {
            const count = await visitasRepository.countVisitas();
            if (count === 0) {
                await this.seedDefaultVisitas();
            }
        }
        return visitasRepository.getAllVisitas(filters);
    }

    async getVisitaById(id) {
        return visitasRepository.getVisitaById(id);
    }

    async createVisita(data, opciones = {}) {
        const normalized = { ...data };
        if (normalized.cliente && !normalized.cliente.iniciales && normalized.cliente.nombre) {
            normalized.cliente.iniciales = normalized.cliente.nombre
                .split(' ')
                .filter(Boolean)
                .slice(0, 2)
                .map((word) => word[0]?.toUpperCase() || '')
                .join('') || 'CL';
        }
        return visitasRepository.createVisita(normalized, opciones);
    }

    async updateVisita(id, data) {
        return visitasRepository.updateVisita(id, data);
    }

    // Cambia el estado. Si trae fecha u horario nuevos (reprogramar), el turno se controla en la agenda:
    // devuelve { visita } o { motivo } cuando el horario nuevo está ocupado o la oficina cierra ese día.
    // Al confirmarla o reprogramarla se le manda al cliente un mail con un enlace nuevo para gestionarla.
    async updateEstadoVisita(id, estado, extra = {}) {
        const updateData = { estado };
        if (extra.motivo !== undefined) {
            updateData.motivoRechazo = extra.motivo;
        }

        const actual = await visitasRepository.getVisitaById(id);
        if (!actual) return { visita: null };
        const cambiaDia = Boolean(extra.nuevaFecha || extra.nuevoHorario);

        let resultado;
        if (!cambiaDia) {
            resultado = { visita: await visitasRepository.updateVisita(id, updateData) };
        } else {
            updateData.fecha = extra.nuevaFecha || actual.fecha;
            updateData.horario = extra.nuevoHorario || actual.horario;
            // Día nuevo: el recordatorio y la respuesta de asistencia eran del anterior
            updateData.recordatorioEnviadoAt = null;
            updateData.asistencia = { respuesta: null, respondidaAt: null };
            resultado = await agenda.reprogramar(id, updateData.fecha, updateData.horario, (session) =>
                visitasRepository.updateVisita(id, updateData, { session })
            );
        }

        const { visita } = resultado;
        if (visita && cambiaDia) await tokensVisita.anular(id, 'asistencia');
        if (visita && ['confirmada', 'reprogramada'].includes(estado) && (estado !== actual.estado || cambiaDia)) {
            await avisarGestion(visita, estado);
        }
        return resultado;
    }

    // HU-34: las visitas del cliente, cada una con si todavía la puede cancelar
    async getMisVisitas(user) {
        const visitas = await visitasRepository.getVisitasDeUsuario(user._id, user.email);
        const ahora = agenda.ahoraEnArgentina();
        return visitas.map((v) => ({ ...v, cancelable: puedeCancelar(v, ahora) }));
    }

    // HU-34: el cliente cancela una visita suya que todavía no pasó. Al quedar "cancelada" el turno se libera.
    // Devuelve { visita } o { error, status }.
    async cancelarMiVisita(id, user, motivo = '') {
        const visita = await visitasRepository.getVisitaById(id);
        const email = String(user.email || '').toLowerCase().trim();
        const esSuya =
            visita &&
            ((visita.usuario && String(visita.usuario) === String(user._id)) ||
                (!visita.usuario && email && String(visita.cliente?.email || '').toLowerCase() === email));
        if (!esSuya) return { status: 404, error: 'No encontramos esa visita en tu cuenta.' };
        if (!puedeCancelar(visita)) return { status: 409, error: 'Esta visita ya no se puede cancelar.' };
        return { visita: await this.cancelar(visita, motivo, 'Mi cuenta') };
    }

    // Cancela (el turno queda libre al dejar de estar pendiente/confirmada/reprogramada), anula los enlaces
    // de los mails y avisa a la inmobiliaria. `origen` dice desde dónde: "Mi cuenta", "el enlace del mail"...
    // `extra`: otros campos a guardar en el mismo cambio.
    async cancelar(visita, motivo, origen, extra = {}) {
        const actualizada = await visitasRepository.updateVisita(visita._id, {
            ...extra,
            estado: 'cancelada',
            canceladaAt: new Date(),
            motivoCancelacion: motivo,
        });
        await tokensVisita.anular(visita._id);
        // Se avisa a la inmobiliaria; si el mail falla, la cancelación igual queda hecha
        await emailService
            .avisarInmobiliaria({
                asunto: `Visita cancelada · ${visita.propiedad?.titulo || 'Propiedad'}`,
                intro: `Un cliente canceló su visita desde ${origen}. El horario quedó libre en la agenda.`,
                filas: [
                    ['Cliente', visita.cliente?.nombre || ''],
                    ['Teléfono', visita.cliente?.telefono || ''],
                    ['Propiedad', visita.propiedad?.titulo || ''],
                    ['Día y hora', `${visita.fecha} · ${visita.horario}`],
                    ...(motivo ? [['Motivo', motivo]] : []),
                ],
                enlace: `${config.urlFrontend()}/admin/visitas`,
                boton: 'Ver las visitas',
            })
            .catch((error) => console.error('No se pudo avisar la cancelación de la visita:', error.message));
        return actualizada;
    }

    // Desde el enlace del mail (sin cuenta). Todas devuelven { status: 404 } igual para cualquier enlace que no sirva.
    async verPorToken(token) {
        const valido = await tokensVisita.validar(token, 'gestion');
        return valido ? { visita: datosGestion(valido.visita) } : { status: 404, error: ENLACE_INVALIDO };
    }

    async cancelarPorToken(token, motivo = '') {
        const valido = await tokensVisita.validar(token, 'gestion');
        if (!valido) return { status: 404, error: ENLACE_INVALIDO };
        if (!puedeCancelar(valido.visita)) return { status: 409, error: 'Esta visita ya no se puede cancelar.' };
        return { visita: datosGestion(await this.cancelar(valido.visita, motivo, 'el enlace del mail')) };
    }

    // Pasa la visita a otro turno libre (dentro del horario de atención) y vuelve a "pendiente" para que la
    // inmobiliaria la confirme. Devuelve también el enlace nuevo, que reemplaza al que tenía abierto.
    async reprogramarPorToken(token, fechaIso, hora) {
        const valido = await tokensVisita.validar(token, 'gestion');
        if (!valido) return { status: 404, error: ENLACE_INVALIDO };
        const anterior = valido.visita;
        if (!puedeCancelar(anterior)) return { status: 409, error: 'Esta visita ya no se puede cambiar.' };
        if (!/^\d{4}-\d{2}-\d{2}$/.test(fechaIso) || !/^\d{2}:\d{2}$/.test(hora)) {
            return { status: 400, error: 'Elegí un día y un horario.' };
        }
        const [a, m, d] = fechaIso.split('-');
        // Mismo formato que guarda "Agendar una visita"
        const datos = {
            fecha: `${d}/${m}/${a}`,
            horario: `${hora} h`,
            estado: 'pendiente',
            recordatorioEnviadoAt: null,
            asistencia: { respuesta: null, respondidaAt: null },
        };
        const { motivo, visita } = await agenda.reprogramar(
            anterior._id,
            datos.fecha,
            datos.horario,
            (session) => visitasRepository.updateVisita(anterior._id, datos, { session }),
            { controlarHorario: true }
        );
        if (motivo) return { status: 409, error: motivo, code: 'HORARIO_NO_DISPONIBLE' };

        // Si ya le había llegado el recordatorio, esos botones eran del día anterior
        await tokensVisita.anular(anterior._id, 'asistencia');
        const nuevo = await avisarGestion(visita, 'cambiada');
        await emailService
            .avisarInmobiliaria({
                asunto: `Cambio de horario de visita · ${visita.propiedad?.titulo || 'Propiedad'}`,
                intro: 'Un cliente pidió otro horario desde el enlace del mail. La visita quedó pendiente de confirmar.',
                filas: [
                    ['Cliente', visita.cliente?.nombre || ''],
                    ['Teléfono', visita.cliente?.telefono || ''],
                    ['Propiedad', visita.propiedad?.titulo || ''],
                    ['Antes', `${anterior.fecha} · ${anterior.horario}`],
                    ['Ahora', `${visita.fecha} · ${visita.horario}`],
                ],
                enlace: `${config.urlFrontend()}/admin/visitas`,
                boton: 'Ver las visitas',
            })
            .catch((error) => console.error('No se pudo avisar el cambio de horario de la visita:', error.message));
        return { visita: datosGestion(visita), token: nuevo };
    }

    // Botones del recordatorio del día anterior. El enlace es de un solo uso.
    async verAsistencia(token) {
        const valido = await tokensVisita.validar(token, 'asistencia');
        return valido ? { visita: datosGestion(valido.visita) } : { status: 404, error: ENLACE_INVALIDO };
    }

    // "confirmo" la deja registrada (el panel lo muestra); "no_voy" la cancela y libera el horario
    async responderAsistencia(token, respuesta) {
        if (!['confirmo', 'no_voy'].includes(respuesta)) return { status: 400, error: 'Elegí si vas a poder ir o no.' };
        const valido = await tokensVisita.validar(token, 'asistencia');
        if (!valido) return { status: 404, error: ENLACE_INVALIDO };
        if (!puedeCancelar(valido.visita)) return { status: 409, error: 'Esta visita ya no se puede cambiar.' };
        // Si llegan dos clics a la vez, solo uno responde
        if (!(await tokensVisita.consumir(valido.registro))) return { status: 404, error: ENLACE_INVALIDO };
        const asistencia = { respuesta, respondidaAt: new Date() };
        if (respuesta === 'confirmo') {
            return { visita: datosGestion(await visitasRepository.updateVisita(valido.visita._id, { asistencia })) };
        }
        const cancelada = await this.cancelar(valido.visita, 'Avisó desde el recordatorio que no va a poder ir', 'el recordatorio del día anterior', { asistencia });
        return { visita: datosGestion(cancelada) };
    }

    async deleteVisita(id) {
        return visitasRepository.deleteVisita(id);
    }

    async seedDefaultVisitas(force = false) {
        if (force) {
            await visitasRepository.deleteAll();
        }
        return visitasRepository.insertMany(INITIAL_SEED_VISITAS);
    }
}

module.exports = new VisitasService();
module.exports.puedeCancelar = puedeCancelar;
module.exports.avisarGestion = avisarGestion;
