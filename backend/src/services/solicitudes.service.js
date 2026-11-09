const crypto = require('node:crypto');
const mongoose = require('mongoose');
const Solicitud = require('../models/solicitud.model');
const SolicitudNotificacion = require('../models/solicitud-notificacion.model');
const Property = require('../models/property.model');
const ciclo = require('./solicitudes-ciclo.service');
const { cifrar, descifrar, obtenerClave } = require('../utils/cifrado-solicitudes');
const { operacionesDe, operacionesAbiertas, operacionDeSolicitud, precioDe, principalDe } = require('../utils/operaciones');
const { nombreDocumentoSolicitud } = require('../utils/solicitud-documentos');

const bucketDocumentos = () => {
    if (!mongoose.connection.db) throw new Error('La base de datos no está conectada.');
    return new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'documentosSolicitudes' });
};

const subirBuffer = (bucket, buffer, filename, metadata) =>
    new Promise((resolve, reject) => {
        const stream = bucket.openUploadStream(filename, { metadata, contentType: 'application/octet-stream' });
        stream.once('error', async (error) => {
            try {
                await bucket.delete(stream.id);
            } catch (errorBorrado) {
                console.error('[solicitudes] No se pudo limpiar una carga incompleta:', errorBorrado);
            }
            reject(error);
        });
        stream.once('finish', () => resolve(stream.id));
        stream.end(buffer);
    });

const borrarArchivos = async (bucket, ids) => {
    const resultados = await Promise.allSettled(ids.map((id) => bucket.delete(id)));
    resultados.forEach((resultado) => {
        if (resultado.status === 'rejected') console.error('[solicitudes] No se pudo limpiar un archivo temporal:', resultado.reason);
    });
};

const leerBuffer = (stream) =>
    new Promise((resolve, reject) => {
        const partes = [];
        stream.on('data', (parte) => partes.push(parte));
        stream.once('error', reject);
        stream.once('end', () => resolve(Buffer.concat(partes)));
    });

const cifrarDocumentos = async (solicitud, archivos) => {
    const bucket = bucketDocumentos();
    const ids = [];
    const documentos = [];

    try {
        for (const [tipo, lista] of Object.entries(archivos)) {
            for (const archivo of lista) {
                const archivoId = await subirBuffer(
                    bucket,
                    cifrar(archivo.buffer),
                    `${solicitud._id}-${crypto.randomUUID()}`,
                    { solicitud: String(solicitud._id), tipo }
                );
                ids.push(archivoId);
                documentos.push({
                    tipo,
                    archivoId,
                    tamano: archivo.size,
                    tipoMime: archivo.mimetype === 'image/jpg' ? 'image/jpeg' : archivo.mimetype,
                });
            }
        }
        return { bucket, ids, documentos };
    } catch (error) {
        await borrarArchivos(bucket, ids);
        throw error;
    }
};

const asegurarPropiedadSolicitable = async (propiedadId, operacion) => {
    const propiedad = await Property.findById(propiedadId)
        .select('titulo ubicacion ciudad precio precioARS moneda categoriaOperacion operaciones precios permitirSolicitudes estado vendida')
        .lean();
    if (!propiedad) {
        const error = new Error('La propiedad ya no está publicada.');
        error.statusCode = 404;
        throw error;
    }

    // HU-25: se admiten solicitudes para las operaciones en las que está publicada (no temporario)
    const buscada = operacionDeSolicitud(operacion);
    if (propiedad.permitirSolicitudes === false || !operacionesDe(propiedad).includes(buscada)) {
        const error = new Error('Esta propiedad no admite solicitudes para esa operación.');
        error.statusCode = 409;
        throw error;
    }
    // Reservada, vendida o alquilada no admite más; la venta con inquilino adentro sí (HU-28)
    if (!operacionesAbiertas(propiedad).includes(buscada)) {
        const error = new Error('Esta propiedad ya no está disponible para nuevas solicitudes.');
        error.statusCode = 409;
        throw error;
    }
    return propiedad;
};

const descripcionSolicitud = (operacion) => (operacion === 'alquiler' ? 'alquiler' : 'compra');

