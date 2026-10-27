// Ajustes del sitio: validación de contacto, costos y datos bancarios. No usa base de datos.
// Correr solo este archivo:  node --test tests/ajustes.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { revisar, fusionar, PREDETERMINADOS, bancoCompleto } = require('../src/services/ajustes.service');

describe('Ajustes: contacto', () => {
    it('limpia el WhatsApp y el usuario de Instagram', () => {
        const { cambio } = revisar({ contacto: { whatsapp: '+54 9 343 446-9522', instagram: '@mi.inmo' } });
        assert.equal(cambio['contacto.whatsapp'], '5493434469522');
        assert.equal(cambio['contacto.instagram'], 'mi.inmo');
    });

    it('rechaza email inválido, dirección vacía y horarios vacíos', () => {
        assert.match(revisar({ contacto: { email: 'no-es-mail' } }).error, /email/);
        assert.match(revisar({ contacto: { direccion: '   ' } }).error, /dirección/);
        assert.match(revisar({ contacto: { horarios: [{ dias: '', horas: '' }] } }).error, /horario/);
    });

    it('ignora campos desconocidos', () => {
        const { cambio } = revisar({ contacto: { telefono: '343 4469522', $where: 'x' }, otra: 1 });
        assert.deepEqual(Object.keys(cambio), ['contacto.telefono']);
    });
});

describe('Ajustes: costos y banco', () => {
    it('acepta porcentajes en rango y rechaza los demás', () => {
        assert.equal(revisar({ costos: { alquiler: { honorariosPorcentaje: 4.15 } } }).cambio['costos.alquiler.honorariosPorcentaje'], 4.15);
        assert.match(revisar({ costos: { venta: { escrituraPorcentaje: 50 } } }).error, /porcentajes/);
        assert.match(revisar({ costos: { venta: { honorariosPorcentaje: '3' } } }).error, /porcentajes/);
    });

    it('valida CBU, alias y CUIT', () => {
        assert.match(revisar({ banco: { cbu: '123' } }).error, /22/);
        assert.match(revisar({ banco: { alias: 'a b' } }).error, /alias/);
        assert.match(revisar({ banco: { cuit: '20-1234' } }).error, /11/);
        assert.equal(revisar({ banco: { cbu: '0000003100010000000001', alias: 'casa.sol.rio', cuit: '20-12345678-9' } }).error, undefined);
    });

    it('sin titular y sin CBU/alias no se ofrece transferencia', () => {
        assert.equal(bancoCompleto(PREDETERMINADOS.banco), false);
        assert.equal(bancoCompleto({ titular: 'Araceli', alias: 'casa.sol.rio' }), true);
    });

    it('lo guardado completa los predeterminados sin borrarlos', () => {
        const r = fusionar(PREDETERMINADOS, { contacto: { telefono: '1' }, costos: { alquiler: { selladoPorcentaje: 1 } } });
        assert.equal(r.contacto.telefono, '1');
        assert.equal(r.contacto.email, PREDETERMINADOS.contacto.email);
        assert.equal(r.costos.alquiler.selladoPorcentaje, 1);
        assert.equal(r.costos.alquiler.mesesDeposito, 1);
    });
});

describe('Ajustes: lugares de referencia', () => {
    it('acepta lugares con nombre y punto en Entre Ríos', () => {
        const { cambio } = revisar({ lugares: [{ nombre: 'Universidad', localidad: 'Libertador San Martín', latitud: -32.07, longitud: -60.46 }] });
        assert.equal(cambio.lugares.length, 1);
    });
    it('rechaza lugares sin nombre o fuera de la provincia', () => {
        assert.match(revisar({ lugares: [{ nombre: '', latitud: -32, longitud: -60 }] }).error, /nombre/);
        assert.match(revisar({ lugares: [{ nombre: 'Obelisco', latitud: -34.6, longitud: -58.38 }] }).error, /Entre Ríos/);
    });
});
