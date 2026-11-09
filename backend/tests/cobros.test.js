// Cobro mensual de alquileres: lectura del monto del contrato y numeración de los recibos.
// No usa base de datos: los modelos se reemplazan por una versión en memoria.
// Correr solo este archivo:  node --test tests/cobros.test.js
const { describe, it, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Contrato = require('../src/models/contrato.model');
const Cobro = require('../src/models/cobro.model');
const Contador = require('../src/models/contador.model');
const cobros = require('../src/services/cobros.service');

describe('Cobros: monto escrito en el contrato', () => {
    const casos = [
        ['$ 350.000', 350000, 'ARS'],
        ['$350000', 350000, 'ARS'],
        ['$ 350.000,50', 350000.5, 'ARS'],
        ['350000.50', 350000.5, 'ARS'],
        ['1.234.567', 1234567, 'ARS'],
        ['1,234.56', 1234.56, 'ARS'],
        ['USD 1,500', 1500, 'USD'],
        ['1,500 dólares', 1500, 'USD'],
        ['U$S 800', 800, 'USD'],
        ['Mes 1: $ 350.000', 350000, 'ARS'],
        ['$ 350.000.', 350000, 'ARS'],
    ];
    for (const [texto, monto, moneda] of casos) {
        it(`«${texto}» → ${moneda} ${monto}`, () => {
            assert.deepEqual(cobros.leerMonto(texto), { monto, moneda });
        });
    }

    it('sin un número que se pueda leer, el monto queda vacío', () => {
        assert.equal(cobros.leerMonto('trescientos mil pesos').monto, null);
        assert.equal(cobros.leerMonto('').monto, null);
        assert.equal(cobros.leerMonto(undefined).monto, null);
        assert.equal(cobros.leerMonto('$ 0').monto, null);
    });

    it('usa el último monto actualizado que ya rige', () => {
        const contrato = {
            montoMensual: '$ 300.000',
            actualizaciones: [
                { desde: '2026-04', monto: 330000 },
                { desde: '2026-07', monto: 360000 },
            ],
        };
        assert.deepEqual(cobros.montoDelPeriodo(contrato, '2026-02'), { monto: 300000, moneda: 'ARS', actualizadoDesde: null });
        assert.deepEqual(cobros.montoDelPeriodo(contrato, '2026-05'), { monto: 330000, moneda: 'ARS', actualizadoDesde: '2026-04' });
        assert.deepEqual(cobros.montoDelPeriodo(contrato, '2026-09'), { monto: 360000, moneda: 'ARS', actualizadoDesde: '2026-07' });
    });
});

// ---- Modelos en memoria (solo lo que usan registrarPago, anularPago y siguienteNumeroRecibo) ----
const contratoId = new mongoose.Types.ObjectId();
const contrato = {
    _id: contratoId,
    estado: 'vigente',
    tipoContrato: 'Alquiler',
    numeroContrato: 'C-001',
    montoMensual: '$ 350.000',
    fechaInicio: '2026-01-01',
    fechaFin: '2027-12-31',
    cliente: { nombre: 'Ana', apellido: 'Pérez' },
    propietario: { nombre: 'Luis', apellido: 'Gómez' },
    propiedad: { titulo: 'Casa en Crespo', direccion: 'San Martín 100' },
};

let filas = [];
// Copia de una fila (structuredClone no sirve: convierte los ObjectId en objetos comunes)
const copia = (fila) => ({ ...fila, anulaciones: [...(fila.anulaciones || [])] });
let contador = null;
const cumple = (doc, filtro) =>
    Object.entries(filtro).every(([campo, valor]) => {
        if (valor && typeof valor === 'object' && !(valor instanceof mongoose.Types.ObjectId)) {
            if ('$ne' in valor) return doc[campo] !== valor.$ne;
            if ('$type' in valor) return typeof doc[campo] === valor.$type;
        }
        return String(doc[campo]) === String(valor);
    });
const consulta = (resultado) => {
    const q = { sort: () => q, select: () => q, lean: async () => resultado() };
    return q;
};

const originales = {
    contratoFindById: Contrato.findById,
    cobroFindOne: Cobro.findOne,
    cobroFindOneAndUpdate: Cobro.findOneAndUpdate,
    contadorUpdateOne: Contador.updateOne,
    contadorFindOneAndUpdate: Contador.findOneAndUpdate,
};

Contrato.findById = (id) => consulta(() => (String(id) === String(contratoId) ? { ...contrato } : null));
Cobro.findOne = (filtro) => {
    let orden = null;
    const q = {
        sort: (o) => ((orden = o), q),
        select: () => q,
        lean: async () => {
            const encontrados = filas.filter((f) => cumple(f, filtro));
            if (orden?.numeroRecibo === -1) encontrados.sort((a, b) => b.numeroRecibo - a.numeroRecibo);
            return encontrados[0] ? copia(encontrados[0]) : null;
        },
    };
    return q;
};
Cobro.findOneAndUpdate = (filtro, cambios, opciones = {}) =>
    consulta(() => {
        let fila = filas.find((f) => cumple(f, filtro));
        if (!fila) {
            if (!opciones.upsert) return null;
            fila = { _id: new mongoose.Types.ObjectId(), contrato: filtro.contrato, periodo: filtro.periodo, anulaciones: [] };
            filas.push(fila);
        }
        if (cambios.$set?.numeroRecibo !== undefined && filas.some((f) => f !== fila && f.numeroRecibo === cambios.$set.numeroRecibo)) {
            throw Object.assign(new Error('E11000'), { code: 11000, keyPattern: { numeroRecibo: 1 } });
        }
        Object.assign(fila, cambios.$set || {});
        for (const campo of Object.keys(cambios.$unset || {})) delete fila[campo];
        for (const [campo, valor] of Object.entries(cambios.$push || {})) fila[campo] = [...(fila[campo] || []), valor];
        return copia(fila);
    });
Contador.updateOne = async (_filtro, cambios) => {
    contador = Math.max(contador ?? 0, cambios.$max.valor);
};
Contador.findOneAndUpdate = (_filtro, cambios) =>
    consulta(() => {
        contador += cambios.$inc.valor;
        return { _id: 'recibo', valor: contador };
    });

after(() => {
    Contrato.findById = originales.contratoFindById;
    Cobro.findOne = originales.cobroFindOne;
    Cobro.findOneAndUpdate = originales.cobroFindOneAndUpdate;
    Contador.updateOne = originales.contadorUpdateOne;
    Contador.findOneAndUpdate = originales.contadorFindOneAndUpdate;
});

const pagar = (periodo, extra = {}) => cobros.registrarPago(String(contratoId), periodo, { medio: 'transferencia', pagadoEl: `${periodo}-05`, ...extra });

describe('Cobros: número de recibo', () => {
    beforeEach(() => {
        filas = [];
        contador = null;
    });

    it('los recibos salen correlativos y el monto por defecto es el del contrato', async () => {
        const enero = await pagar('2026-01');
        const febrero = await pagar('2026-02');
        assert.equal(enero.numeroRecibo, 1);
        assert.equal(febrero.numeroRecibo, 2);
        assert.equal(enero.monto, 350000);
    });

    it('un recibo anulado no deja su número libre y queda anotado', async () => {
        await pagar('2026-01');
        await pagar('2026-02');
        const anulado = await cobros.anularPago(String(contratoId), '2026-02');
        assert.equal(anulado.estado, 'pendiente');
        assert.equal(anulado.numeroRecibo, null);

        const otraVez = await pagar('2026-02');
        assert.equal(otraVez.numeroRecibo, 3, 'el 2 ya se usó: el nuevo recibo es el 3');

        const fila = filas.find((f) => f.periodo === '2026-02');
        assert.equal(fila.anulaciones.length, 1);
        assert.equal(fila.anulaciones[0].numeroRecibo, 2);
        assert.equal(fila.anulaciones[0].monto, 350000);
    });

    it('la primera vez arranca desde el último recibo que ya existía', async () => {
        filas.push({ _id: new mongoose.Types.ObjectId(), contrato: new mongoose.Types.ObjectId(), periodo: '2025-12', estado: 'pagado', numeroRecibo: 41 });
        assert.equal(await cobros.siguienteNumeroRecibo(), 42);
        assert.equal(await cobros.siguienteNumeroRecibo(), 43);
    });

    it('si aparece un recibo con un número más alto que el contador, sigue desde ese', async () => {
        await pagar('2026-01');
        // Un recibo con el 2 cargado por fuera del contador (el contador quedó en 1)
        filas.push({ _id: new mongoose.Types.ObjectId(), contrato: new mongoose.Types.ObjectId(), periodo: '2025-11', estado: 'pagado', numeroRecibo: 2 });
        contador = 1;
        const febrero = await pagar('2026-02');
        assert.equal(febrero.numeroRecibo, 3);
    });

    it('no deja pagar dos veces el mismo mes ni anular uno sin pagar', async () => {
        await pagar('2026-01');
        await assert.rejects(pagar('2026-01'), { statusCode: 409 });
        await assert.rejects(cobros.anularPago(String(contratoId), '2026-03'), { statusCode: 404 });
    });
});
