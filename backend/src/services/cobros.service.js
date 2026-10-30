// Cobro mensual de alquileres: a partir de los contratos vigentes, qué inquilinos pagaron cada mes, quiénes
// están atrasados (con aviso por mail) y el recibo de cada pago. El monto sale del contrato y, si el contrato
// ya se actualizó por índice, del último monto cargado.
const mongoose = require('mongoose');
const Contrato = require('../models/contrato.model');
const Cobro = require('../models/cobro.model');
const agenda = require('./agenda.service');
const ajustes = require('./ajustes.service');
const emailService = require('./email.service');
const { tocaActualizar } = require('./recordatorios.service');
const config = require('../config/env');

const PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;
const MEDIOS = ['efectivo', 'transferencia', 'otro'];
const DIA_VENCIMIENTO = 10;
// Los temporarios se cobran por reserva y la compraventa no tiene cuotas
const SIN_COBRO_MENSUAL = ['Compraventa', 'Alquiler temporario'];

const errorHttp = (mensaje, statusCode) => Object.assign(new Error(mensaje), { statusCode });

const periodoDe = (iso) => (iso ? iso.slice(0, 7) : null);
const sumarMeses = (periodo, meses) => {
    const [a, m] = periodo.split('-').map(Number);
    const d = new Date(Date.UTC(a, m - 1 + meses, 1));
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
};
const esFecha = (texto) => /^\d{4}-\d{2}-\d{2}$/.test(texto) && agenda.sumarDias(texto, 0) === texto;
const mesLargo = (periodo) => new Date(`${periodo}-15T12:00:00Z`).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const nombreDe = (persona) => [persona?.nombre, persona?.apellido].filter(Boolean).join(' ');

// «ARS 350.000», «$350.000,50» o «USD 500» → { monto, moneda }. El monto del contrato es texto libre.
const leerMonto = (texto) => {
    const t = String(texto ?? '');
    const moneda = /u\$s|us\$|usd|d[óo]lar/i.test(t) ? 'USD' : 'ARS';
    const numero = Number(t.replace(/[^\d,]/g, '').replace(',', '.'));
    return { monto: Number.isFinite(numero) && numero > 0 ? numero : null, moneda };
};

// Monto que corresponde a un mes: el último actualizado que ya rige o, si no hay, el del contrato
const montoDelPeriodo = (contrato, periodo) => {
    const base = leerMonto(contrato.montoMensual);
    const vigente = (contrato.actualizaciones || [])
        .filter((a) => a.desde <= periodo)
        .sort((a, b) => b.desde.localeCompare(a.desde))[0];
    return vigente ? { monto: vigente.monto, moneda: base.moneda, actualizadoDesde: vigente.desde } : { ...base, actualizadoDesde: null };
};

const rangoDe = (contrato) => ({ desde: periodoDe(agenda.fechaIso(contrato.fechaInicio)), hasta: periodoDe(agenda.fechaIso(contrato.fechaFin)) });
const enRango = (contrato, periodo) => {
    const { desde, hasta } = rangoDe(contrato);
    return Boolean(desde && hasta && desde <= periodo && periodo <= hasta);
};

// pagado · pendiente (todavía está en término) · atrasado (pasó el día de vencimiento)
const estadoDe = (contrato, periodo, cobro, hoyIso) => {
    if (cobro?.estado === 'pagado') return 'pagado';
    const mesActual = periodoDe(hoyIso);
    if (periodo < mesActual) return 'atrasado';
    if (periodo > mesActual) return 'pendiente';
    return Number(hoyIso.slice(8, 10)) > (contrato.diaVencimiento || DIA_VENCIMIENTO) ? 'atrasado' : 'pendiente';
};

const contratosConCobro = () =>
    Contrato.find({ estado: { $nin: ['borrador', 'cancelado'] }, tipoContrato: { $nin: SIN_COBRO_MENSUAL } })
        .select('numeroContrato propiedad cliente.nombre cliente.apellido cliente.email cliente.telefono propietario.nombre propietario.apellido fechaInicio fechaFin montoMensual ajuste actualizaciones diaVencimiento estado tipoContrato')
        .lean();

