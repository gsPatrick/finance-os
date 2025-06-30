// src/auth/auth.routes.js (MODIFICADO para incluir rota de registro)

const express = require('express');
const authController = require('./auth.controller'); // Importa o controller atualizado
const validate = require('../../modules/validation/validate.middleware');
const authValidation = require('../../modules/validation/schemas/auth.validation'); // Assume que você tem schema para login e register aqui
const userValidation = require('../../modules/validation/schemas/user.validation'); // <-- Pode precisar importar userValidation se o schema register estiver lá


const router = express.Router();

// Rota de Registro (pública)
// POST /api/v1/auth/register
router.post(
    '/register',
     // Use o schema de validação de criação de usuário, se for o mesmo
    validate({ body: userValidation.createUser }), // <-- Usando schema de userValidation
    authController.register // <-- Aponta para o novo controller de registro no authController
);


// Rota de Login (não requer autenticação)
// POST /api/v1/auth/login
router.post('/login', validate({ body: authValidation.login }), authController.login);

// Outras rotas de autenticação (refresh token, reset password, etc.)

module.exports = router;