const crear = async ({ usuario, propiedadId, operacion, datos, archivos, claveIdempotencia, porReferencias = false }) => {
    const existente = await Solicitud.findOne({ usuario, claveIdempotencia });
    if (existente) return { solicitud: existente, repetida: true };

    const propiedad = await asegurarPropiedadSolicitable(propiedadId, operacion);
    obtenerClave();
    const solicitud = new Solicitud({
        usuario,
        propiedad: propiedadId,
        operacion,
        datosCifrados: cifrar(Buffer.from(JSON.stringify(datos), 'utf8')).toString('base64'),
        claveIdempotencia,
    });
    if (porReferencias) {
        const documentosService = require('./solicitudes-documentos.service');
        solicitud.documentos = Object.entries(archivos).flatMap(([tipo, lista]) => lista.map((archivo) => ({
            tipo, archivoId: archivo.fileId, tamano: archivo.size, tipoMime: archivo.mimetype,
        })));
        try {
            await mongoose.connection.transaction(async (session) => {
                const disponible = await Property.updateOne({ _id: propiedadId, estado: 'disponible', permitirSolicitudes: { $ne: false } },
                    { $inc: { versionDisponibilidad: 1 } }, { session });
                if (!disponible.matchedCount) throw Object.assign(new Error('La propiedad ya no está disponible.'), { statusCode: 409 });
                await documentosService.vincular(solicitud.documentos, solicitud, session);
                await solicitud.save({ session });
                await SolicitudNotificacion.create([{ solicitud: solicitud._id,
                    mensaje: `Nueva solicitud de ${descripcionSolicitud(operacion)} para ${propiedad.titulo}.` }], { session });
            });
            return { solicitud, repetida: false };
        } catch (error) {
            if (error.code === 11000) {
                const repetida = await Solicitud.findOne({ usuario, claveIdempotencia });
                if (repetida) return { solicitud: repetida, repetida: true };
            }
            throw error;
        }
    }
    const { bucket, ids, documentos } = await cifrarDocumentos(solicitud, archivos);
    solicitud.documentos = documentos;

    try {
        await solicitud.save();
        await SolicitudNotificacion.create({
            solicitud: solicitud._id,
            mensaje: `Nueva solicitud de ${descripcionSolicitud(operacion)} para ${propiedad.titulo}.`,
        });
        return { solicitud, repetida: false };
    } catch (error) {
        await borrarArchivos(bucket, ids);
        if (error.code === 11000) {
            const repetida = await Solicitud.findOne({ usuario, claveIdempotencia });
            if (repetida) return { solicitud: repetida, repetida: true };
        }
        if (solicitud.isNew === false) {
            await Solicitud.deleteOne({ _id: solicitud._id }).catch((errorBorrado) => {
                console.error('[solicitudes] No se pudo revertir la solicitud incompleta:', errorBorrado);
            });
        }
        throw error;
    }
};

const camposPropiedadAdmin = 'titulo ciudad ubicacion precio precioARS moneda tipoInmueble estado vendida fotos categoriaOperacion operaciones precios direccionCompleta';

const ESTADOS_SOLICITUD = ['pendiente', 'falta_documentacion', 'aprobada', 'rechazada', 'vencida', 'cerrada'];

const infoPublica = (solicitud) => {
    const propiedadPoblada = solicitud.propiedad && typeof solicitud.propiedad === 'object' && solicitud.propiedad.titulo !== undefined
        ? solicitud.propiedad
        : null;
    const propiedadId = propiedadPoblada?._id || solicitud.propiedad;
    const precio = propiedadPoblada
        ? precioDe(propiedadPoblada, operacionDeSolicitud(solicitud.operacion)) ?? precioDe(propiedadPoblada, principalDe(propiedadPoblada))
        : null;
    // En la moneda en que se publicó (precio está siempre en dólares)
    const precioMostrado = precio ? { monto: precio.moneda === 'ARS' ? precio.precioARS ?? precio.precio : precio.precio, moneda: precio.moneda } : null;
    return ({
    id: String(solicitud._id),
    operacion: solicitud.operacion,
    estado: solicitud.estado,
    comentarioEstado: solicitud.comentarioEstado || '',
    documentosSolicitados: Array.isArray(solicitud.documentosSolicitados) ? solicitud.documentosSolicitados : [],
    documentosSolicitadosEn: solicitud.documentosSolicitadosEn || null,
    documentosSolicitadosPor: solicitud.documentosSolicitadosPor ? String(solicitud.documentosSolicitadosPor) : null,
    archivada: solicitud.archivada === true,
    archivadaEn: solicitud.archivadaEn || null,
    historialEstados: Array.isArray(solicitud.historialEstados)
        ? solicitud.historialEstados.map(({ estado, comentario, comentarioReferenciaIndice, tipoEvento, fecha }) => ({
            estado,
            comentario,
            ...(tipoEvento && tipoEvento !== 'estado' ? { tipoEvento } : {}),
            ...(Number.isInteger(comentarioReferenciaIndice) ? { comentarioReferenciaIndice } : {}),
            fecha,
        }))
        : [],
    createdAt: solicitud.createdAt,
    updatedAt: solicitud.updatedAt,
    propiedad: propiedadId && {
        id: String(propiedadId),
        disponible: Boolean(propiedadPoblada),
        titulo: propiedadPoblada?.titulo || null,
        ciudad: propiedadPoblada?.ciudad || propiedadPoblada?.ubicacion || null,
        localidad: propiedadPoblada?.ciudad || propiedadPoblada?.ubicacion || null,
        direccion: propiedadPoblada?.direccionCompleta || propiedadPoblada?.ubicacion || null,
        tipoInmueble: propiedadPoblada?.tipoInmueble || null,
        estadoPropiedad: propiedadPoblada?.estado || null,
        // El precio que se muestra es el de la operación de la solicitud (compra → venta)
        tipoOperacion: propiedadPoblada ? operacionDeSolicitud(solicitud.operacion) : null,
        precio: precioMostrado?.monto ?? null,
        moneda: precioMostrado?.moneda || null,
        imagen: Array.isArray(propiedadPoblada?.fotos) && propiedadPoblada.fotos.length ? propiedadPoblada.fotos[0] : null,
    },
    });
};

