const SolicitudPublicacion = require('../models/solicitudPublicacion.model');
const Property = require('../models/property.model');
const User = require('../models/user.model');
const emailService = require('./email.service');
const documentosPublicacion = require('./documentosPublicacion.service');

const REQUISITOS_PUBLICAR = [
    'pub-escritura',
    'pub-planos',
    'pub-impuestos',
    'pub-reglamento',
    'pub-datos',
    'pub-desc',
    'pub-fotos',
    'pub-precio',
    'pub-condiciones',
    'pub-autorizacion',
    'pub-disponibilidad',
];
// Planos y reglamento son opcionales: en los requisitos figuran "si los tuviera" y "si aplica".
const DOCUMENTOS = ['dni', 'escritura', 'impuestos', 'planos', 'reglamento'];
const DOCUMENTOS_OBLIGATORIOS = ['dni', 'escritura', 'impuestos'];
// Solo se trabaja con estos tipos, operaciones y localidades (todas en Entre Ríos)
const TIPOS_PUBLICABLES = ['casa', 'departamento', 'terreno', 'local'];
const OPERACIONES = ['venta', 'alquiler', 'temporario'];
const LOCALIDADES = ['Villa Libertador San Martín', 'Crespo', 'Diamante'];
const PROVINCIA = 'Entre Ríos';

const errorHttp = (mensaje, statusCode) => {
    const error = new Error(mensaje);
    error.statusCode = statusCode;
    return error;
};

const capitalizar = (str) => (str ? str.charAt(0).toUpperCase() + str.slice(1) : '');

