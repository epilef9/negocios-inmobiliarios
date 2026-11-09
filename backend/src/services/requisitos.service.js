const Requisito = require('../models/requisito.model');

const REQUISITOS_INICIALES = [
    ['alquilar', 'Documentación personal', 'DNI del titular y co-titular (frente y dorso)'],
    ['alquilar', 'Documentación personal', 'Constancia de CUIL/CUIT'],
    ['alquilar', 'Documentación personal', 'Recibo de sueldo de los últimos 3 meses o constancia de ingresos'],
    ['alquilar', 'Documentación personal', 'Comprobante de domicilio actual'],
    ['alquilar', 'Garantía', 'Garantía propietaria con escritura en la provincia de Entre Ríos'],
    ['alquilar', 'Garantía', 'Recibo de sueldo del garante (ingreso mínimo equivalente a 2 alquileres)'],
    ['alquilar', 'Garantía', 'Alternativa: seguro de caución (sujeto a evaluación)'],
    ['alquilar', 'Condiciones económicas', 'Depósito en garantía equivalente a 1 mes de alquiler'],
    ['alquilar', 'Condiciones económicas', 'Comisión inmobiliaria: 3% a cargo del inquilino'],
    ['alquilar', 'Condiciones económicas', 'Contrato con actualización según índice vigente'],
    ['comprar', 'Documentación personal', 'DNI del titular y co-titular (frente y dorso)'],
    ['comprar', 'Documentación personal', 'Constancia de CUIL/CUIT'],
    ['comprar', 'Documentación personal', 'Comprobante de ingresos o certificado de ingresos'],
    ['comprar', 'Documentación personal', 'Comprobante de domicilio actual'],
    ['comprar', 'Financiación (si aplica)', 'Pre-aprobación bancaria o capacidad de pago demostrable'],
    ['comprar', 'Financiación (si aplica)', 'Documentación adicional solicitada por la entidad financiera'],
    ['comprar', 'Condiciones económicas', 'Seña: 10% del valor de la propiedad'],
    ['comprar', 'Condiciones económicas', 'Comisión inmobiliaria: 3% a cargo del comprador'],
    ['comprar', 'Condiciones económicas', 'Gastos de escritura: a cargo del comprador'],
    ['publicar', 'Documentación de la propiedad', 'Escritura o título de propiedad'],
    ['publicar', 'Documentación de la propiedad', 'Planos (si los tuviera)'],
    ['publicar', 'Documentación de la propiedad', 'Impuestos y servicios al día'],
    ['publicar', 'Documentación de la propiedad', 'Reglamento de copropiedad (si aplica)'],
    ['publicar', 'Información requerida', 'Datos completos de la propiedad'],
    ['publicar', 'Información requerida', 'Descripción detallada y características'],
    ['publicar', 'Información requerida', 'Fotografías de buena calidad'],
    ['publicar', 'Información requerida', 'Precio de venta o alquiler deseado'],
    ['publicar', 'Condiciones', 'La propiedad debe estar en condiciones de ser comercializada'],
    ['publicar', 'Condiciones', 'Firmar autorización para publicar'],
    ['publicar', 'Condiciones', 'Disponibilidad para visitas y/o tasaciones'],
].map(([operacion, seccion, texto], orden) => ({ operacion, seccion, texto, orden }));

async function ensureDefaults() {
    if (await Requisito.exists()) return;
    await Requisito.insertMany(REQUISITOS_INICIALES);
}

class RequisitosService {
    async listar() {
        await ensureDefaults();
        return Requisito.find({ activo: true }).sort({ operacion: 1, orden: 1, _id: 1 }).lean();
    }

    async listarAdmin() {
        await ensureDefaults();
        return Requisito.find().sort({ operacion: 1, orden: 1, _id: 1 }).lean();
    }

    async crear(data) {
        return Requisito.create(data);
    }

    async actualizar(id, data) {
        return Requisito.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true });
    }

    async eliminar(id) {
        return Requisito.findByIdAndDelete(id);
    }
}

module.exports = new RequisitosService();
