// src/auth/auth.controller.js (Versão com importação alternativa para teste)

// Importa o objeto completo de serviços em vez de desestruturar a instância no topo
// const { authService } = require('../../services'); // <--- Linha antiga
const services = require('../../services'); // <--- IMPORTA O OBJETO COMPLETO DE SERVIÇOS AQUI

const catchAsync = require('../../modules/helpers/catchAsync.helper');
const ApiError = require('../../modules/errors/apiError');
const { Op } = require('sequelize'); // Se este controller precisar de Op

console.log('[auth.controller.js] File loaded.');


/**
 * Controlador para o login de usuário.
 * Endpoint: POST /api/v1/auth/login
 */
const login = catchAsync(async (req, res) => {
  console.log('[auth.controller.js] login controller called');
  // ACESSE A INSTÂNCIA A PARTIR DO OBJETO 'services' IMPORTADO
  const { authService } = services; // <--- Acessa a instância AQUI DENTRO do método

  const { email, password } = req.body;
  console.log('[auth.controller.js] login: Received email:', email, 'password: ***');

  console.log('[auth.controller.js] login: Calling authService.login');
  // Use a instância acessada
  const { user, token } = await authService.login(email, password);

  console.log('[auth.controller.js] login: authService.login returned user and token');

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

/**
 * NOVO: Controlador para registrar um novo usuário e criar conta padrão.
 * Endpoint: POST /api/v1/auth/register
 */
const register = catchAsync(async (req, res) => {
    console.log('[auth.controller.js] register controller called');
    // ACESSE A INSTÂNCIA A PARTIR DO OBJETO 'services' IMPORTADO
    const { authService } = services; // <--- Acessa a instância AQUI DENTRO do método

    const userData = req.body;
    console.log('[auth.controller.js] register: Received user data:', userData ? { ...userData, password: '***' } : null);

    // Adicione logs para verificar as dependências ANTES de chamar o método
    console.log('[auth.controller.js] register: Checking authService dependencies before call...');
    console.log('[auth.controller.js] register: authService.userService is:', authService && authService.userService ? 'defined' : 'undefined');
    console.log('[auth.controller.js] register: authService.accountService is:', authService && authService.accountService ? 'defined' : 'undefined');


    console.log('[auth.controller.js] register: Calling authService.register');
    // Use a instância acessada
    const newUser = await authService.register(userData);

    console.log('[auth.controller.js] register: authService.register returned new user:', newUser ? newUser.id : 'null/undefined');

    console.log('[auth.controller.js] register: Sending 201 response');
    res.status(201).json({ // 201 Created
        status: 'success',
        message: 'Usuário registrado e conta padrão criada com sucesso.',
        data: newUser, // Retorna os dados do usuário (sem senha)
    });
});


console.log('[auth.controller.js] Exporting controllers');
module.exports = {
  login,
  register,
};