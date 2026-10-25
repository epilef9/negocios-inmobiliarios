// Panel de clientes del administrador.
// Un cliente es quien está vinculado a una propiedad: su dueño (propietario) o quien la alquila (inquilino).
// Se juntan en una sola lista; si la misma persona es las dos cosas aparece una sola vez.

const mongoose = require('mongoose');
const Property = require('../models/property.model');
const Contrato = require('../models/contrato.model');
const User = require('../models/user.model');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const texto = (valor, max) => (typeof valor === 'string' ? valor.trim().slice(0, max) : '');
const normalizar = (valor) => String(valor || '').trim().toLowerCase();

const errorHttp = (mensaje, statusCode) => {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
};

// Clave para reconocer a la misma persona en distintas propiedades: cuenta > email > teléfono > nombre
const claveDe = (persona) => {
    if (persona.usuario) return `u:${persona.usuario}`;
    if (normalizar(persona.email)) return `e:${normalizar(persona.email)}`;
    const telefono = String(persona.telefono || '').replace(/\D/g, '');
    if (telefono) return `t:${telefono}`;
    return `n:${normalizar(persona.nombre)}`;
};

const resumenPropiedad = (p) => ({
    id: String(p._id),
    titulo: p.title,
    direccion: p.direccionCompleta || p.location || '',
    estado: p.estado || 'disponible',
    operacion: p.categoria_operacion || null,
    imagen: Array.isArray(p.images) && p.images.length ? p.images[0] : null,
});