const infoCliente = (solicitud) => {
    const mensajes = ciclo.mensajesCliente(solicitud);
    const publica = infoPublica(solicitud);
    return {
        id: publica.id,
        operacion: publica.operacion,
        estado: publica.estado,
        createdAt: publica.createdAt,
        propiedad: publica.propiedad,
        historialEstados: mensajes,
        comentarioEstado: mensajes[0]?.comentario || '',
        comentarioFecha: mensajes[0]?.fecha || null,
        documentosSolicitados: solicitud.estado === 'falta_documentacion' && Array.isArray(solicitud.documentosSolicitados)
            ? solicitud.documentosSolicitados
            : [],
    };
};

const infoDocumentos = (solicitudId, documentos) => {
    const indicesRecibos = new Map();
    return (Array.isArray(documentos) ? documentos : []).map(({ tipo, tamano, tipoMime }) => {
        const indice = tipo === 'recibosIngresos' ? (indicesRecibos.get(tipo) || 0) : undefined;
        if (indice !== undefined) indicesRecibos.set(tipo, indice + 1);
        const identificador = indice === undefined ? tipo : `${tipo}:${indice}`;
        return {
            tipo,
            ...(indice !== undefined ? { indice } : {}),
            nombre: nombreDocumentoSolicitud(identificador),
            tamano,
            tipoMime,
            url: `/solicitudes/${solicitudId}/documentos/${encodeURIComponent(identificador)}`,
        };
    });
};

const leerDatos = (solicitud) => JSON.parse(descifrar(Buffer.from(solicitud.datosCifrados, 'base64')).toString('utf8'));

const serializarSolicitudAdmin = (solicitud) => {
    const informacion = {
        ...infoPublica(solicitud),
        documentos: infoDocumentos(solicitud._id, solicitud.documentos),
    };

    try {
        return {
            ...informacion,
            datosPersonales: leerDatos(solicitud),
            cliente: solicitud.usuario ? { id: String(solicitud.usuario) } : null,
            problemaDescifrado: false,
        };
    } catch {
        console.warn('[solicitudes] No se pudieron descifrar los datos de una solicitud administrativa.');
        return {
            ...informacion,
            datosPersonales: null,
            documentos: [],
            cliente: null,
            problemaDescifrado: true,
        };
    }
};

const listarMias = async (usuario) => {
    const solicitudes = await Solicitud.find({ usuario })
        .populate('propiedad', 'titulo ciudad ubicacion fotos estado vendida operaciones categoriaOperacion')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    return Promise.all(solicitudes.map(async (solicitud) => {
        const actual = await ciclo.sincronizarSolicitud(solicitud, solicitud.propiedad);
        return infoCliente(actual);
    }));
};

const listarAdmin = async () => {
    const solicitudes = await Solicitud.find()
        .select('+datosCifrados')
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
    const propiedadIds = [...new Set(
        solicitudes
            .map((solicitud) => solicitud.propiedad)
            .filter((id) => mongoose.isValidObjectId(id))
            .map(String)
    )];
    const propiedades = propiedadIds.length
        ? await Property.find({ _id: { $in: propiedadIds } }).select(camposPropiedadAdmin).lean()
        : [];
    const propiedadesPorId = new Map(propiedades.map((propiedad) => [String(propiedad._id), propiedad]));
    return Promise.all(solicitudes.map(async (solicitud) => {
        const propiedad = propiedadesPorId.get(String(solicitud.propiedad));
        const actual = await ciclo.sincronizarSolicitud(solicitud, propiedad);
        return serializarSolicitudAdmin({ ...actual, propiedad: propiedad || actual.propiedad });
    }));
};

