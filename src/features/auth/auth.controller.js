// src/auth/auth.controller.js

// Importa a instância do authService a partir do arquivo central de serviços
const { authService } = require('../../services'); // <-- Importação corrigida para vir do index central
const catchAsync = require('../../modules/helpers/catchAsync.helper');

/**
 * Controlador para o login de usuário.
 * Endpoint: POST /api/v1/auth/login
 */
const login = catchAsync(async (req, res) => {
  // O corpo da requisição já foi validado pelo middleware `validate`.
  const { email, password } = req.body;

  // Chama o serviço de autenticação na instância importada
  const { user, token } = await authService.login(email, password);

  // Envia a resposta de sucesso com os dados do usuário e o token
  res.status(200).json({
    status: 'success',
    message: 'Login realizado com sucesso.',
    data: {
      user,
      token,
    },
  });
});

module.exports = {
  login,
};