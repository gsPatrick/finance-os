// src/user/user.routes.js

const express = require('express');
const userController = require('./user.controller');
const authMiddleware = require('../../modules/auth/auth.middleware');
const checkRole = require('../../modules/auth/checkRole.middleware'); // Importa o novo middleware
const validate = require('../../modules/validation/validate.middleware');
const userValidation = require('../../modules/validation/schemas/user.validation');

const router = express.Router();

// Rota de Registro (pública)
router.post('/register', validate({ body: userValidation.createUser }), userController.register);

// Aplica autenticação a todas as rotas abaixo
router.use(authMiddleware);

// GET /api/v1/users
// Apenas admins podem listar todos os usuários.
router.get('/', checkRole('admin'), userController.getUsers);

// GET /api/v1/users/:userId
// O usuário pode ver o seu próprio perfil, ou um admin pode ver qualquer perfil.
// A lógica de "próprio perfil" será feita no controller.
// O authMiddleware já garante que req.user existe.
router.get('/:userId', validate({ params: userValidation.userIdParam }), userController.getUser);

// PUT /api/v1/users/:userId
// O usuário pode atualizar o seu próprio perfil, ou um admin pode atualizar qualquer perfil.
// A lógica de "próprio perfil" será feita no controller.
router.put('/:userId', validate({ params: userValidation.userIdParam, body: userValidation.updateUser }), userController.updateUser);

// DELETE /api/v1/users/:userId
// Apenas admins podem deletar usuários.
router.delete('/:userId', validate({ params: userValidation.userIdParam }), checkRole('admin'), userController.deleteUser);

module.exports = router;