const obtenerPorId = async (id, usuario, esAdmin) => {
    const consulta = Solicitud.findById(id).select('+datosCifrados');
    if (!esAdmin) consulta.where({ usuario });
    let solicitud = await consulta.lean();
    if (!solicitud) return null;
    const propiedad = mongoose.isValidObjectId(solicitud.propiedad)
        ? await Property.findById(solicitud.propiedad).select(camposPropiedadAdmin).lean()
        : null;
    solicitud = await ciclo.sincronizarSolicitud(solicitud, propiedad);
    solicitud = { ...solicitud, propiedad: propiedad || solicitud.propiedad };
    if (esAdmin) return serializarSolicitudAdmin(solicitud);
    return {
        ...infoCliente(solicitud),
        datosPersonales: leerDatos(solicitud),
        documentos: infoDocumentos(solicitud._id, solicitud.documentos),
    };
};

const validarComentario = (comentario) => {
    if (typeof comentario !== 'string' || comentario.length > ciclo.MAXIMO_COMENTARIO) {
        throw Object.assign(new Error('El comentario no puede superar los 500 caracteres.'), { statusCode: 400 });
    }
};

const errorSolicitud = (mensaje, statusCode = 400) => Object.assign(new Error(mensaje), { statusCode });

const validarDocumentosSolicitados = ({ solicitud, datos, documentosSolicitados }) => {
    if (!Array.isArray(documentosSolicitados) || documentosSolicitados.length === 0 || documentosSolicitados.length > 12
        || documentosSolicitados.some((documento) => typeof documento !== 'string')
        || new Set(documentosSolicitados).size !== documentosSolicitados.length) {
        throw errorSolicitud('Seleccioná uno o más documentos válidos para solicitar.');
    }

    const presentados = (solicitud.documentos || []).map((documento) => documento.tipo);
    const permitidos = new Set(['dniTitularFrente', 'dniTitularDorso', 'cuilTitular', 'domicilio']
        .filter((tipo) => presentados.includes(tipo)));
    if (datos.incluyeCotitular === true) {
        ['dniCotitularFrente', 'dniCotitularDorso'].filter((tipo) => presentados.includes(tipo))
            .forEach((tipo) => permitidos.add(tipo));
    }

    if (datos.ingresosTipo === 'recibos') {
        const recibos = presentados.filter((tipo) => tipo === 'recibosIngresos').length;
        if (recibos > 3) throw errorSolicitud('La solicitud contiene una cantidad no válida de recibos de sueldo.', 409);
        for (let indice = 0; indice < recibos; indice++) permitidos.add(`recibosIngresos:${indice}`);
    } else if (datos.ingresosTipo === 'constancia' && presentados.includes('constanciaIngresos')) {
        permitidos.add('constanciaIngresos');
    }

    const tipoGarantia = datos.garantia?.tipo;
    if (solicitud.operacion === 'alquiler' && tipoGarantia === 'propietaria') {
        ['escrituraGarantia', 'reciboGarante'].filter((tipo) => presentados.includes(tipo))
            .forEach((tipo) => permitidos.add(tipo));
    } else if (solicitud.operacion === 'alquiler' && tipoGarantia === 'caucion') {
        permitidos.add('documentacionCaucion');
    }

    if (documentosSolicitados.some((documento) => !permitidos.has(documento))) {
        throw errorSolicitud('Uno o más documentos no corresponden a esta solicitud o a la opción elegida.');
    }
    return documentosSolicitados;
};

