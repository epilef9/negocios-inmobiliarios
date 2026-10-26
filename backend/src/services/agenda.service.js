// Agenda de visitas: en qué días y horarios atiende la oficina y cuáles ya están tomados.
// Es la única fuente de verdad: el calendario del sitio la consulta y el servidor la usa para no
// aceptar dos visitas en el mismo horario ni pedidos fuera del horario de atención.
// El horario lo edita el administrador desde el panel (HU-19); si nunca lo guardó, rige HORARIO_INICIAL.
// Las reglas (turnos, validación, texto) son funciones puras y se prueban sin base de datos.

const Visita = require('../models/visita.model');
const Horario = require('../models/horario.model');

// El horario de siempre (0 = domingo … 6 = sábado): lunes a jueves 9–13 y 17–19, viernes 9–13, turnos de 30 min
const MANANA = { desde: '09:00', hasta: '13:00' };
const TARDE = { desde: '17:00', hasta: '19:00' };
const HORARIO_INICIAL = {
    semana: [[], [MANANA, TARDE], [MANANA, TARDE], [MANANA, TARDE], [MANANA, TARDE], [MANANA], []].map((tramos) => ({ tramos })),
    duracionMinutos: 30,
    cerrados: [],
};

const DURACIONES = [15, 30, 45, 60];
const TRAMOS_POR_DIA = 4;
const CERRADOS_MAXIMOS = 100;
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

// Las visitas de hoy se piden con al menos una hora de anticipación
const ANTICIPACION_MINUTOS = 60;
// Se puede pedir hasta 3 meses adelante
const DIAS_MAXIMOS = 92;
// Estas visitas ocupan el horario; las rechazadas lo liberan
const OCUPAN = ['pendiente', 'confirmada', 'reprogramada'];

const ZONA = 'America/Argentina/Buenos_Aires';

// Fecha y hora actuales en Argentina (el servidor en Vercel corre en UTC)
const ahoraEnArgentina = () => {
    const partes = Object.fromEntries(
        new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
            .formatToParts(new Date())
            .map((p) => [p.type, p.value])
    );
    return { fecha: `${partes.year}-${partes.month}-${partes.day}`, minutos: Number(partes.hour) * 60 + Number(partes.minute) };
};

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
const LATINA = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;
const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

// "12/11/2026" o "2026-11-12" → "2026-11-12"
const fechaIso = (fecha) => {
    const texto = String(fecha || '').trim();
    if (ISO.test(texto)) return texto;
    const m = texto.match(LATINA);
    return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};
