const NOMBRES_DOCUMENTO = {
    dniTitularFrente: 'DNI del titular (frente)',
    dniTitularDorso: 'DNI del titular (dorso)',
    cuilTitular: 'Constancia de CUIL/CUIT',
    recibosIngresos: 'Recibos de sueldo',
    constanciaIngresos: 'Constancia de ingresos',
    domicilio: 'Comprobante de domicilio',
    dniCotitularFrente: 'DNI del cotitular (frente)',
    dniCotitularDorso: 'DNI del cotitular (dorso)',
    escrituraGarantia: 'Escritura de la garantía',
    reciboGarante: 'Recibo de sueldo del garante',
    documentacionCaucion: 'Documentación del seguro de caución',
};

const nombreDocumentoSolicitud = (id) => {
    const recibo = /^recibosIngresos:(\d+)$/.exec(id);
    if (recibo) return `${NOMBRES_DOCUMENTO.recibosIngresos} (${Number(recibo[1]) + 1} de 3)`;
    return NOMBRES_DOCUMENTO[id] || 'Documento';
};

module.exports = { NOMBRES_DOCUMENTO, nombreDocumentoSolicitud };
