// Ajustes del sitio (contacto, costos de la calculadora y datos bancarios). Un solo documento con id fijo.
const mongoose = require('mongoose');
const Ajustes = require('../models/ajustes.model');

const ID = new mongoose.Types.ObjectId('000000000000000000000038');

// Lo que el sitio mostraba fijo hasta ahora: se usa mientras el administrador no cargue otra cosa
const PREDETERMINADOS = {
    contacto: {
        telefono: '+54 343 446 9522',
        whatsapp: '543434469522',
        email: 'puiggarinegociosinmobiliarios@hotmail.com',
        direccion: '25 de Mayo 726',
        localidad: 'Villa Libertador San Martín',
        instagram: 'aracelibalbuenainmobiliaria',
        horarios: [
            { dias: 'Lunes a jueves', horas: '9 a 13 y 17 a 19 h' },
            { dias: 'Viernes', horas: '9 a 13 h' },
            { dias: 'Fin de semana', horas: 'Cerrado' },
        ],
    },
    // Tomados de los requisitos publicados (depósito de 1 mes, comisión del 3 %, seña del 10 %). El sellado y la
    // escritura quedan en 0 hasta que la inmobiliaria cargue sus valores; la calculadora no se muestra hasta publicarla.
    costos: {
        publicado: false,
        alquiler: { mesesDeposito: 1, honorariosPorcentaje: 3, selladoPorcentaje: 0, gastosFijosARS: 0 },
        venta: { honorariosPorcentaje: 3, escrituraPorcentaje: 0, senaPorcentaje: 10 },
        aclaracion: 'Valores estimados. Confirmá el monto exacto con la inmobiliaria antes de firmar.',
    },
    banco: { titular: '', banco: '', cbu: '', alias: '', cuit: '' },
    // Los carga el administrador con el punto exacto de cada lugar (no se inventan coordenadas)
    lugares: [],
};

const fusionar = (base, guardado) => {
    if (!guardado || typeof guardado !== 'object' || Array.isArray(guardado)) return guardado ?? base;
    const salida = { ...base };
    for (const [clave, valor] of Object.entries(guardado)) {
        if (valor === undefined || valor === null) continue;
        salida[clave] = base && typeof base[clave] === 'object' && !Array.isArray(base[clave]) ? fusionar(base[clave], valor) : valor;
    }
    return salida;
};

const leer = async () => {
    const doc = await Ajustes.findById(ID).lean();
    const { contacto, costos, banco, lugares } = doc || {};
    return fusionar(PREDETERMINADOS, { contacto, costos, banco, lugares });
};

const bancoCompleto = (banco) => Boolean(banco && banco.titular && (banco.cbu || banco.alias));

// Lo público: contacto siempre; costos solo si se publicaron; del banco, solo si hay datos (no los datos)
const publicos = async () => {
    const a = await leer();
    return { contacto: a.contacto, costos: a.costos.publicado ? a.costos : null, transferencia: bancoCompleto(a.banco), lugares: a.lugares };
};

// ---------- Validación ----------
const texto = (v, max) => (typeof v === 'string' ? v.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max) : undefined);
const numero = (v, min, max) => (typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : undefined);