// "10:30 h" → "10:30"
const horaCorta = (horario) => {
    const m = String(horario || '').match(/(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null;
};
const minutosDe = (hora) => {
    const [h, m] = hora.split(':').map(Number);
    return h * 60 + m;
};
const horaDe = (minutos) => `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
const diaDeSemana = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};
const sumarDias = (iso, dias) => {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
};
// "2026-02-30" tiene el formato pero no existe
const esFecha = (texto) => typeof texto === 'string' && ISO.test(texto) && sumarDias(texto, 0) === texto;

// Inicio de cada turno dentro de los tramos: con 30 min, 09:00–13:00 da 09:00 … 12:30
const turnosDe = (tramos, duracion) =>
    tramos.flatMap(({ desde, hasta }) => {
        const turnos = [];
        for (let t = minutosDe(desde); t + duracion <= minutosDe(hasta); t += duracion) turnos.push(horaDe(t));
        return turnos;
    });

const cierreDe = (fecha, cerrados) => cerrados.find((c) => c.desde <= fecha && fecha <= c.hasta) || null;

// Devuelve el motivo por el que el horario no sirve, o null si está bien
const validarHorario = ({ semana, duracionMinutos, cerrados } = {}) => {
    if (!DURACIONES.includes(duracionMinutos)) return 'La duración de cada visita debe ser de 15, 30, 45 o 60 minutos.';
    if (!Array.isArray(semana) || semana.length !== 7) return 'Faltan días de la semana.';
    for (let dia = 0; dia < 7; dia += 1) {
        const tramos = semana[dia]?.tramos;
        if (!Array.isArray(tramos) || tramos.length > TRAMOS_POR_DIA) return `El ${DIAS[dia]} puede tener hasta ${TRAMOS_POR_DIA} tramos.`;
        if (tramos.some((t) => !HORA.test(t?.desde) || !HORA.test(t?.hasta))) return `Revisá las horas del ${DIAS[dia]}: van como 09:30.`;
        const ordenados = [...tramos].sort((a, b) => a.desde.localeCompare(b.desde));
        for (let i = 0; i < ordenados.length; i += 1) {
            const { desde, hasta } = ordenados[i];
            const largo = minutosDe(hasta) - minutosDe(desde);
            if (largo < duracionMinutos) return `El tramo del ${DIAS[dia]} de ${desde} a ${hasta} no alcanza para una visita de ${duracionMinutos} minutos.`;
            // Cada tramo termina justo cuando termina un turno: si no, el final quedaría como un pedazo sin usar
            if (largo % duracionMinutos) {
                const antes = horaDe(minutosDe(desde) + Math.floor(largo / duracionMinutos) * duracionMinutos);
                return `Con turnos de ${duracionMinutos} minutos, el tramo del ${DIAS[dia]} que empieza a las ${desde} tiene que terminar a las ${antes} o ${horaDe(minutosDe(antes) + duracionMinutos)}.`;
            }
            if (i > 0 && desde < ordenados[i - 1].hasta) return `Los tramos del ${DIAS[dia]} se pisan (${ordenados[i - 1].desde}–${ordenados[i - 1].hasta} y ${desde}–${hasta}).`;
        }
    }
    if (semana.every((d) => d.tramos.length === 0)) return 'Dejá al menos un día con horario de visitas.';
    if (!Array.isArray(cerrados) || cerrados.length > CERRADOS_MAXIMOS) return `Se pueden cargar hasta ${CERRADOS_MAXIMOS} días cerrados.`;
    for (const c of cerrados) {
        if (!esFecha(c?.desde) || !esFecha(c?.hasta)) return 'Las fechas de los días cerrados deben existir (AAAA-MM-DD).';
        if (c.hasta < c.desde) return `El cierre del ${c.desde} termina antes de empezar.`;
        if (c.motivo !== undefined && (typeof c.motivo !== 'string' || c.motivo.length > 100)) return 'El motivo de un día cerrado tiene hasta 100 caracteres.';
    }
    return null;
};

// Solo los campos conocidos, con los tramos en orden (lo que se guarda)
const limpiarHorario = ({ semana, duracionMinutos, cerrados }) => ({
    semana: semana.map((d) => ({ tramos: d.tramos.map(({ desde, hasta }) => ({ desde, hasta })).sort((a, b) => a.desde.localeCompare(b.desde)) })),
    duracionMinutos,
    cerrados: cerrados
        .map(({ desde, hasta, motivo }) => ({ desde, hasta, motivo: (motivo || '').replace(/[\r\n\t]+/g, ' ').trim() }))
        .sort((a, b) => a.desde.localeCompare(b.desde)),
});

// "Lunes a jueves de 9 a 13 y de 17 a 19 h · viernes de 9 a 13 h": agrupa días seguidos con el mismo horario
const textoHorario = ({ semana }) => {
    const hora = (h) => (h.endsWith(':00') ? String(Number(h.slice(0, 2))) : `${Number(h.slice(0, 2))}:${h.slice(3)}`);
    const tramos = (d) => semana[d].tramos.map((t) => `de ${hora(t.desde)} a ${hora(t.hasta)}`).join(' y ');
    const grupos = [];
    [1, 2, 3, 4, 5, 6, 0].forEach((d) => {
        if (!semana[d].tramos.length) return;
        const ultimo = grupos[grupos.length - 1];
        if (ultimo && ultimo.texto === tramos(d) && ultimo.hasta === (d + 6) % 7) ultimo.hasta = d;
        else grupos.push({ desde: d, hasta: d, texto: tramos(d) });
    });
    const dias = ({ desde, hasta }) =>
        desde === hasta ? DIAS[desde] : (hasta - desde + 7) % 7 === 1 ? `${DIAS[desde]} y ${DIAS[hasta]}` : `${DIAS[desde]} a ${DIAS[hasta]}`;
    const texto = grupos.map((g) => `${dias(g)} ${g.texto} h`).join(' · ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
};

// El horario guardado o, si nunca se guardó, el de siempre
const horarioActual = async () => (await Horario.findOne().lean()) || HORARIO_INICIAL;

const guardarHorario = async (datos) => {
    const limpio = limpiarHorario(datos);
    await Horario.findOneAndUpdate({}, limpio, { upsert: true, runValidators: true, setDefaultsOnInsert: true });
    return limpio;
};

// Inicio (en minutos) de las visitas que ocupan cada día: "2026-11-12" → [630, 1020]
const ocupados = async () => {
    const visitas = await Visita.find({ estado: { $in: OCUPAN } }).select('fecha horario').lean();
    const porDia = new Map();
    visitas.forEach((v) => {
        const fecha = fechaIso(v.fecha);
        const hora = horaCorta(v.horario);
        if (!fecha || !hora) return;
        porDia.set(fecha, [...(porDia.get(fecha) || []), minutosDe(hora)]);
    });
    return porDia;
};

// Un turno está tomado si alguna visita de ese día empieza a menos de una duración de distancia:
// así, al pasar de turnos de 30 a 60 min, una visita de las 9:30 también ocupa el turno de las 9:00
const estaTomado = (fecha, hora, tomados, duracion) => (tomados.get(fecha) || []).some((v) => Math.abs(v - minutosDe(hora)) < duracion);

// Turnos de un día (vacío si está cerrado) y cuáles quedan libres
const libresDelDia = (fecha, tomados, ahora, horario) => {
    const turnos = cierreDe(fecha, horario.cerrados) ? [] : turnosDe(horario.semana[diaDeSemana(fecha)].tramos, horario.duracionMinutos);
    if (fecha < ahora.fecha) return { turnos, libres: [] };
    return {
        turnos,
        libres: turnos.filter(
            (hora) => !estaTomado(fecha, hora, tomados, horario.duracionMinutos) && (fecha > ahora.fecha || minutosDe(hora) >= ahora.minutos + ANTICIPACION_MINUTOS)
        ),
    };
};

// Disponibilidad de cada día entre dos fechas (como mucho ~2 meses por consulta)
const disponibilidad = async (desde, hasta) => {
    const ahora = ahoraEnArgentina();
    let inicio = ISO.test(desde || '') ? desde : ahora.fecha;
    let fin = ISO.test(hasta || '') ? hasta : sumarDias(inicio, 41);
    if (fin < inicio) [inicio, fin] = [fin, inicio];
    if (sumarDias(inicio, 62) < fin) fin = sumarDias(inicio, 62);
    const limite = sumarDias(ahora.fecha, DIAS_MAXIMOS);

    const [horario, tomados] = await Promise.all([horarioActual(), ocupados()]);
    const dias = [];
    for (let fecha = inicio; fecha <= fin; fecha = sumarDias(fecha, 1)) {
        const { turnos, libres } = libresDelDia(fecha, tomados, ahora, horario);
        let estado = 'disponible';
        if (fecha < ahora.fecha || fecha > limite || turnos.length === 0) estado = 'cerrado';
        else if (libres.length === 0) estado = 'completo';
        dias.push({ fecha, estado, turnos: estado === 'disponible' ? libres : [] });
    }
    return { dias, horario: textoHorario(horario), hoy: ahora.fecha, hasta: limite };
};

// Revisa que un pedido caiga en un horario libre de atención. Devuelve el motivo si no se puede, o null.
const motivoNoDisponible = async (fecha, horario, { controlarHorario = true } = {}) => {
    const iso = fechaIso(fecha);
    const hora = horaCorta(horario);
    if (!iso || !hora) return 'La fecha o el horario no son válidos.';
    const ahora = ahoraEnArgentina();
    const [agenda, tomados] = await Promise.all([horarioActual(), ocupados()]);
    if (estaTomado(iso, hora, tomados, agenda.duracionMinutos)) return 'Ese horario ya se ocupó. Elegí otro, por favor.';
    if (!controlarHorario) return null;
    if (iso > sumarDias(ahora.fecha, DIAS_MAXIMOS)) return 'Por ahora se pueden pedir visitas hasta tres meses adelante.';
    const cierre = cierreDe(iso, agenda.cerrados);
    if (cierre) return `Ese día la oficina está cerrada${cierre.motivo ? ` (${cierre.motivo})` : ''}. Elegí otro, por favor.`;
    const { turnos, libres } = libresDelDia(iso, tomados, ahora, agenda);
    if (!turnos.includes(hora)) return 'Ese día u horario la oficina no atiende.';
    if (!libres.includes(hora)) return 'Ese horario ya pasó o está muy cerca. Elegí otro, por favor.';
    return null;
};

// Visitas por venir que quedan fuera de un horario (para avisar al administrador después de cambiarlo)
const visitasFueraDeHorario = async (horario) => {
    const hoy = ahoraEnArgentina().fecha;
    const visitas = await Visita.find({ estado: { $in: OCUPAN } }).select('cliente.nombre propiedad.titulo fecha horario estado').lean();
    return visitas
        .map((v) => ({ v, fecha: fechaIso(v.fecha), hora: horaCorta(v.horario) }))
        .filter(({ fecha, hora }) => fecha && hora && fecha >= hoy)
        .filter(({ fecha, hora }) => cierreDe(fecha, horario.cerrados) || !turnosDe(horario.semana[diaDeSemana(fecha)].tramos, horario.duracionMinutos).includes(hora))
        .sort((a, b) => `${a.fecha}${a.hora}`.localeCompare(`${b.fecha}${b.hora}`))
        .map(({ v, fecha, hora }) => ({ id: String(v._id), cliente: v.cliente?.nombre || '', propiedad: v.propiedad?.titulo || '', fecha, hora, estado: v.estado }));
};

module.exports = {
    HORARIO_INICIAL,
    disponibilidad,
    motivoNoDisponible,
    ahoraEnArgentina,
    sumarDias,
    turnosDe,
    validarHorario,
    textoHorario,
    libresDelDia,
    horarioActual,
    guardarHorario,
    visitasFueraDeHorario,
};
