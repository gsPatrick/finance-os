// src/auth/auth.controller.js

// Importa a instância do authService a partir do arquivo central de serviços
const { authService } = require('../../services'); // <-- Importação corrigida para vir do index central
const catchAsync = require('../../modules/helpers/catchAsync.helper');

console.log('[auth.controller.js] File loaded');

/**
 * Controlador para o login de usuário.
 * Endpoint: POST /api/v1/auth/login
 */
const login = catchAsync(async (req, res) => {
  console.log('[auth.controller.js] login controller called');
  // O corpo da requisição já foi validado pelo middleware `validate`.
  const { email, password } = req.body;
  console.log('[auth.controller.js] login: Received email:', email, 'password: ***');

  // Chama o serviço de autenticação na instância importada
  console.log('[auth.controller.js] login: Calling authService.login');
  const { user, token } = await authService.login(email, password);
  console.log('[auth.controller.js] login: authService.login returned user and token');


  // Envia a resposta de sucesso com os dados do usuário e o token
  console.log('[auth.controller.js] login: Sending 200 response');
  res.status(200).json({
    status: 'success',
    message: 'Login realizado com sucesso.',
    data: {
      user,
      token,
    },
  });
});

console.log('[auth.controller.js] Exporting controllers');
module.exports = {
  login,
};