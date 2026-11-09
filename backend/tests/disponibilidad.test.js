// Reglas de rangos de disponibilidad (alquiler temporario). No usa base de datos.
// Correr solo este archivo:  node --test tests/disponibilidad.test.js
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const { esFechaValida, validarRango, seSolapan, buscarSolapamiento } = require('../src/services/disponibilidad.service');

describe('Disponibilidad: validación de rangos', () => {
    it('acepta un rango válido', () => {
        assert.equal(validarRango({ desde: '2026-12-01', hasta: '2026-12-05', tipo: 'bloqueo' }), null);
    });

    it('acepta un rango sin tipo (usa el valor por defecto)', () => {
        assert.equal(validarRango({ desde: '2026-12-01', hasta: '2026-12-02' }), null);
    });

    it('rechaza fechas con otro formato', () => {
        assert.ok(validarRango({ desde: '01/12/2026', hasta: '2026-12-05' }));
        assert.ok(validarRango({ desde: '2026-12-01', hasta: undefined }));
        assert.ok(validarRango({ desde: { $gt: '' }, hasta: '2026-12-05' }));
    });

    it('rechaza fechas que no existen', () => {
        assert.equal(esFechaValida('2026-02-30'), false);
        assert.equal(esFechaValida('2026-13-01'), false);
        assert.equal(esFechaValida('2028-02-29'), true);
    });

    it('rechaza que la salida sea igual o anterior a la entrada', () => {
        assert.ok(validarRango({ desde: '2026-12-05', hasta: '2026-12-05' }));
        assert.ok(validarRango({ desde: '2026-12-05', hasta: '2026-12-01' }));
    });

    it('rechaza rangos de más de un año', () => {
        assert.ok(validarRango({ desde: '2026-01-01', hasta: '2027-01-03' }));
    });

    it('rechaza tipos desconocidos', () => {
        assert.ok(validarRango({ desde: '2026-12-01', hasta: '2026-12-05', tipo: 'vacaciones' }));
    });
});

describe('Disponibilidad: solapamientos', () => {
    const enero = { desde: '2027-01-10', hasta: '2027-01-15' };

    it('una salida y una entrada el mismo día no chocan', () => {
        assert.equal(seSolapan(enero, { desde: '2027-01-15', hasta: '2027-01-20' }), false);
        assert.equal(seSolapan({ desde: '2027-01-05', hasta: '2027-01-10' }, enero), false);
    });

    it('detecta rangos que se pisan en parte', () => {
        assert.equal(seSolapan(enero, { desde: '2027-01-14', hasta: '2027-01-18' }), true);
        assert.equal(seSolapan(enero, { desde: '2027-01-08', hasta: '2027-01-11' }), true);
    });

    it('detecta un rango contenido en otro y el mismo rango', () => {
        assert.equal(seSolapan(enero, { desde: '2027-01-11', hasta: '2027-01-12' }), true);
        assert.equal(seSolapan(enero, { desde: '2027-01-01', hasta: '2027-02-01' }), true);
        assert.equal(seSolapan(enero, { ...enero }), true);
    });

    it('devuelve el primer rango existente que choca, o null', () => {
        const existentes = [enero, { desde: '2027-02-01', hasta: '2027-02-10' }];
        assert.equal(buscarSolapamiento({ desde: '2027-01-20', hasta: '2027-01-25' }, existentes), null);
        assert.deepEqual(buscarSolapamiento({ desde: '2027-02-09', hasta: '2027-02-12' }, existentes), existentes[1]);
    });
});