const actualizarEstado = async ({ id, estado, comentario, documentosSolicitados = [], reutilizarComentario = false, administradoPor }) => {
    if (!['pendiente', 'falta_documentacion', 'aprobada', 'rechazada'].includes(estado)) {
        throw errorSolicitud('Elegí una acción válida para esta solicitud.');
    }
    if (typeof comentario !== 'string' || comentario.length > 250) {
        throw errorSolicitud('El comentario debe tener hasta 250 caracteres.');
    }
    if (!Array.isArray(documentosSolicitados)) {
        throw errorSolicitud('La selección de documentos no es válida.');
    }
    let comentarioLimpio = comentario.trim();
    const requiereComentario = ['pendiente', 'falta_documentacion', 'rechazada'].includes(estado);
    let comentarioReferenciaIndice = -1;
    if (reutilizarComentario) {
        if (estado !== 'pendiente' || comentarioLimpio || documentosSolicitados.length) {
            throw errorSolicitud('No se puede asociar un comentario anterior a esta acción.');
        }
    }
    if (requiereComentario && !comentarioLimpio) {
        if (!reutilizarComentario) throw errorSolicitud('Escribí un comentario para continuar.');
    }
    if (estado === 'falta_documentacion' && !documentosSolicitados.length) {
        throw errorSolicitud('Seleccioná los documentos que el cliente debe corregir.');
    }
    if (estado !== 'falta_documentacion' && documentosSolicitados.length) {
        throw errorSolicitud('Solo se pueden solicitar documentos al pedir una corrección.');
    }
    const solicitud = await Solicitud.findById(id).select('+datosCifrados').lean();
    if (!solicitud) {
        throw errorSolicitud('No encontramos esa solicitud.', 404);
    }
    if (solicitud.estado !== 'pendiente') {
        throw errorSolicitud('Esta solicitud ya fue atendida y no admite más cambios.', 409);
    }

    let datos;
    try {
        datos = leerDatos(solicitud);
    } catch {
        throw errorSolicitud('No se puede modificar esta solicitud hasta resolver un problema con su información.', 409);
    }

    if (reutilizarComentario) {
        const historial = Array.isArray(solicitud.historialEstados) ? solicitud.historialEstados : [];
        comentarioReferenciaIndice = -1;
        for (let indice = historial.length - 1; indice >= 0; indice--) {
            if (historial[indice].comentario?.trim()) {
                comentarioReferenciaIndice = indice;
                break;
            }
        }
        if (comentarioReferenciaIndice < 0) throw errorSolicitud('No hay un comentario previo disponible para asociar a esta acción.');
        comentarioLimpio = historial[comentarioReferenciaIndice].comentario.trim();
    }

    const seleccionados = estado === 'falta_documentacion'
        ? validarDocumentosSolicitados({ solicitud, datos, documentosSolicitados })
        : [];
    const ahora = new Date();
    const filtro = { _id: id, estado: 'pendiente', datosCifrados: solicitud.datosCifrados };
    if (solicitud.updatedAt) filtro.updatedAt = solicitud.updatedAt;
    else filtro.historialEstados = solicitud.historialEstados || [];
    const registroHistorial = reutilizarComentario
        ? { estado, comentario: '', comentarioReferenciaIndice, administradoPor, fecha: ahora }
        : { estado, comentario: comentarioLimpio, administradoPor, fecha: ahora };
    const cambios = {
        $set: {
            estado,
            comentarioEstado: comentarioLimpio,
            documentosSolicitados: seleccionados,
            documentosSolicitadosEn: seleccionados.length ? ahora : null,
            documentosSolicitadosPor: seleccionados.length ? administradoPor : null,
        },
        $push: { historialEstados: registroHistorial },
    };

    if (['pendiente', 'aprobada', 'falta_documentacion'].includes(estado)) {
        await asegurarPropiedadSolicitable(solicitud.propiedad, solicitud.operacion);
    }
    const actualizada = await Solicitud.findOneAndUpdate(
        filtro,
        cambios,
        { new: true, runValidators: true }
    ).select('+datosCifrados').lean();
    if (!actualizada) {
        throw errorSolicitud('La solicitud cambió mientras se actualizaba. Recargá e intentá nuevamente.', 409);
    }

    let propiedad = null;
    try {
        propiedad = mongoose.isValidObjectId(actualizada.propiedad)
            ? await Property.findById(actualizada.propiedad).select(camposPropiedadAdmin).lean()
            : null;
    } catch (error) {
        console.error('[solicitudes] Estado guardado; no se pudo recuperar el nombre de la propiedad para completar la respuesta:', error.name || 'Error');
    }
    const notificacion = await ciclo.avisarCambio(actualizada, {
        propiedad: propiedad?.titulo || 'Propiedad',
        documentosSolicitados: seleccionados,
        mensaje: comentarioLimpio,
    });
    return {
        ...serializarSolicitudAdmin({
        ...actualizada,
        propiedad: propiedad || actualizada.propiedad,
        }),
        notificacion,
    };
};

const claveDeDocumentoSolicitado = ({ tipo, indice }) => {
    if (tipo === 'recibosIngresos') {
        if (!Number.isInteger(indice) || indice < 0 || indice > 2) {
            throw errorSolicitud('Indicá qué recibo de sueldo estás actualizando.');
        }
        return `${tipo}:${indice}`;
    }
    if (indice !== undefined) throw errorSolicitud('La referencia de un documento no es válida.');
    return tipo;
};

