const mongoose = require('mongoose');
const visitasService = require('../services/visitas.service');
const Property = require('../models/property.model');
const agenda = require('../services/agenda.service');

exports.getDisponibilidad = async (req, res) => {
    try {
        const desde = typeof req.query.desde === 'string' ? req.query.desde : undefined;
        const hasta = typeof req.query.hasta === 'string' ? req.query.hasta : undefined;
        return res.status(200).json({ data: await agenda.disponibilidad(desde, hasta) });
    } catch (error) {
        console.error('Error al calcular la disponibilidad:', error);
        return res.status(500).json({ message: 'No se pudo consultar la agenda' });
    }
};

exports.getAllVisitas = async (req, res) => {
    try {
        const visitas = await visitasService.getAllVisitas(req.query);
        return res.status(200).json({ data: visitas });
    } catch (error) {
        console.error('Error al obtener visitas:', error);
        return res.status(500).json({ message: 'Error al obtener visitas' });
    }
};

exports.getVisitaById = async (req, res) => {
    try {
        const visita = await visitasService.getVisitaById(req.params.id);
        if (!visita) {
            return res.status(404).json({ message: 'Visita no encontrada' });
        }
        return res.status(200).json({ data: visita });
    } catch (error) {
        console.error('Error al obtener la visita:', error);
        return res.status(500).json({ message: 'Error al obtener la visita' });
    }
};

// Texto recortado y sin saltos de línea (estos datos se muestran en el panel y se usan en mensajes)
const corto = (valor, maximo) => (typeof valor === 'string' ? valor.replace(/[\r\n\t]+/g, ' ').trim().slice(0, maximo) : '');

// Pedir una visita es público: se guardan solo los campos esperados, siempre como "pendiente", y los datos
// de la propiedad salen de la base (no de lo que mande el navegador)
exports.createVisita = async (req, res) => {
    try {
        const { cliente = {}, propiedad = {}, fecha, horario, notaAdicional } = req.body;
        const datos = {
            cliente: {
                nombre: corto(cliente.nombre, 80),
                telefono: corto(cliente.telefono, 30),
                email: corto(cliente.email, 150).toLowerCase(),
                iniciales: corto(cliente.iniciales, 3),
            },
            propiedad: {
                id: '',
                titulo: corto(propiedad.titulo, 150),
                direccion: corto(propiedad.direccion, 200),
                precio: corto(propiedad.precio, 60),
            },
            fecha: corto(fecha, 20),
            horario: corto(horario, 20),
            estado: 'pendiente',
            notaAdicional: corto(notaAdicional, 500),
        };

        if (!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(datos.fecha) && !/^\d{4}-\d{2}-\d{2}$/.test(datos.fecha)) {
            return res.status(400).json({ message: 'La fecha de la visita no es válida' });
        }
        if (datos.cliente.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.cliente.email)) {
            return res.status(400).json({ message: 'El email no es válido' });
        }
        if (datos.cliente.telefono.replace(/\D/g, '').length < 6) {
            return res.status(400).json({ message: 'El teléfono no es válido' });
        }

        // Que el horario esté libre (y, para el público, dentro del horario de atención)
        const esAdmin = req.user && req.user.role === 'admin';
        const motivo = await agenda.motivoNoDisponible(datos.fecha, datos.horario, { controlarHorario: !esAdmin });
        if (motivo) return res.status(409).json({ message: motivo, code: 'HORARIO_NO_DISPONIBLE' });

        if (typeof propiedad.id === 'string' && mongoose.isValidObjectId(propiedad.id)) {
            const real = await Property.findById(propiedad.id).select('title location direccionCompleta estado permitirVisita').lean();
            if (!real) return res.status(404).json({ message: 'La propiedad ya no está publicada' });
            if (real.estado === 'vendido' || real.estado === 'alquilado') {
                return res.status(409).json({ message: 'Esta propiedad ya no está disponible para visitas' });
            }
            datos.propiedad.id = String(real._id);
            datos.propiedad.titulo = real.title;
            datos.propiedad.direccion = real.direccionCompleta || real.location || '';
        }

        const newVisita = await visitasService.createVisita(datos);
        return res.status(201).json({ data: newVisita, message: 'Visita agendada correctamente' });
    } catch (error) {
        console.error('Error al crear visita:', error);
        return res.status(500).json({ message: 'No se pudo agendar la visita. Probá de nuevo o escribinos por WhatsApp.' });
    }
};

exports.updateVisita = async (req, res) => {
    try {
        const updated = await visitasService.updateVisita(req.params.id, req.body);
        if (!updated) {
            return res.status(404).json({ message: 'Visita no encontrada' });
        }
        return res.status(200).json({ data: updated, message: 'Visita actualizada' });
    } catch (error) {
        console.error('Error al actualizar visita:', error);
        return res.status(400).json({ message: 'Error al actualizar visita' });
    }
};

exports.updateEstadoVisita = async (req, res) => {
    try {
        const { estado, nuevaFecha, nuevoHorario, motivo } = req.body;
        const updated = await visitasService.updateEstadoVisita(
            req.params.id,
            estado,
            { nuevaFecha, nuevoHorario, motivo }
        );
        if (!updated) {
            return res.status(404).json({ message: 'Visita no encontrada' });
        }
        return res.status(200).json({ data: updated, message: 'Estado de la visita actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar estado de la visita:', error);
        return res.status(400).json({ message: 'Error al actualizar estado' });
    }
};

exports.deleteVisita = async (req, res) => {
    try {
        const deleted = await visitasService.deleteVisita(req.params.id);
        if (!deleted) {
            return res.status(404).json({ message: 'Visita no encontrada' });
        }
        return res.status(200).json({ message: 'Visita eliminada correctamente' });
    } catch (error) {
        console.error('Error al eliminar visita:', error);
        return res.status(500).json({ message: 'Error al eliminar visita' });
    }
};

exports.resetVisitas = async (_req, res) => {
    // Reiniciar borra todas las visitas reales: solo se permite en desarrollo
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ message: 'Reiniciar las visitas no está disponible en el sitio publicado' });
    }
    try {
        const resetVisitas = await visitasService.seedDefaultVisitas(true);
        return res.status(200).json({
            data: resetVisitas,
            message: 'Visitas reiniciadas con éxito a los valores predeterminados',
        });
    } catch (error) {
        console.error('Error al reiniciar visitas:', error);
        return res.status(500).json({ message: 'Error al reiniciar visitas' });
    }
};
