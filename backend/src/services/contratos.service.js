const ContratoRepository = require('../repositories/contratos.repository');

class ContratoService {
    async createContrato(data) {
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
        return await ContratoRepository.update(id, data);
    }

    async deleteContrato(id) {
        return await ContratoRepository.delete(id);
    }
}

module.exports = new ContratoService();