const panel = async () => {
    const [propiedades, usuarios, contratos] = await Promise.all([
        Property.find().select('+propietario +inquilino').sort({ orden: 1, createdAt: -1 }).lean(),
        User.find({ role: 'cliente' }).select('nombre apellido email telefono dni emailVerificado createdAt').sort({ nombre: 1 }).lean(),
        Contrato.find({ estado: { $in: ['activo', 'firmado', 'por_vencer'] } }).lean(),
    ]);

    const usuarioPorEmail = new Map(usuarios.map((u) => [normalizar(u.email), u]));
    const usuarioPorId = new Map(usuarios.map((u) => [String(u._id), u]));
    const contratoPorTitulo = new Map();
    contratos.forEach((c) => {
        const clave = normalizar(c.propiedad && c.propiedad.titulo);
        if (clave && !contratoPorTitulo.has(clave)) contratoPorTitulo.set(clave, c);
    });

    const clientes = new Map();
    const entrada = (persona) => {
        // Si no vino con la cuenta vinculada pero el email coincide con un usuario registrado, se reconoce igual
        const coincide = persona.usuario
            ? usuarioPorId.get(String(persona.usuario))
            : usuarioPorEmail.get(normalizar(persona.email));
        const conCuenta = { ...persona, usuario: coincide ? coincide._id : persona.usuario };
        const clave = claveDe(conCuenta);
        if (!clientes.has(clave)) {
            clientes.set(clave, {
                id: clave,
                usuarioId: coincide ? String(coincide._id) : null,
                registrado: Boolean(coincide),
                // Con cuenta se muestran los datos actuales de la cuenta; si no, los que se cargaron a mano
                nombre: (coincide && `${coincide.nombre || ''} ${coincide.apellido || ''}`.trim()) || persona.nombre || '',
                email: (coincide && coincide.email) || persona.email || '',
                telefono: (coincide && coincide.telefono) || persona.telefono || '',
                propietarioDe: [],
                alquilaEn: [],
            });
        }
        return clientes.get(clave);
    };

    const sinPropietario = [];
    const propiedadesParaElegir = propiedades.map((p) => {
        const base = resumenPropiedad(p);
        const usuarioPropietario = p.propietario?.usuario
            ? usuarioPorId.get(String(p.propietario.usuario))
            : null;

        // El inquilino sale de la propiedad; si no está cargado, del contrato vigente de esa propiedad
        let inquilino = p.inquilino && (p.inquilino.nombre || p.inquilino.usuario) ? { ...p.inquilino } : null;
        let origenInquilino = inquilino ? 'propiedad' : null;
        if (!inquilino) {
            const contrato = contratoPorTitulo.get(normalizar(p.title));
            if (contrato && contrato.cliente) {
                inquilino = { nombre: contrato.cliente.nombre, email: contrato.cliente.email, telefono: contrato.cliente.telefono };
                origenInquilino = 'contrato';
            }
        }
        const inquilinoVisible = inquilino || null;

        if (inquilinoVisible) {
            entrada(inquilinoVisible).alquilaEn.push({ ...base, origen: origenInquilino });
        }
        if (p.propietario && (p.propietario.nombre || p.propietario.usuario)) {
            const dueno = entrada(p.propietario);
            dueno.propietarioDe.push({
                ...base,
                inquilino: inquilinoVisible
                    ? { nombre: inquilinoVisible.nombre || '', telefono: inquilinoVisible.telefono || '', email: inquilinoVisible.email || '' }
                    : null,
            });
        } else {
            sinPropietario.push(base);
        }

        return {
            ...base,
            propietario: p.propietario && (p.propietario.nombre || p.propietario.usuario) ? entrada(p.propietario).id : null,
            propietarioUsuarioId: usuarioPropietario ? String(usuarioPropietario._id) : null,
            propietarioNombre: usuarioPropietario
                ? `${usuarioPropietario.nombre || ''} ${usuarioPropietario.apellido || ''}`.trim() || usuarioPropietario.email
                : p.propietario?.nombre || null,
            propietarioDni: usuarioPropietario?.dni || '',
            inquilino: inquilinoVisible ? entrada(inquilinoVisible).id : null,
        };
    });

    const lista = [...clientes.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
    return {
        clientes: lista,
        propiedades: propiedadesParaElegir,
        usuarios: usuarios.map((u) => ({
            id: String(u._id),
            nombre: `${u.nombre || ''} ${u.apellido || ''}`.trim() || u.email,
            email: u.email,
            telefono: u.telefono || '',
            dni: u.dni || '',
            emailVerificado: u.emailVerificado !== false,
            creadoEn: u.createdAt || null,
        })),
        resumen: {
            cuentas: usuarios.length,
            propietarios: lista.filter((c) => c.propietarioDe.length).length,
            inquilinos: lista.filter((c) => c.alquilaEn.length).length,
            registrados: lista.filter((c) => c.registrado).length,
            propiedadesSinPropietario: sinPropietario.length,
        },
    };
};

// Asigna (o quita, con persona = null) el propietario o el inquilino de una propiedad.
// persona: { usuarioId } para alguien con cuenta, o { nombre, email, telefono } para quien no la tiene.
const asignar = async (propertyId, rol, persona, reemplazar = false) => {
    if (!mongoose.isValidObjectId(propertyId)) throw errorHttp('El id de la propiedad no es válido', 400);
    if (!['propietario', 'inquilino'].includes(rol)) throw errorHttp('El rol debe ser propietario o inquilino', 400);

    let valor = null;
    if (persona) {
        if (typeof persona !== 'object' || Array.isArray(persona)) throw errorHttp('Los datos de la persona no son válidos', 400);
        if (persona.usuarioId) {
            if (!mongoose.isValidObjectId(persona.usuarioId)) throw errorHttp('El usuario no es válido', 400);
            const usuario = await User.findById(persona.usuarioId).select('nombre apellido email telefono').lean();
            if (!usuario) throw errorHttp('No existe ese usuario', 404);
            valor = {
                usuario: usuario._id,
                nombre: `${usuario.nombre || ''} ${usuario.apellido || ''}`.trim() || usuario.email,
                email: usuario.email,
                telefono: usuario.telefono || '',
            };
        } else {
            const nombre = texto(persona.nombre, 120);
            const email = texto(persona.email, 150).toLowerCase();
            const telefono = texto(persona.telefono, 40);
            if (!nombre) throw errorHttp('El nombre es obligatorio', 400);
            if (email && !EMAIL.test(email)) throw errorHttp('El email no es válido', 400);
            valor = { nombre, email, telefono };
        }
    }

    const propiedad = await Property.findById(propertyId).select('+propietario +inquilino estado title');
    if (!propiedad) throw errorHttp('Propiedad no encontrada', 404);

    const esMisma = (a, b) => {
        if (!a || !b) return false;
        if (a.usuario && b.usuario) return String(a.usuario) === String(b.usuario);
        if (normalizar(a.email) && normalizar(b.email)) return normalizar(a.email) === normalizar(b.email);
        return Boolean(normalizar(a.nombre)) && normalizar(a.nombre) === normalizar(b.nombre);
    };
    const tiene = (persona) => Boolean(persona && (persona.nombre || persona.usuario));
    const otroRol = rol === 'propietario' ? 'inquilino' : 'propietario';

    if (valor) {
        // Hace falta el dueño antes que el inquilino, y nadie es dueño e inquilino de la misma propiedad
        if (rol === 'inquilino' && !tiene(propiedad.propietario)) {
            throw errorHttp('Cargá primero el propietario de esta propiedad: no puede tener inquilino sin dueño.', 400);
        }
        if (tiene(propiedad[otroRol]) && esMisma(valor, propiedad[otroRol])) {
            throw errorHttp(
                rol === 'inquilino'
                    ? 'Esa persona es la propietaria de esta propiedad: no puede ser también su inquilina.'
                    : 'Esa persona es la inquilina de esta propiedad: no puede ser también su propietaria.',
                400
            );
        }
    } else if (rol === 'propietario' && tiene(propiedad.inquilino)) {
        throw errorHttp('Quitá primero al inquilino: una propiedad con inquilino necesita propietario.', 400);
    }

    // No se pisa a quien ya figura: hay que confirmarlo (reemplazar: true)
    const actual = propiedad[rol];
    if (valor && actual && (actual.nombre || actual.usuario) && !reemplazar) {
        const mismaPersona = valor.usuario
            ? String(actual.usuario) === String(valor.usuario)
            : normalizar(actual.nombre) === normalizar(valor.nombre) && normalizar(actual.email) === normalizar(valor.email);
        if (!mismaPersona) {
            const error = errorHttp(
                `Esta propiedad ya tiene ${rol === 'propietario' ? 'propietario' : 'inquilino'}: ${actual.nombre || 'otra persona'}.`,
                409
            );
            error.code = 'YA_ASIGNADO';
            error.actual = actual.nombre || '';
            throw error;
        }
    }

    // Tener inquilino implica que está alquilada; una propiedad vendida no se puede alquilar
    const cambios = { updatedAt: Date.now() };
    if (rol === 'inquilino') {
        if (valor && propiedad.estado === 'vendido') throw errorHttp('Una propiedad vendida no puede tener inquilino.', 400);
        if (valor && propiedad.estado !== 'alquilado') cambios.estado = 'alquilado';
        if (!valor && propiedad.estado === 'alquilado') cambios.estado = 'disponible';
    }

    await Property.updateOne(
        { _id: propertyId },
        valor ? { $set: { ...cambios, [rol]: valor } } : { $set: cambios, $unset: { [rol]: '' } }
    );
    return { estado: cambios.estado || propiedad.estado || 'disponible' };
};

module.exports = { panel, asignar };