const corregirDocumentacion = async ({ id, usuario, referencias, claveIdempotencia }) => {
    const documentosService = require('./solicitudes-documentos.service');
    if (!Array.isArray(referencias) || referencias.length < 1 || referencias.length > 12
        || referencias.some((referencia) => !referencia || typeof referencia !== 'object'
            || typeof referencia.id !== 'string' || typeof referencia.tipo !== 'string')
        || typeof claveIdempotencia !== 'string' || !/^[\da-f-]{36}$/i.test(claveIdempotencia)) {
        throw errorSolicitud('Revisá los documentos adjuntos e intentá nuevamente.');
    }
    const claves = referencias.map(claveDeDocumentoSolicitado);
    if (new Set(claves).size !== claves.length) throw errorSolicitud('Hay documentos repetidos en el envío.');
    const recibida = await Solicitud.findOne({ _id: id, usuario, ultimaCorreccionIdempotencia: claveIdempotencia })
        .select('+ultimaCorreccionIdempotencia')
        .lean();
    if (recibida) return { solicitud: infoCliente(recibida), repetida: true };

    const resueltos = await documentosService.resolver(
        referencias.map(({ id: archivoId, tipo }) => ({ id: archivoId, tipo })),
        usuario,
        claveIdempotencia
    );
    const indicesPorTipo = new Map();
    const archivos = referencias.map((referencia, indice) => {
        const indiceTipo = indicesPorTipo.get(referencia.tipo) || 0;
        indicesPorTipo.set(referencia.tipo, indiceTipo + 1);
        const archivo = resueltos[referencia.tipo]?.[indiceTipo];
        if (!archivo) throw errorSolicitud('No pudimos validar uno de los documentos adjuntos.');
        return { ...archivo, tipo: referencia.tipo, indice: referencia.indice };
    });

    let guardada;
    let repetida = false;
    await mongoose.connection.transaction(async (session) => {
        const solicitud = await Solicitud.findOne({ _id: id, usuario })
            .select('+datosCifrados +ultimaCorreccionIdempotencia')
            .session(session)
            .lean();
        if (!solicitud) throw errorSolicitud('No encontramos una solicitud tuya con ese identificador.', 404);
        if (solicitud.ultimaCorreccionIdempotencia === claveIdempotencia) {
            guardada = solicitud;
            repetida = true;
            return;
        }
        if (solicitud.estado !== 'falta_documentacion') {
            throw errorSolicitud('Esta solicitud no tiene una corrección documental pendiente.', 409);
        }

        const solicitados = Array.isArray(solicitud.documentosSolicitados) ? solicitud.documentosSolicitados : [];
        if (!solicitados.length || solicitados.length !== claves.length
            || solicitados.some((clave) => !claves.includes(clave))) {
            throw errorSolicitud('El envío debe incluir exactamente los documentos que te solicitaron.');
        }
        let datos;
        try {
            datos = leerDatos(solicitud);
        } catch {
            throw errorSolicitud('No podemos validar esta solicitud en este momento. Contactanos para recibir ayuda.', 409);
        }
        validarDocumentosSolicitados({ solicitud, datos, documentosSolicitados: solicitados });

        const documentosActualizados = Array.isArray(solicitud.documentos) ? solicitud.documentos.map((documento) => ({ ...documento })) : [];
        for (const archivo of archivos) {
            if (archivo.tipo === 'recibosIngresos') {
                const posiciones = documentosActualizados
                    .map((documento, indice) => documento.tipo === archivo.tipo ? indice : -1)
                    .filter((indice) => indice >= 0);
                const posicion = posiciones[archivo.indice];
                if (posicion === undefined) throw errorSolicitud('No encontramos el recibo de sueldo solicitado. Recargá e intentá nuevamente.', 409);
                documentosActualizados[posicion] = {
                    tipo: archivo.tipo, archivoId: archivo.fileId, tamano: archivo.size, tipoMime: archivo.mimetype,
                };
                continue;
            }
            const posicion = documentosActualizados.findIndex((documento) => documento.tipo === archivo.tipo);
            if (posicion < 0 && archivo.tipo !== 'documentacionCaucion') {
                throw errorSolicitud('No encontramos el documento solicitado. Recargá e intentá nuevamente.', 409);
            }
            const nuevoDocumento = {
                tipo: archivo.tipo, archivoId: archivo.fileId, tamano: archivo.size, tipoMime: archivo.mimetype,
            };
            if (posicion < 0) documentosActualizados.push(nuevoDocumento);
            else documentosActualizados[posicion] = nuevoDocumento;
        }

        await documentosService.vincular(
            archivos.map(({ tipo, fileId }) => ({ tipo, archivoId: fileId })),
            { _id: solicitud._id, usuario, claveIdempotencia },
            session
        );

        const ahora = new Date();
        const filtro = { _id: id, usuario, estado: 'falta_documentacion', documentosSolicitados: solicitados };
        if (solicitud.updatedAt) filtro.updatedAt = solicitud.updatedAt;
        else filtro.historialEstados = solicitud.historialEstados || [];
        guardada = await Solicitud.findOneAndUpdate(filtro, {
            $set: {
                estado: 'pendiente',
                documentos: documentosActualizados,
                documentosSolicitados: [],
                documentosSolicitadosEn: null,
                documentosSolicitadosPor: null,
                ultimaCorreccionIdempotencia: claveIdempotencia,
                comentarioEstado: '',
            },
            $push: {
                historialEstados: {
                    estado: 'pendiente',
                    comentario: '',
                    tipoEvento: 'documentacion_presentada',
                    fecha: ahora,
                },
            },
        }, { new: true, runValidators: true, session }).select('+datosCifrados').lean();
        if (!guardada) throw errorSolicitud('La solicitud cambió durante el envío. Recargá e intentá nuevamente.', 409);

        await SolicitudNotificacion.findOneAndUpdate({ solicitud: solicitud._id }, {
            $set: {
                mensaje: `Documentación corregida: nueva revisión de ${descripcionSolicitud(solicitud.operacion)}.`,
                leida: false,
            },
            $setOnInsert: { tipo: 'nueva_solicitud' },
        }, { upsert: true, setDefaultsOnInsert: true, session });
    });

    let propiedad = null;
    try {
        propiedad = mongoose.isValidObjectId(guardada.propiedad)
            ? await Property.findById(guardada.propiedad).select(camposPropiedadAdmin).lean()
            : null;
    } catch (error) {
        console.error('[solicitudes] Documentación guardada; no se pudo recuperar el nombre de la propiedad para completar la respuesta:', error.name || 'Error');
    }
    const notificacion = repetida ? undefined : await ciclo.avisarCambio(guardada, {
        propiedad: propiedad?.titulo || 'Propiedad',
        mensaje: 'El cliente presentó la documentación solicitada.',
    });
    return {
        solicitud: infoCliente({ ...guardada, propiedad: propiedad || guardada.propiedad }),
        notificacion,
        repetida,
    };
};

