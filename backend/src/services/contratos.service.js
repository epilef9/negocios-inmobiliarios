const mongoose = require('mongoose');
const ContratoRepository = require('../repositories/contratos.repository');
const Solicitud = require('../models/solicitud.model');
const Property = require('../models/property.model');
const User = require('../models/user.model');
const { validarContrato } = require('../validators/contrato.validator');
const { leerDatos } = require('./solicitudes.service');

// La solicitud de publicación (PR #96) puede no estar en todas las ramas. Si está, se usa para
// recuperar los datos del dueño; si no, el contrato se arma solo con lo que tenga la propiedad.
let SolicitudPublicacion = null;
try {
    SolicitudPublicacion = require('../models/solicitudPublicacion.model');
} catch {
    SolicitudPublicacion = null;
}

const CAMPOS_PERSONA = [
    'nombre', 'apellido', 'dni', 'cuil', 'fechaNacimiento', 'email', 'telefono',
    'domicilio', 'localidad', 'provincia', 'ocupacion', 'ingresosMensuales',
];

const errorHttp = (mensaje, statusCode) => {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
};

const persona = (datos = {}) => Object.fromEntries(
    CAMPOS_PERSONA.map((campo) => [campo, typeof datos[campo] === 'string' ? datos[campo].trim() : ''])
);

const validar = (datos) => {
    const errores = validarContrato(datos);
    if (!errores.length) return;
    const error = errorHttp(errores[0], 400);
    error.errores = errores;
    throw error;
};

// Busca la publicación que originó la propiedad. Primero el vínculo nuevo; si la propiedad es
// anterior a ese vínculo, se busca la solicitud aprobada que la creó.
const buscarPublicacion = async (propiedad) => {
    if (!SolicitudPublicacion) return null;
    if (propiedad.publicacion) {
        const porId = await SolicitudPublicacion.findById(propiedad.publicacion).lean();
        if (porId) return porId;
    }
    return await SolicitudPublicacion.findOne({ propiedadCreada: propiedad._id, estado: 'aprobada' })
        .sort({ createdAt: -1 })
        .lean();
};

// Dueño de la propiedad: de la publicación (contacto) o, si la propiedad ya lo tenía cargado, del
// usuario o de la persona que se guardó a mano. Si no hay ninguno, queda sin propietario.
const propietarioDePropiedad = async (propiedad) => {
    const publicacion = await buscarPublicacion(propiedad);
    if (publicacion) {
        const contacto = publicacion.contacto || {};
        return {
            publicacionId: String(publicacion._id),
            origen: 'publicacion',
            propietario: {
                usuarioId: publicacion.cliente ? String(publicacion.cliente) : '',
                nombre: contacto.nombre || '',
                apellido: contacto.apellido || '',
                dni: contacto.dni || '',
                domicilio: '',
                telefono: contacto.telefono || '',
                email: contacto.email || '',
            },
        };
    }

    const dueno = propiedad.propietario;
    if (!dueno || (!dueno.nombre && !dueno.usuario)) {
        return { publicacionId: '', origen: null, propietario: null };
    }

    const usuario = dueno.usuario
        ? await User.findById(dueno.usuario).select('nombre apellido dni telefono email').lean()
        : null;

    return {
        publicacionId: '',
        origen: 'propiedad',
        propietario: {
            usuarioId: dueno.usuario ? String(dueno.usuario) : '',
            nombre: usuario?.nombre || dueno.nombre || '',
            apellido: dueno.apellido || usuario?.apellido || '',
            dni: dueno.dni || usuario?.dni || '',
            domicilio: '',
            telefono: dueno.telefono || usuario?.telefono || '',
            email: dueno.email || usuario?.email || '',
        },
    };
};

class ContratoService {
    async createContrato(data) {
        validar(data);
        return await ContratoRepository.create(data);
    }

