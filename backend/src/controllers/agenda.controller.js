const agenda = require('../services/agenda.service');

// Público: el horario de visitas (tramos por día, duración, días cerrados) y su texto para mostrar
exports.getHorario = async (req, res) => {
    try {
        const horario = await agenda.horarioActual();
        const { semana, duracionMinutos, cerrados } = horario;
        return res.status(200).json({ data: { semana, duracionMinutos, cerrados, texto: agenda.textoHorario(horario) } });
    } catch (error) {
        console.error('Error al leer el horario de visitas:', error);
        return res.status(500).json({ message: 'No se pudo leer el horario de visitas' });
    }
};

// Administrador: guarda el horario y avisa qué visitas ya pedidas quedaron fuera de él
exports.putHorario = async (req, res) => {
    try {
        const { semana, duracionMinutos, cerrados = [] } = req.body || {};
        const datos = { semana, duracionMinutos: Number(duracionMinutos), cerrados };
        const error = agenda.validarHorario(datos);
        if (error) return res.status(400).json({ message: error });

        const horario = await agenda.guardarHorario(datos);
        const fueraDeHorario = await agenda.visitasFueraDeHorario(horario);
        return res.status(200).json({
            data: { ...horario, texto: agenda.textoHorario(horario), fueraDeHorario },
            message: 'Horario de visitas guardado',
        });
    } catch (error) {
        console.error('Error al guardar el horario de visitas:', error);
        return res.status(500).json({ message: 'No se pudo guardar el horario de visitas' });
    }
};
