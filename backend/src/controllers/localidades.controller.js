const Localidad = require('../models/localidad.model');

exports.getLocalidades = async (_req, res) => {
    try {
        const localidades = await Localidad.find({ activa: true, provincia: 'entre_rios' })
            .sort({ nombre: 1 })
            .select('nombre provincia');
        res.status(200).json({ data: localidades });
    } catch (_error) {
        res.status(500).json({ message: 'No se pudieron obtener las localidades' });
    }
};