const agregarComentario = async ({ id, comentario, administradoPor }) => {
    validarComentario(comentario);
    const solicitud = await Solicitud.findById(id).select('+datosCifrados').lean();
    if (!solicitud) {
        const error = new Error('No encontramos esa solicitud.');
        error.statusCode = 404;
        throw error;
    }

    try {
        leerDatos(solicitud);
    } catch {
        const error = new Error('No se puede agregar un comentario hasta resolver el problema técnico de descifrado.');
        error.statusCode = 409;
        throw error;
    }

    const actualizada = await Solicitud.findOneAndUpdate(
        { _id: id, estado: solicitud.estado, datosCifrados: solicitud.datosCifrados },
        {
            $set: { comentarioEstado: comentario },
            $push: { historialEstados: { estado: solicitud.estado, comentario, administradoPor, fecha: new Date() } },
        },
        { new: true, runValidators: true }
    ).select('+datosCifrados').lean();
    if (!actualizada) {
        const error = new Error('La solicitud cambió mientras se guardaba el comentario. Recargá e intentá nuevamente.');
        error.statusCode = 409;
        throw error;
    }

    const propiedad = mongoose.isValidObjectId(actualizada.propiedad)
        ? await Property.findById(actualizada.propiedad).select(camposPropiedadAdmin).lean()
        : null;
    return serializarSolicitudAdmin({
        ...actualizada,
        propiedad: propiedad || actualizada.propiedad,
    });
};

const actualizarArchivado = async ({ id, archivada, administradoPor }) => {
    const cambios = archivada
        ? {
            $set: {
                archivada: true,
                archivadaEn: new Date(),
                archivadaPor: administradoPor,
            },
        }
        : {
            $set: { archivada: false },
            $unset: { archivadaEn: 1, archivadaPor: 1 },
        };
    const solicitud = await Solicitud.findByIdAndUpdate(id, cambios, { new: true, runValidators: true }).lean();
    if (!solicitud) {
        const error = new Error('No encontramos esa solicitud.');
        error.statusCode = 404;
        throw error;
    }
    return {
        id: String(solicitud._id),
        archivada: solicitud.archivada === true,
        archivadaEn: solicitud.archivadaEn || null,
    };
};