const datosCobro = (cobro) => cobro && {
    id: String(cobro._id),
    estado: cobro.estado,
    monto: cobro.monto,
    moneda: cobro.moneda,
    pagadoEl: cobro.pagadoEl,
    medio: cobro.medio,
    nota: cobro.nota,
    numeroRecibo: cobro.numeroRecibo ?? null,
    avisadoEl: cobro.avisadoEl,
};

// Todos los contratos que tienen cuota ese mes, con su estado de pago
const listar = async (periodo) => {
    const hoy = agenda.ahoraEnArgentina().fecha;
    const mes = PERIODO.test(String(periodo)) ? periodo : periodoDe(hoy);
    const contratos = (await contratosConCobro()).filter((c) => enRango(c, mes));
    const ids = contratos.map((c) => c._id);
    const [delMes, anteriores] = await Promise.all([
        Cobro.find({ contrato: { $in: ids }, periodo: mes }).lean(),
        // Para contar meses adeudados: desde el primer cobro registrado de cada contrato (los meses de antes
        // de empezar a usar esta sección no se cuentan como deuda)
        Cobro.find({ contrato: { $in: ids }, periodo: { $lt: mes } }).select('contrato periodo estado').lean(),
    ]);
    const cobroDe = new Map(delMes.map((c) => [String(c.contrato), c]));

    const filas = contratos.map((c) => {
        const id = String(c._id);
        const cobro = cobroDe.get(id) || null;
        const { monto, moneda, actualizadoDesde } = montoDelPeriodo(c, mes);
        const previos = anteriores.filter((x) => String(x.contrato) === id);
        const primero = previos.reduce((min, x) => (!min || x.periodo < min ? x.periodo : min), null);
        const pagados = new Set(previos.filter((x) => x.estado === 'pagado').map((x) => x.periodo));
        const adeudados = [];
        const { desde } = rangoDe(c);
        for (let p = primero && primero > desde ? primero : desde; primero && p < mes; p = sumarMeses(p, 1)) {
            if (!pagados.has(p)) adeudados.push(p);
        }
        return {
            contrato: {
                id,
                numero: c.numeroContrato,
                propiedad: c.propiedad?.titulo || '',
                direccion: c.propiedad?.direccion || '',
                inquilino: nombreDe(c.cliente),
                email: c.cliente?.email || '',
                telefono: c.cliente?.telefono || '',
                ajuste: c.ajuste || '',
                diaVencimiento: c.diaVencimiento || DIA_VENCIMIENTO,
                montoContrato: c.montoMensual,
            },
            periodo: mes,
            monto,
            moneda,
            actualizadoDesde,
            // Le toca actualizar este mes y todavía no se cargó el monto nuevo
            actualiza: c.tipoContrato !== 'Alquiler temporario' && tocaActualizar(c, `${mes}-01`) && actualizadoDesde !== mes,
            estado: estadoDe(c, mes, cobro, hoy),
            cobro: datosCobro(cobro),
            mesesAdeudados: adeudados,
        };
    });
    filas.sort((a, b) => ['atrasado', 'pendiente', 'pagado'].indexOf(a.estado) - ['atrasado', 'pendiente', 'pagado'].indexOf(b.estado) || a.contrato.propiedad.localeCompare(b.contrato.propiedad));
    return { periodo: mes, hoy, filas };
};

const buscarContrato = async (contratoId, periodo) => {
    if (!mongoose.isValidObjectId(contratoId)) throw errorHttp('El contrato no es válido.', 400);
    if (!PERIODO.test(String(periodo))) throw errorHttp('El mes no es válido.', 400);
    const contrato = await Contrato.findById(contratoId).lean();
    if (!contrato || ['borrador', 'cancelado'].includes(contrato.estado) || SIN_COBRO_MENSUAL.includes(contrato.tipoContrato)) {
        throw errorHttp('Ese contrato no tiene cobro mensual.', 404);
    }
    if (!enRango(contrato, periodo)) throw errorHttp('Ese mes está fuera de las fechas del contrato.', 400);
    return contrato;
};

const copiaParaRecibo = (contrato) => ({
    numeroContrato: contrato.numeroContrato,
    inquilino: nombreDe(contrato.cliente),
    propietario: nombreDe(contrato.propietario) || contrato.locadora || '',
    propiedad: { titulo: contrato.propiedad?.titulo || '', direccion: contrato.propiedad?.direccion || '' },
});

