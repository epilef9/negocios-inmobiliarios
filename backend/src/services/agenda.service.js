// Agenda de visitas: en qué días y horarios atiende la oficina y cuáles ya están tomados.
// Es la única fuente de verdad: el calendario del sitio la consulta y el servidor la usa para no
// aceptar dos visitas en el mismo horario ni pedidos fuera del horario de atención.

const Visita = require('../models/visita.model');

// Horario de la oficina (0 = domingo … 6 = sábado). Turnos cada media hora.
const MANANA = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30'];
const TARDE = ['17:00', '17:30', '18:00', '18:30'];
const HORARIO = { 1: [...MANANA, ...TARDE], 2: [...MANANA, ...TARDE], 3: [...MANANA, ...TARDE], 4: [...MANANA, ...TARDE], 5: MANANA };
const HORARIO_TEXTO = 'Lunes a jueves de 9 a 13 y de 17 a 19 h · viernes de 9 a 13 h';

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
const diaDeSemana = (iso) => {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
};
const sumarDias = (iso, dias) => {
    const [a, m, d] = iso.split('-').map(Number);
    return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
};

// Horarios ya tomados, como "2026-11-12|10:30"
const ocupados = async () => {
    const visitas = await Visita.find({ estado: { $in: OCUPAN } }).select('fecha horario').lean();
    const tomados = new Set();
    visitas.forEach((v) => {
        const fecha = fechaIso(v.fecha);
        const hora = horaCorta(v.horario);
        if (fecha && hora) tomados.add(`${fecha}|${hora}`);
    });
    return tomados;
};

// Turnos libres de un día ya teniendo la lista de ocupados
const libresDelDia = (fecha, tomados, ahora) => {
    const turnos = HORARIO[diaDeSemana(fecha)] || [];
    if (fecha < ahora.fecha) return { turnos, libres: [] };
    return {
        turnos,
        libres: turnos.filter(
            (hora) => !tomados.has(`${fecha}|${hora}`) && (fecha > ahora.fecha || minutosDe(hora) >= ahora.minutos + ANTICIPACION_MINUTOS)
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

    const tomados = await ocupados();
    const dias = [];
    for (let fecha = inicio; fecha <= fin; fecha = sumarDias(fecha, 1)) {
        const { turnos, libres } = libresDelDia(fecha, tomados, ahora);
        let estado = 'disponible';
        if (fecha < ahora.fecha || fecha > limite || turnos.length === 0) estado = 'cerrado';
        else if (libres.length === 0) estado = 'completo';
        dias.push({ fecha, estado, turnos: estado === 'disponible' ? libres : [] });
    }
    return { dias, horario: HORARIO_TEXTO, hoy: ahora.fecha, hasta: limite };
};

// Revisa que un pedido caiga en un horario libre de atención. Devuelve el motivo si no se puede, o null.
const motivoNoDisponible = async (fecha, horario, { controlarHorario = true } = {}) => {
    const iso = fechaIso(fecha);
    const hora = horaCorta(horario);
    if (!iso || !hora) return 'La fecha o el horario no son válidos.';
    const ahora = ahoraEnArgentina();
    const tomados = await ocupados();
    if (tomados.has(`${iso}|${hora}`)) return 'Ese horario ya se ocupó. Elegí otro, por favor.';
    if (!controlarHorario) return null;
    if (iso > sumarDias(ahora.fecha, DIAS_MAXIMOS)) return 'Por ahora se pueden pedir visitas hasta tres meses adelante.';
    const { turnos, libres } = libresDelDia(iso, tomados, ahora);
    if (!turnos.includes(hora)) return 'Ese día u horario la oficina no atiende.';
    if (!libres.includes(hora)) return 'Ese horario ya pasó o está muy cerca. Elegí otro, por favor.';
    return null;
};

module.exports = { disponibilidad, motivoNoDisponible, HORARIO_TEXTO, ahoraEnArgentina, sumarDias };
