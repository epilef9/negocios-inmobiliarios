const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DIGITOS = (valor) => String(valor ?? '').replace(/\D/g, '');
const TEXTO = (valor, max = 160) => typeof valor === 'string' && valor.trim().length > 0 && valor.trim().length <= max;

const validarPersona = (persona, prefijo, errores) => {
    const camposTexto = [
        ['nombre', 'nombre', 80],
        ['apellido', 'apellido', 80],
        ['domicilio', 'domicilio', 180],
        ['localidad', 'localidad', 100],
        ['provincia', 'provincia', 100],
        ['ocupacion', 'ocupación o actividad laboral', 120],
    ];
    camposTexto.forEach(([campo, etiqueta, max]) => {
        if (!TEXTO(persona?.[campo], max)) errores.push(`${prefijo}${etiqueta}: completá este dato (máximo ${max} caracteres).`);
    });

    if (!/^\d{7,8}$/.test(DIGITOS(persona?.dni))) errores.push(`${prefijo}DNI: ingresá entre 7 y 8 números.`);
    if (!/^\d{11}$/.test(DIGITOS(persona?.cuil))) errores.push(`${prefijo}CUIL/CUIT: ingresá 11 números.`);
    if (!EMAIL.test(String(persona?.email ?? '').trim()) || String(persona.email).length > 150) {
        errores.push(`${prefijo}correo electrónico: ingresá una dirección válida.`);
    }
    if (DIGITOS(persona?.telefono).length < 8 || DIGITOS(persona?.telefono).length > 15) {
        errores.push(`${prefijo}teléfono: ingresá entre 8 y 15 números.`);
    }
    const nacimiento = new Date(persona?.fechaNacimiento);
    if (!persona?.fechaNacimiento || Number.isNaN(nacimiento.getTime()) || nacimiento >= new Date()) {
        errores.push(`${prefijo}fecha de nacimiento: ingresá una fecha válida anterior a hoy.`);
    }
    const ingresos = Number(persona?.ingresosMensuales);
    if (!Number.isFinite(ingresos) || ingresos <= 0 || ingresos > 1000000000000) {
        errores.push(`${prefijo}ingresos mensuales: ingresá un importe mayor a cero.`);
    }
    if (persona?.referencias !== undefined && (typeof persona.referencias !== 'string' || persona.referencias.length > 1000)) {
        errores.push(`${prefijo}referencias: el texto no puede superar los 1000 caracteres.`);
    }
};

const tieneArchivo = (archivos, campo) => Boolean(archivos[campo]?.length);

const validarSolicitud = ({ datos, archivos, operacion }) => {
    const errores = [];
    if (!datos || typeof datos !== 'object' || Array.isArray(datos)) {
        return ['Los datos personales no tienen un formato válido.'];
    }

    validarPersona(datos.titular, '', errores);

    if (typeof datos.incluyeCotitular !== 'boolean') {
        errores.push('Indicá si la solicitud incluye un cotitular.');
    } else if (datos.incluyeCotitular) {
        validarPersona(datos.cotitular, 'Cotitular: ', errores);
    }

    if (!tieneArchivo(archivos, 'dniTitularFrente')) errores.push('Adjuntá el frente del DNI del titular.');
    if (!tieneArchivo(archivos, 'dniTitularDorso')) errores.push('Adjuntá el dorso del DNI del titular.');
    if (!tieneArchivo(archivos, 'cuilTitular')) errores.push('Adjuntá la constancia de CUIL/CUIT del titular.');
    if (!tieneArchivo(archivos, 'domicilio')) errores.push('Adjuntá el comprobante de domicilio actual.');
    if (datos.ingresosTipo === 'recibos') {
        if ((archivos.recibosIngresos || []).length !== 3) errores.push('Adjuntá los recibos de sueldo de los últimos tres meses.');
        if (tieneArchivo(archivos, 'constanciaIngresos')) errores.push('Elegí una sola forma de acreditar tus ingresos.');
    } else if (datos.ingresosTipo === 'constancia') {
        if (!tieneArchivo(archivos, 'constanciaIngresos')) errores.push('Adjuntá la constancia de ingresos.');
        if (tieneArchivo(archivos, 'recibosIngresos')) errores.push('Elegí una sola forma de acreditar tus ingresos.');
    } else {
        errores.push('Elegí cómo vas a acreditar tus ingresos.');
    }

    if (datos.incluyeCotitular) {
        if (!tieneArchivo(archivos, 'dniCotitularFrente')) errores.push('Adjuntá el frente del DNI del cotitular.');
        if (!tieneArchivo(archivos, 'dniCotitularDorso')) errores.push('Adjuntá el dorso del DNI del cotitular.');
    } else if (tieneArchivo(archivos, 'dniCotitularFrente') || tieneArchivo(archivos, 'dniCotitularDorso')) {
        errores.push('Quitá los documentos del cotitular o indicá que la solicitud lo incluye.');
    }

    if (operacion === 'alquiler') {
        if (!['propietaria', 'caucion'].includes(datos.garantia?.tipo)) {
            errores.push('Elegí una garantía para continuar con la solicitud de alquiler.');
        } else if (datos.garantia.tipo === 'propietaria') {
            validarPersona(datos.garantia.garante, 'Garante: ', errores);
            if (!TEXTO(datos.garantia.localidadPropiedad, 100)) errores.push('Indicá la localidad de la propiedad ofrecida como garantía.');
            if (datos.garantia.provinciaPropiedad !== 'Entre Ríos') errores.push('La propiedad ofrecida como garantía debe estar en Entre Ríos.');
            if (!tieneArchivo(archivos, 'escrituraGarantia')) errores.push('Adjuntá la escritura de la propiedad en Entre Ríos.');
            if (!tieneArchivo(archivos, 'reciboGarante')) errores.push('Adjuntá un recibo de sueldo del garante.');
            if (tieneArchivo(archivos, 'documentacionCaucion')) errores.push('Adjuntá únicamente los documentos de la garantía seleccionada.');
        } else if (tieneArchivo(archivos, 'escrituraGarantia') || tieneArchivo(archivos, 'reciboGarante')) {
            errores.push('Adjuntá únicamente los documentos de la garantía seleccionada.');
        }
    } else if (['escrituraGarantia', 'reciboGarante', 'documentacionCaucion'].some((tipo) => tieneArchivo(archivos, tipo))) {
        errores.push('La documentación de garantía solo corresponde a solicitudes de alquiler.');
    }

    return errores;
};

module.exports = { validarSolicitud, validarPersona };
