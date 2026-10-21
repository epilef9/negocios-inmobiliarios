const express = require('express');
const router = express.Router();
const emailService = require('../services/email.service');
const { validateContacto, limitarContacto } = require('../validators/contacto.validator');

// Consulta del formulario de contacto: llega por mail a la inmobiliaria (CONTACT_TO) y se responde al visitante
router.post('/', limitarContacto, validateContacto, async (req, res) => {
    try {
        await emailService.enviarConsulta(req.body);
        res.status(200).json({ message: 'Consulta enviada. Te respondemos por email.' });
    } catch (error) {
        console.error('[contacto] No se pudo enviar la consulta:', error.message);
        res.status(500).json({ message: 'No pudimos enviar tu consulta. Probá de nuevo o escribinos por WhatsApp.' });
    }
});

module.exports = router;
