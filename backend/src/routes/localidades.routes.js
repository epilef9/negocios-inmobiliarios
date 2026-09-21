const express = require('express');
const localidadesController = require('../controllers/localidades.controller');

const router = express.Router();

router.get('/', localidadesController.getLocalidades);

module.exports = router;
