const mongoose = require('mongoose');

// Ajustes del sitio que edita el administrador (un solo documento):
//  - contacto (HU-38 / RF-29): teléfono, WhatsApp, email, dirección y horario de la oficina
//  - costos (calculadora «cuánto necesito para entrar»): porcentajes que define la inmobiliaria
//  - banco (pago por transferencia): datos que ve el cliente al pagar una reserva
// Lugares de referencia para «a cuántas cuadras queda» en la ficha (Universidad, Sanatorio, centro…)
const lugarSchema = new mongoose.Schema({ nombre: String, localidad: String, latitud: Number, longitud: Number }, { _id: false });

const horarioSchema = new mongoose.Schema({ dias: { type: String, trim: true }, horas: { type: String, trim: true } }, { _id: false });

const ajustesSchema = new mongoose.Schema(
    {
        contacto: {
            telefono: { type: String, trim: true },
            whatsapp: { type: String, trim: true },
            email: { type: String, trim: true },
            direccion: { type: String, trim: true },
            localidad: { type: String, trim: true },
            instagram: { type: String, trim: true },
            horarios: { type: [horarioSchema], default: undefined },
        },
        costos: {
            publicado: { type: Boolean, default: false },
            alquiler: {
                mesesDeposito: { type: Number, min: 0, max: 6 },
                honorariosPorcentaje: { type: Number, min: 0, max: 20 },
                selladoPorcentaje: { type: Number, min: 0, max: 10 },
                gastosFijosARS: { type: Number, min: 0 },
            },
            venta: {
                honorariosPorcentaje: { type: Number, min: 0, max: 20 },
                escrituraPorcentaje: { type: Number, min: 0, max: 20 },
                senaPorcentaje: { type: Number, min: 0, max: 100 },
            },
            aclaracion: { type: String, trim: true },
        },
        lugares: { type: [lugarSchema], default: undefined },
        banco: {
            titular: { type: String, trim: true },
            banco: { type: String, trim: true },
            cbu: { type: String, trim: true },
            alias: { type: String, trim: true },
            cuit: { type: String, trim: true },
        },
    },
    { timestamps: true }
);

module.exports = mongoose.models.Ajustes || mongoose.model('Ajustes', ajustesSchema, 'ajustes');
