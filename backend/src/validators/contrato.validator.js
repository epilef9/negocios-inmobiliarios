const DIGITOS = (valor) => String(valor ?? '').replace(/\D/g, '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// El DNI y el CUIL/CUIT son opcionales en el contrato (hay contratos viejos sin ellos y clientes
// que no los cargaron), pero si vienen tienen que tener un formato válido.
const validarPersona = (persona, prefijo, errores) => {
    if (!persona || typeof persona !== 'object') return;

    const dni = DIGITOS(persona.dni);
    if (dni && !/^\d{7,8}$/.test(dni)) {
        errores.push(`${prefijo}DNI: ingresá entre 7 y 8 números.`);
    }

    const cuil = DIGITOS(persona.cuil);
    if (cuil && !/^\d{11}$/.test(cuil)) {
        errores.push(`${prefijo}CUIL/CUIT: ingresá 11 números.`);
    }

    const email = String(persona.email ?? '').trim();
    if (email && !EMAIL.test(email)) {
        errores.push(`${prefijo}email: ingresá un correo válido.`);
    }
};

// Devuelve la lista de errores para poder mostrarlos juntos en el panel.
const validarContrato = (datos = {}) => {
    const errores = [];
    validarPersona(datos.cliente, '', errores);
    validarPersona(datos.cotitular, 'Cotitular: ', errores);
    validarPersona(datos.garante, 'Garante: ', errores);
    validarPersona(datos.propietario, 'Propietario: ', errores);
    return errores;
};

module.exports = { validarContrato };