const eliminarDefinitivamente = async (id) => mongoose.connection.transaction(async (session) => {
    const solicitud = await Solicitud.findById(id).session(session).lean();
    if (!solicitud) {
        const error = new Error('No encontramos esa solicitud.');
        error.statusCode = 404;
        throw error;
    }

    const idsDocumentos = [...new Map(
        (Array.isArray(solicitud.documentos) ? solicitud.documentos : [])
            .map(({ archivoId }) => [String(archivoId), archivoId])
    ).values()];
    if (idsDocumentos.some((archivoId) => !mongoose.isValidObjectId(archivoId))) {
        const error = new Error('No se pudo verificar de forma segura la documentación asociada; no se eliminó la solicitud.');
        error.statusCode = 409;
        throw error;
    }

    if (idsDocumentos.length) {
        const documentoCompartido = await Solicitud.exists({
            _id: { $ne: solicitud._id },
            'documentos.archivoId': { $in: idsDocumentos },
        }).session(session);
        if (documentoCompartido) {
            const error = new Error('Un documento está asociado a otra solicitud; no se eliminó ningún dato.');
            error.statusCode = 409;
            throw error;
        }

        const db = mongoose.connection.db;
        const archivosCollection = db.collection('documentosSolicitudes.files');
        const fragmentosCollection = db.collection('documentosSolicitudes.chunks');
        const archivos = await archivosCollection.find({ _id: { $in: idsDocumentos } }, { session }).toArray();
        const idsVerificados = new Set(
            archivos
                .filter((archivo) => archivo.metadata?.solicitud === String(solicitud._id))
                .map((archivo) => String(archivo._id))
        );
        if (idsVerificados.size !== idsDocumentos.length) {
            const error = new Error('No se pudo verificar la propiedad de todos los documentos; no se eliminó ningún dato.');
            error.statusCode = 409;
            throw error;
        }

        await fragmentosCollection.deleteMany({ files_id: { $in: idsDocumentos } }, { session });
        const borrados = await archivosCollection.deleteMany({ _id: { $in: idsDocumentos } }, { session });
        if (borrados.deletedCount !== idsDocumentos.length) {
            throw new Error('No se pudieron eliminar todos los documentos asociados.');
        }
    }

    const borrado = await Solicitud.deleteOne({ _id: solicitud._id }, { session });
    if (borrado.deletedCount !== 1) {
        const error = new Error('La solicitud cambió durante la eliminación; no se completó la operación.');
        error.statusCode = 409;
        throw error;
    }
    await SolicitudNotificacion.deleteMany({ solicitud: solicitud._id }, { session });
});

const listarNotificacionesAdmin = async () => {
    const notificaciones = await SolicitudNotificacion.find()
        .populate({
            path: 'solicitud',
            select: 'operacion estado createdAt propiedad archivada',
            populate: { path: 'propiedad', select: 'titulo' },
        })
        .sort({ updatedAt: -1 })
        .limit(20)
        .lean();
    return notificaciones
        .filter((notificacion) => notificacion.solicitud && ['pendiente', 'falta_documentacion'].includes(notificacion.solicitud.estado) && !notificacion.solicitud.archivada && !notificacion.leida)
        .map((notificacion) => ({
            id: String(notificacion._id),
            mensaje: notificacion.mensaje,
            leida: notificacion.leida,
            createdAt: notificacion.createdAt,
            solicitudId: String(notificacion.solicitud._id),
            estado: notificacion.solicitud.estado,
            operacion: notificacion.solicitud.operacion,
            propiedad: notificacion.solicitud.propiedad?.titulo || 'Propiedad',
        }));
};

const contarPendientes = async () => {
    const pendientes = await Solicitud.find({ estado: { $in: ['pendiente', 'falta_documentacion'] }, archivada: { $ne: true } })
        .populate('propiedad', 'titulo estado vendida operaciones categoriaOperacion').lean();
    let cantidad = 0;
    for (const solicitud of pendientes) {
        const actual = await ciclo.sincronizarSolicitud(solicitud, solicitud.propiedad);
        if (['pendiente', 'falta_documentacion'].includes(actual.estado)) cantidad++;
    }
    return cantidad;
};

const obtenerDocumento = async (solicitudId, usuario, esAdmin, tipo) => {
    const query = Solicitud.findById(solicitudId);
    if (!esAdmin) query.where({ usuario });
    const solicitud = await query.lean();
    if (!solicitud) return null;

    const recibo = /^recibosIngresos:(\d+)$/.exec(tipo);
    const documentos = Array.isArray(solicitud.documentos) ? solicitud.documentos : [];
    const documento = recibo
        ? documentos.filter((item) => item.tipo === 'recibosIngresos')[Number(recibo[1])]
        : documentos.find((item) => item.tipo === tipo);
    if (!documento) return null;

    const bucket = bucketDocumentos();
    const file = await bucket.find({ _id: documento.archivoId }).next();
    if (!file || file.metadata?.solicitud !== String(solicitud._id)) return null;
    const contenido = descifrar(await leerBuffer(bucket.openDownloadStream(documento.archivoId)));
    return { contenido, mimeType: documento.tipoMime, nombre: nombreDocumentoSolicitud(tipo) };
};

module.exports = {
    contarPendientes,
    crear,
    infoCliente,
    listarMias,
    listarAdmin,
    obtenerPorId,
    actualizarEstado,
    corregirDocumentacion,
    agregarComentario,
    actualizarArchivado,
    eliminarDefinitivamente,
    listarNotificacionesAdmin,
    obtenerDocumento,
    // Los datos personales se descifran solo en los servicios que los necesitan (panel/contratos)
    leerDatos,
};