const registrarPago = async (contratoId, periodo, cuerpo = {}) => {
    const contrato = await buscarContrato(contratoId, periodo);
    const pagadoEl = String(cuerpo.pagadoEl || agenda.ahoraEnArgentina().fecha);
    if (!esFecha(pagadoEl)) throw errorHttp('La fecha de pago no es válida.', 400);
    if (pagadoEl > agenda.ahoraEnArgentina().fecha) throw errorHttp('La fecha de pago no puede ser futura.', 400);
    const medio = MEDIOS.includes(cuerpo.medio) ? cuerpo.medio : null;
    if (!medio) throw errorHttp('Elegí cómo pagó: efectivo, transferencia u otro.', 400);
    const calculado = montoDelPeriodo(contrato, periodo);
    const monto = cuerpo.monto === undefined || cuerpo.monto === '' ? calculado.monto : Number(cuerpo.monto);
    if (!Number.isFinite(monto) || monto <= 0) throw errorHttp('Indicá el monto que pagó.', 400);
    const nota = typeof cuerpo.nota === 'string' ? cuerpo.nota.trim().slice(0, 300) : '';

    const existente = await Cobro.findOne({ contrato: contrato._id, periodo }).lean();
    if (existente?.estado === 'pagado') throw errorHttp('Ese mes ya figura como pagado.', 409);

    // El número de recibo es el siguiente al último; si dos pagos se registran a la vez, el índice único
    // frena al segundo y se reintenta con el número que sigue.
    for (let intento = 0; intento < 5; intento++) {
        const ultimo = await Cobro.findOne({ numeroRecibo: { $type: 'number' } }).sort({ numeroRecibo: -1 }).select('numeroRecibo').lean();
        try {
            const cobro = await Cobro.findOneAndUpdate(
                { contrato: contrato._id, periodo, estado: { $ne: 'pagado' } },
                { $set: { estado: 'pagado', monto, moneda: calculado.moneda, pagadoEl, medio, nota, numeroRecibo: (ultimo?.numeroRecibo || 0) + 1, ...copiaParaRecibo(contrato) } },
                { upsert: true, returnDocument: 'after', runValidators: true }
            ).lean();
            return datosCobro(cobro);
        } catch (error) {
            if (error.code !== 11000) throw error;
            if (error.keyPattern?.contrato) throw errorHttp('Ese mes ya figura como pagado.', 409);
        }
    }
    throw errorHttp('No se pudo numerar el recibo. Probá de nuevo.', 409);
};

// Por si se marcó por error: vuelve a pendiente (el número de recibo queda libre)
const anularPago = async (contratoId, periodo) => {
    await buscarContrato(contratoId, periodo);
    const cobro = await Cobro.findOneAndUpdate(
        { contrato: contratoId, periodo, estado: 'pagado' },
        { $set: { estado: 'pendiente', pagadoEl: null, medio: null, nota: '' }, $unset: { numeroRecibo: 1, monto: 1 } },
        { returnDocument: 'after' }
    ).lean();
    if (!cobro) throw errorHttp('Ese mes no figura como pagado.', 404);
    return datosCobro(cobro);
};

// Mail al inquilino con el monto y cómo pagar
const avisarAtraso = async (contratoId, periodo) => {
    const contrato = await buscarContrato(contratoId, periodo);
    const hoy = agenda.ahoraEnArgentina().fecha;
    const existente = await Cobro.findOne({ contrato: contrato._id, periodo }).lean();
    if (estadoDe(contrato, periodo, existente, hoy) !== 'atrasado') throw errorHttp('Ese mes no está atrasado.', 400);
    const email = contrato.cliente?.email;
    if (!email) throw errorHttp('El inquilino no tiene email cargado en el contrato.', 400);

    const { monto, moneda } = montoDelPeriodo(contrato, periodo);
    const { contacto, banco } = await ajustes.leer();
    const transferencia = ajustes.bancoCompleto(banco)
        ? `Podés transferir a ${banco.titular}${banco.banco ? ` (${banco.banco})` : ''}${banco.cbu ? `\nCBU: ${banco.cbu}` : ''}${banco.alias ? `\nAlias: ${banco.alias}` : ''}`
        : '';
    await emailService.avisarCliente({
        para: email,
        nombre: contrato.cliente?.nombre,
        asunto: `Alquiler de ${mesLargo(periodo)} pendiente`,
        parrafos: [
            `Te escribimos porque todavía no registramos el pago del alquiler de ${mesLargo(periodo)}.`,
            `Propiedad: ${contrato.propiedad?.titulo || ''}${monto ? `\nMonto: ${moneda} ${monto.toLocaleString('es-AR')}` : ''}`,
            ...(transferencia ? [transferencia] : []),
            `Si ya pagaste, ignorá este mensaje o mandanos el comprobante por WhatsApp (${contacto.telefono}).`,
        ],
        boton: 'Escribinos por WhatsApp',
        enlace: contacto.whatsapp ? `https://wa.me/${contacto.whatsapp}` : config.urlFrontend(),
        pie: 'Araceli Balbuena · Negocios Inmobiliarios',
    });
    const cobro = await Cobro.findOneAndUpdate(
        { contrato: contrato._id, periodo },
        { $set: { avisadoEl: new Date() }, $setOnInsert: { estado: 'pendiente', ...copiaParaRecibo(contrato) } },
        { upsert: true, returnDocument: 'after' }
    ).lean();
    return datosCobro(cobro);
};