// Arma el cambio con solo los campos conocidos y bien formados. Devuelve { cambio } o { error }.
const revisar = (cuerpo = {}) => {
    const cambio = {};
    const c = cuerpo.contacto;
    if (c && typeof c === 'object') {
        const email = texto(c.email, 150);
        if (email !== undefined && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El email de contacto no es válido.' };
        const whatsapp = c.whatsapp === undefined ? undefined : String(c.whatsapp).replace(/\D/g, '').slice(0, 15);
        if (whatsapp !== undefined && whatsapp && whatsapp.length < 8) return { error: 'El WhatsApp tiene que tener la característica del país y del área, por ejemplo 543434469522.' };
        const telefono = texto(c.telefono, 40);
        if (telefono && !/^[\d\s+().-]+$/.test(telefono)) return { error: 'El teléfono solo puede tener números, espacios, +, guiones y paréntesis.' };
        const instagram = texto(c.instagram, 60)?.replace(/^@/, '');
        if (instagram && !/^[\w.]+$/.test(instagram)) return { error: 'El usuario de Instagram no es válido.' };
        let horarios;
        if (c.horarios !== undefined) {
            if (!Array.isArray(c.horarios) || c.horarios.length > 7) return { error: 'Cargá hasta 7 renglones de horario.' };
            horarios = c.horarios
                .map((h) => ({ dias: texto(h?.dias, 40) || '', horas: texto(h?.horas, 60) || '' }))
                .filter((h) => h.dias && h.horas);
            if (!horarios.length) return { error: 'Cargá al menos un renglón de horario.' };
        }
        Object.assign(cambio, Object.fromEntries(Object.entries({
            'contacto.telefono': telefono,
            'contacto.whatsapp': whatsapp,
            'contacto.email': email,
            'contacto.direccion': texto(c.direccion, 120),
            'contacto.localidad': texto(c.localidad, 80),
            'contacto.instagram': instagram,
            'contacto.horarios': horarios,
        }).filter(([, v]) => v !== undefined)));
        if (cambio['contacto.direccion'] === '') return { error: 'La dirección no puede quedar vacía.' };
    }
    const k = cuerpo.costos;
    if (k && typeof k === 'object') {
        const campos = {
            'costos.publicado': typeof k.publicado === 'boolean' ? k.publicado : undefined,
            'costos.alquiler.mesesDeposito': numero(k.alquiler?.mesesDeposito, 0, 6),
            'costos.alquiler.honorariosPorcentaje': numero(k.alquiler?.honorariosPorcentaje, 0, 20),
            'costos.alquiler.selladoPorcentaje': numero(k.alquiler?.selladoPorcentaje, 0, 10),
            'costos.alquiler.gastosFijosARS': numero(k.alquiler?.gastosFijosARS, 0, 1e9),
            'costos.venta.honorariosPorcentaje': numero(k.venta?.honorariosPorcentaje, 0, 20),
            'costos.venta.escrituraPorcentaje': numero(k.venta?.escrituraPorcentaje, 0, 20),
            'costos.venta.senaPorcentaje': numero(k.venta?.senaPorcentaje, 0, 100),
            'costos.aclaracion': texto(k.aclaracion, 300),
        };
        const pedidos = [k.alquiler?.mesesDeposito, k.alquiler?.honorariosPorcentaje, k.alquiler?.selladoPorcentaje, k.venta?.honorariosPorcentaje, k.venta?.escrituraPorcentaje];
        if (pedidos.some((v) => v !== undefined && (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 20))) return { error: 'Revisá los porcentajes: tienen que ser números entre 0 y 20.' };
        Object.assign(cambio, Object.fromEntries(Object.entries(campos).filter(([, v]) => v !== undefined)));
    }
    const b = cuerpo.banco;
    if (b && typeof b === 'object') {
        const cbu = b.cbu === undefined ? undefined : String(b.cbu).replace(/\D/g, '');
        if (cbu && cbu.length !== 22) return { error: 'El CBU o CVU tiene que tener 22 números.' };
        const alias = texto(b.alias, 40);
        if (alias && !/^[\w.-]{6,20}$/.test(alias)) return { error: 'El alias tiene entre 6 y 20 caracteres: letras, números, puntos o guiones.' };
        const cuit = b.cuit === undefined ? undefined : String(b.cuit).replace(/\D/g, '');
        if (cuit && cuit.length !== 11) return { error: 'El CUIT tiene que tener 11 números.' };
        Object.assign(cambio, Object.fromEntries(Object.entries({
            'banco.titular': texto(b.titular, 120),
            'banco.banco': texto(b.banco, 80),
            'banco.cbu': cbu,
            'banco.alias': alias,
            'banco.cuit': cuit,
        }).filter(([, v]) => v !== undefined)));
    }
    if (cuerpo.lugares !== undefined) {
        if (!Array.isArray(cuerpo.lugares) || cuerpo.lugares.length > 15) return { error: 'Cargá hasta 15 lugares de referencia.' };
        const lugares = [];
        for (const l of cuerpo.lugares) {
            const nombre = texto(l?.nombre, 60);
            const localidad = texto(l?.localidad, 80) || '';
            const latitud = Number(l?.latitud);
            const longitud = Number(l?.longitud);
            if (!nombre) return { error: 'Cada lugar necesita un nombre.' };
            if (!(latitud >= -34.3 && latitud <= -29.9 && longitud >= -61 && longitud <= -57.4)) return { error: `El punto de «${nombre}» tiene que estar en Entre Ríos.` };
            lugares.push({ nombre, localidad, latitud, longitud });
        }
        cambio.lugares = lugares;
    }
    return { cambio };
};

const guardar = async (cuerpo) => {
    const { cambio, error } = revisar(cuerpo);
    if (error) return { error };
    if (Object.keys(cambio).length) {
        await Ajustes.updateOne({ _id: ID }, { $set: cambio }, { upsert: true, runValidators: true });
    }
    return { ajustes: await leer() };
};

module.exports = { PREDETERMINADOS, leer, publicos, guardar, revisar, bancoCompleto, fusionar };
