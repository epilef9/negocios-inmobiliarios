const visitasService = require('../services/visitas.service');

exports.getAllVisitas = async (req, res) => {
    try {
        const visitas = await visitasService.getAllVisitas(req.query);
        return res.status(200).json({ data: visitas });
    } catch (error) {
        console.error('Error al obtener visitas:', error);
        return res.status(500).json({ message: 'Error al obtener visitas', error: error.message });
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
        return res.status(500).json({ message: 'Error al obtener la visita', error: error.message });
    }
};

exports.createVisita = async (req, res) => {
    try {
        const newVisita = await visitasService.createVisita(req.body);
        return res.status(201).json({ data: newVisita, message: 'Visita agendada correctamente' });
    } catch (error) {
        console.error('Error al crear visita:', error);
        return res.status(400).json({ message: 'Error al crear visita', error: error.message });
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
        return res.status(400).json({ message: 'Error al actualizar visita', error: error.message });
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
        return res.status(400).json({ message: 'Error al actualizar estado', error: error.message });
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
        return res.status(500).json({ message: 'Error al eliminar visita', error: error.message });
    }
};

exports.resetVisitas = async (_req, res) => {
    try {
        const resetVisitas = await visitasService.seedDefaultVisitas(true);
        return res.status(200).json({
            data: resetVisitas,
            message: 'Visitas reiniciadas con éxito a los valores predeterminados',
        });
    } catch (error) {
        console.error('Error al reiniciar visitas:', error);
        return res.status(500).json({ message: 'Error al reiniciar visitas', error: error.message });
    }
};