// Monto nuevo por índice (ICL, IPC, CAC...): con el porcentaje del período o con el monto final
const registrarActualizacion = async (contratoId, cuerpo = {}) => {
    const desde = String(cuerpo.desde || '');
    const contrato = await buscarContrato(contratoId, desde);
    const anterior = montoDelPeriodo(contrato, sumarMeses(desde, -1)).monto ?? leerMonto(contrato.montoMensual).monto;
    const porcentaje = cuerpo.porcentaje === undefined || cuerpo.porcentaje === '' ? null : Number(cuerpo.porcentaje);
    let monto;
    if (porcentaje !== null) {
        if (!Number.isFinite(porcentaje) || porcentaje <= -100 || porcentaje > 1000) throw errorHttp('El porcentaje no es válido.', 400);
        if (!anterior) throw errorHttp('El contrato no tiene un monto que se pueda leer: cargá el monto nuevo directamente.', 400);
        monto = Math.round(anterior * (1 + porcentaje / 100));
    } else {
        monto = Number(cuerpo.monto);
    }
    if (!Number.isFinite(monto) || monto <= 0) throw errorHttp('Indicá el porcentaje del índice o el monto nuevo.', 400);
    const indice = typeof cuerpo.indice === 'string' ? cuerpo.indice.trim().slice(0, 40) : '';

    const actualizaciones = (contrato.actualizaciones || []).filter((a) => a.desde !== desde);
    actualizaciones.push({ desde, monto, porcentaje: porcentaje ?? undefined, indice, cargadaEl: new Date() });
    actualizaciones.sort((a, b) => a.desde.localeCompare(b.desde));
    await Contrato.updateOne({ _id: contrato._id }, { $set: { actualizaciones, ultimaActualizacion: `${desde.slice(5, 7)}/${desde.slice(0, 4)}` } });
    return { desde, monto, anterior, porcentaje, indice };
};

// Datos del recibo (la copia guardada al pagar, no el contrato actual)
const recibo = async (id) => {
    if (!mongoose.isValidObjectId(id)) throw errorHttp('El recibo no es válido.', 400);
    const cobro = await Cobro.findOne({ _id: id, estado: 'pagado' }).lean();
    if (!cobro) throw errorHttp('No encontramos ese recibo.', 404);
    return {
        id: String(cobro._id),
        numeroRecibo: cobro.numeroRecibo,
        periodo: cobro.periodo,
        monto: cobro.monto,
        moneda: cobro.moneda,
        pagadoEl: cobro.pagadoEl,
        medio: cobro.medio,
        nota: cobro.nota,
        numeroContrato: cobro.numeroContrato,
        inquilino: cobro.inquilino,
        propietario: cobro.propietario,
        propiedad: cobro.propiedad,
    };
};

// Para el número del menú: cuotas del mes que ya pasaron el vencimiento sin pagarse
const contarAtrasados = async () => (await listar()).filas.filter((f) => f.estado === 'atrasado').length;

module.exports = { listar, registrarPago, anularPago, avisarAtraso, registrarActualizacion, recibo, contarAtrasados, leerMonto, montoDelPeriodo, sumarMeses };