    async getAllContratos(filters = {}) {
        const contratos = await ContratoRepository.findAll(filters);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        return Promise.all(contratos.map(async (contrato) => {
            if (!contrato.fechaFin || !['activo', 'firmado', 'por_vencer'].includes(contrato.estado)) return contrato;
            const partes = contrato.fechaFin.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (!partes) return contrato;
            const vencimiento = new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]));
            const dias = Math.round((vencimiento.getTime() - hoy.getTime()) / 86400000);
            const estadoNuevo = dias < 0 ? 'vencido' : contrato.estado === 'activo' && dias <= 30 ? 'por_vencer' : contrato.estado;
            if (estadoNuevo === contrato.estado) return contrato;
            return ContratoRepository.update(contrato._id, { estado: estadoNuevo });
        }));
    }

    async getContratoById(id) {
        return await ContratoRepository.findById(id);
    }

    async updateContrato(id, data) {
        validar(data);
        return await ContratoRepository.update(id, data);
    }

    async deleteContrato(id) {
        return await ContratoRepository.delete(id);
    }

    // Selector del panel: primero las aprobadas y después las pendientes, con un resumen liviano.
    async listarSolicitudesParaContrato() {
        const solicitudes = await Solicitud.find({ estado: { $in: ['aprobada', 'pendiente'] } })
            .select('+datosCifrados')
            .populate('propiedad', 'title ciudad location')
            .sort({ estado: 1, createdAt: -1 })
            .limit(100)
            .lean();

        return solicitudes.map((solicitud) => {
            let datos = {};
            try {
                datos = leerDatos(solicitud);
            } catch {
                // Una solicitud con datos ilegibles no debe romper todo el selector.
                datos = {};
            }
            const titular = datos.titular || {};
            return {
                id: String(solicitud._id),
                estado: solicitud.estado,
                operacion: solicitud.operacion,
                createdAt: solicitud.createdAt,
                titular: {
                    nombre: titular.nombre || '',
                    apellido: titular.apellido || '',
                    email: titular.email || '',
                    telefono: titular.telefono || '',
                },
                propiedad: solicitud.propiedad ? {
                    id: String(solicitud.propiedad._id),
                    titulo: solicitud.propiedad.title,
                    ciudad: solicitud.propiedad.ciudad || solicitud.propiedad.location || '',
                } : null,
            };
        });
    }

    // Datos descifrados que el panel usa para precargar el contrato.
    async datosDesdeSolicitud(id) {
        if (!mongoose.isValidObjectId(id)) {
            throw errorHttp('El id de la solicitud no es válido.', 400);
        }

        const solicitud = await Solicitud.findById(id)
            .select('+datosCifrados')
            .lean();
        if (!solicitud) return null;

        // Si los datos guardados no se pueden descifrar (por ejemplo, una solicitud vieja cifrada con
        // otra clave), igual se devuelve la solicitud para no bloquear el panel: los datos personales
        // quedan vacíos y el frontend los marca para completarlos a mano.
        let datos = {};
        let datosIlegibles = false;
        try {
            datos = leerDatos(solicitud) || {};
        } catch {
            datos = {};
            datosIlegibles = true;
        }

        const propiedad = await Property.findById(solicitud.propiedad)
            .select('title location ciudad direccionCompleta price priceARS moneda categoria_operacion tipo_inmueble publicacion +propietario')
            .lean();

        const dueno = propiedad
            ? await propietarioDePropiedad(propiedad)
            : { publicacionId: '', origen: null, propietario: null };

        const moneda = propiedad?.moneda || null;
        const precio = propiedad
            ? Number(moneda === 'ARS' ? (propiedad.priceARS ?? propiedad.price) : propiedad.price)
            : null;

        return {
            solicitud: {
                id: String(solicitud._id),
                operacion: solicitud.operacion,
                estado: solicitud.estado,
                createdAt: solicitud.createdAt,
                usuarioId: solicitud.usuario ? String(solicitud.usuario) : '',
            },
            datosIlegibles,
            titular: persona(datos.titular),
            cotitular: datos.cotitular ? persona(datos.cotitular) : null,
            garantia: datos.garantia?.tipo ? {
                tipo: datos.garantia.tipo,
                localidadPropiedad: datos.garantia.localidadPropiedad || '',
                garante: datos.garantia.garante ? persona(datos.garantia.garante) : null,
            } : null,
            propiedad: propiedad ? {
                id: String(propiedad._id),
                titulo: propiedad.title || '',
                direccion: propiedad.direccionCompleta || propiedad.location || '',
                ciudad: propiedad.ciudad || '',
                tipoInmueble: propiedad.tipo_inmueble || '',
                operacion: propiedad.categoria_operacion || '',
                precio: Number.isFinite(precio) ? precio : null,
                moneda,
            } : null,
            propietario: dueno.propietario,
            publicacionId: dueno.publicacionId,
            origenPropietario: dueno.origen,
        };
    }
}

module.exports = new ContratoService();
