// Manda el recordatorio del día anterior de UNA visita, sin esperar al cron, para probar los botones
// "Confirmo" / "No voy a poder". Solo en desarrollo: el cron manda a todas las visitas de mañana y, con la base
// compartida, eso podría mandarle mails a otras personas.
//
// Uso (desde backend/):
//   npm run probar:recordatorio -- <idDeVisita>
// Sin mail configurado en el .env, el mail (con los enlaces) se muestra en esta consola.

const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Visita = require('./models/visita.model');
const { mandarRecordatorio } = require('./services/recordatorios.service');
const tokensVisita = require('./services/tokensVisita.service');

async function probar() {
    if (process.env.NODE_ENV === 'production') throw new Error('Este script es solo para desarrollo.');
    const id = process.argv[2];
    if (!mongoose.isValidObjectId(id)) throw new Error('Pasá el id de la visita: npm run probar:recordatorio -- <idDeVisita>');

    await connectDB();
    const visita = await Visita.findById(id).lean();
    if (!visita) throw new Error('No existe una visita con ese id.');
    if (!visita.cliente?.email) throw new Error('La visita no tiene email: el recordatorio no tiene a quién llegar.');
    if (!['pendiente', 'confirmada', 'reprogramada'].includes(visita.estado)) throw new Error(`La visita está ${visita.estado}: no lleva recordatorio.`);
    const inicio = tokensVisita.inicioDeVisita(visita);
    if (!inicio || inicio <= new Date()) throw new Error('La visita ya pasó (o su fecha no se entiende): el enlace nacería vencido.');

    await mandarRecordatorio(visita);
    await Visita.updateOne({ _id: visita._id }, { $set: { recordatorioEnviadoEn: new Date() } });
    console.log(`Recordatorio mandado a ${visita.cliente.email}.`);
}

probar()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
