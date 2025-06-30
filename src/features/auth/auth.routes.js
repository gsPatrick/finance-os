// src/auth/auth.routes.js

const express = require('express');
const authController = require('./auth.controller');
const validate = require('../modules/validation/validate.middleware');
const authValidation = require('../modules/validation/schemas/auth.validation');

const router = express.Router();

// Rota de Login (não requer autenticação, é o ponto de entrada)
// POST /api/v1/auth/login
router.post('/login', validate({ body: authValidation.login }), authController.login);

// Outras rotas de autenticação poderiam ir aqui, como:
// POST /api/v1/auth/refresh-token
// POST /api/v1/auth/forgot-password
// POST /api/v1/auth/reset-password

module.exports = router;