const solicitudPublicacionService = {
    crear: async (userId, datos) => {
        if (!datos.direccion || !datos.direccion.trim()) {
            throw errorHttp('La dirección de la propiedad es obligatoria.', 400);
        }
        if (!datos.precioPretendido || typeof datos.precioPretendido.monto !== 'number' || datos.precioPretendido.monto <= 0) {
            throw errorHttp('El precio pretendido debe ser un número mayor a cero.', 400);
        }

        const user = await User.findById(userId);
        if (!user) {
            throw errorHttp('Usuario no encontrado.', 404);
        }
        const checklist = new Set(user.checklistRequisitos || []);
        const faltantes = REQUISITOS_PUBLICAR.filter((id) => !checklist.has(id));
        if (faltantes.length) {
            throw errorHttp('Completá todos los requisitos para publicar tu propiedad antes de enviar la solicitud.', 400);
        }
        const tipoPropiedad = datos.tipoPropiedad || 'casa';
        if (!TIPOS_PUBLICABLES.includes(tipoPropiedad)) {
            throw errorHttp('Elegí un tipo de propiedad: casa, departamento, terreno o local comercial.', 400);
        }
        const operacion = datos.operacion || 'venta';
        if (!OPERACIONES.includes(operacion)) {
            throw errorHttp('Elegí si es venta, alquiler o alquiler temporario.', 400);
        }
        const ciudad = typeof datos.ciudad === 'string' && datos.ciudad.trim() ? datos.ciudad.trim() : LOCALIDADES[0];
        if (!LOCALIDADES.includes(ciudad)) {
            throw errorHttp(`Solo publicamos propiedades en ${LOCALIDADES.join(', ')}.`, 400);
        }
        // Expensas: hay que indicar si se pagan; si se carga un monto, se pagan sí o sí
        const montoExpensas = Number(datos.montoExpensas) > 0 ? Number(datos.montoExpensas) : 0;
        const expensas = montoExpensas > 0 ? 'si' : datos.expensas;
        if (expensas !== 'si' && expensas !== 'no') {
            throw errorHttp('Indicá si la propiedad paga expensas.', 400);
        }

        const documentos = datos.documentos || {};
        const esReferencia = (valor) => typeof valor === 'string' && valor.trim().length > 0;
        if (DOCUMENTOS_OBLIGATORIOS.some((nombre) => !esReferencia(documentos[nombre]))) {
            throw errorHttp('Tenés que adjuntar el DNI, la escritura y los impuestos al día para publicar.', 400);
        }
        const adjuntos = DOCUMENTOS.filter((nombre) => esReferencia(documentos[nombre]));
        // Cada referencia tiene que ser un documento que este mismo usuario subió
        if (!(await documentosPublicacion.sonDelUsuario(adjuntos.map((nombre) => documentos[nombre].trim()), userId))) {
            throw errorHttp('Los documentos adjuntos no son válidos. Volvé a adjuntarlos.', 400);
        }
        if (!Array.isArray(datos.fotos) || datos.fotos.length === 0) {
            throw errorHttp('Tenés que adjuntar al menos una foto de la propiedad.', 400);
        }

        const contacto = {
            nombre: datos.contacto?.nombre || user.nombre || '',
            apellido: datos.contacto?.apellido || user.apellido || '',
            email: datos.contacto?.email || user.email || '',
            telefono: datos.contacto?.telefono || user.telefono || '',
            dni: datos.contacto?.dni || user.dni || '',
        };

        const titulo = datos.titulo?.trim() || `${capitalizar(tipoPropiedad)} en ${capitalizar(operacion)} - ${datos.direccion.trim()}`;

        const nuevaSolicitud = new SolicitudPublicacion({
            cliente: userId,
            contacto,
            tipoPropiedad,
            operacion,
            titulo,
            direccion: datos.direccion.trim(),
            ciudad,
            provincia: PROVINCIA,
            referenciasUbicacion: datos.referenciasUbicacion?.trim() || '',
            // Un terreno no tiene ambientes ni baños
            ambientes: tipoPropiedad === 'terreno' ? 0 : Number(datos.ambientes) || 1,
            dormitorios: Number(datos.dormitorios) || 0,
            banos: tipoPropiedad === 'terreno' ? 0 : Number(datos.banos) || 1,
            superficieTotal: Number(datos.superficieTotal) || 0,
            superficieCubierta: Number(datos.superficieCubierta) || 0,
            expensas,
            montoExpensas: expensas === 'si' ? montoExpensas : 0,
            cochera: datos.cochera?.trim() || 'no',
            pisoUnidad: datos.pisoUnidad?.trim() || '',
            comodidades: Array.isArray(datos.comodidades) ? datos.comodidades.filter((item) => typeof item === 'string') : [],
            otrasComodidades: datos.otrasComodidades?.trim() || '',
            precioPretendido: {
                monto: Number(datos.precioPretendido.monto),
                moneda: datos.precioPretendido.moneda === 'ARS' ? 'ARS' : 'USD',
            },
            descripcion: datos.descripcion ? datos.descripcion.trim() : '',
            fotos: Array.isArray(datos.fotos) ? datos.fotos.filter((f) => typeof f === 'string' && f.trim().length > 0) : [],
            documentos: Object.fromEntries(adjuntos.map((nombre) => [nombre, documentos[nombre].trim()])),
            estado: 'pendiente',
        });

        return await nuevaSolicitud.save();
    },

    listarMisSolicitudes: async (userId) => {
        return await SolicitudPublicacion.find({ cliente: userId })
            .populate('propiedadCreada', 'title price location')
            .sort({ createdAt: -1 });
    },

    listarAdmin: async (filtros = {}) => {
        const query = {};
        if (filtros.estado && ['pendiente', 'aprobada', 'rechazada'].includes(filtros.estado)) {
            query.estado = filtros.estado;
        }

        return await SolicitudPublicacion.find(query)
            .select('+documentos')
            .populate('cliente', 'nombre apellido email telefono dni')
            .populate('propiedadCreada', 'title price location')
            .sort({ createdAt: -1 });
    },

    obtenerPorId: async (id, user) => {
        const solicitud = await SolicitudPublicacion.findById(id)
            .select('+documentos')
            .populate('cliente', 'nombre apellido email telefono dni')
            .populate('propiedadCreada', 'title price location');

        if (!solicitud) {
            throw errorHttp('Solicitud no encontrada.', 404);
        }

        if (user.role !== 'admin' && String(solicitud.cliente._id || solicitud.cliente) !== String(user._id || user.id)) {
            throw errorHttp('No tenés permiso para ver esta solicitud.', 403);
        }

        return solicitud;
    },

    // Devuelve el documento descifrado si quien lo pide es el administrador o el dueño de la solicitud
    obtenerDocumento: async (id, user) => {
        if (!/^[a-f\d]{24}$/i.test(String(id || ''))) throw errorHttp('Documento no encontrado.', 404);
        const documento = await documentosPublicacion.leer(id);
        if (!documento) throw errorHttp('Documento no encontrado.', 404);
        if (user.role !== 'admin') {
            const referencia = `privado:${String(id).toLowerCase()}`;
            const solicitud = await SolicitudPublicacion.findOne({
                $or: DOCUMENTOS.map((campo) => ({ [`documentos.${campo}`]: referencia })),
            }).select('cliente');
            const duenio = solicitud ? String(solicitud.cliente) : documento.usuario;
            if (duenio !== String(user._id)) throw errorHttp('No tenés permiso para ver este documento.', 403);
        }
        return documento;
    },

    aprobar: async (id) => {
        const solicitud = await SolicitudPublicacion.findById(id).populate('cliente');
        if (!solicitud) {
            throw errorHttp('Solicitud no encontrada.', 404);
        }
        if (solicitud.estado === 'aprobada') {
            throw errorHttp('La solicitud ya se encuentra aprobada.', 400);
        }

        // Tipo válido para el enum de Property:
        const tiposPermitidos = ['departamento', 'local', 'casa', 'monoambiente', 'terreno'];
        const tipoInmueble = tiposPermitidos.includes(solicitud.tipoPropiedad) ? solicitud.tipoPropiedad : 'casa';

        // 1. Crear la propiedad en el catálogo
        const nuevaPropiedad = new Property({
            title: solicitud.titulo || `${capitalizar(tipoInmueble)} en ${solicitud.direccion}`,
            description: solicitud.descripcion || '',
            price: solicitud.precioPretendido.monto,
            moneda: solicitud.precioPretendido.moneda || 'USD',
            location: solicitud.direccion,
            direccionCompleta: `${solicitud.direccion}, ${solicitud.ciudad || 'Libertador San Martín'}`,
            ciudad: solicitud.ciudad || 'Libertador San Martín',
            provincia: 'entre_rios',
            referenciasUbicacion: solicitud.referenciasUbicacion || '',
            categoria_operacion: solicitud.operacion,
            tipo_inmueble: tipoInmueble,
            cantidad_ambientes: solicitud.ambientes ?? 1,
            bedrooms: solicitud.dormitorios || 0,
            bathrooms: solicitud.banos ?? 1,
            area: solicitud.superficieTotal || 0,
            superficieCubierta: solicitud.superficieCubierta || 0,
            expensas: solicitud.expensas || '',
            montoExpensas: solicitud.montoExpensas || 0,
            cochera: solicitud.cochera || 'no',
            pisoUnidad: solicitud.pisoUnidad || '',
            comodidades: solicitud.comodidades || [],
            otrasComodidades: solicitud.otrasComodidades || '',
            images: solicitud.fotos && solicitud.fotos.length ? solicitud.fotos : [],
            estado: 'disponible',
            // Vínculo con la solicitud de publicación: los contratos sacan de ahí los datos del dueño.
            publicacion: solicitud._id,
            propietario: {
                usuario: solicitud.cliente?._id || solicitud.cliente,
                nombre: `${solicitud.contacto?.nombre || ''} ${solicitud.contacto?.apellido || ''}`.trim() || 'Propietario',
                apellido: solicitud.contacto?.apellido || '',
                dni: solicitud.contacto?.dni || '',
                email: solicitud.contacto?.email || '',
                telefono: solicitud.contacto?.telefono || '',
            },
        });

        await nuevaPropiedad.save();

        // 2. Actualizar estado de la solicitud
        solicitud.estado = 'aprobada';
        solicitud.propiedadCreada = nuevaPropiedad._id;
        solicitud.motivoRechazo = undefined;
        await solicitud.save();

        // 3. Avisar al cliente por email si tiene correo
        const emailCliente = solicitud.contacto?.email || solicitud.cliente?.email;
        if (emailCliente) {
            try {
                await emailService.avisarSolicitudPublicacionAprobada({
                    para: emailCliente,
                    nombre: solicitud.contacto?.nombre || solicitud.cliente?.nombre,
                    direccion: solicitud.direccion,
                });
            } catch (err) {
                console.error('[email] Error al notificar aprobación de publicación:', err.message);
            }
        }

        return {
            solicitud,
            propiedadId: String(nuevaPropiedad._id),
        };
    },

    rechazar: async (id, motivo) => {
        if (!motivo || !motivo.trim()) {
            throw errorHttp('Es obligatorio indicar el motivo del rechazo.', 400);
        }

        const solicitud = await SolicitudPublicacion.findById(id).populate('cliente');
        if (!solicitud) {
            throw errorHttp('Solicitud no encontrada.', 404);
        }

        solicitud.estado = 'rechazada';
        solicitud.motivoRechazo = motivo.trim();
        await solicitud.save();

        // Avisar al cliente por email si tiene correo
        const emailCliente = solicitud.contacto?.email || solicitud.cliente?.email;
        if (emailCliente) {
            try {
                await emailService.avisarSolicitudPublicacionRechazada({
                    para: emailCliente,
                    nombre: solicitud.contacto?.nombre || solicitud.cliente?.nombre,
                    direccion: solicitud.direccion,
                    motivo: solicitud.motivoRechazo,
                });
            } catch (err) {
                console.error('[email] Error al notificar rechazo de publicación:', err.message);
            }
        }

        return solicitud;
    },
};

solicitudPublicacionService.OPCIONES = { TIPOS_PUBLICABLES, OPERACIONES, LOCALIDADES, PROVINCIA, DOCUMENTOS, DOCUMENTOS_OBLIGATORIOS };

module.exports = solicitudPublicacionService;
