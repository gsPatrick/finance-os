// src/auth/auth.controller.js (MODIFICADO para incluir registro)

const { authService } = require('../../services');
console.log('[auth.controller.js] Imported authService:', authService); // Veja o que ele imprime
console.log('[auth.controller.js] Imported authService.userService:', authService.userService ? 'defined' : 'undefined'); // Veja se userService está lá
console.log('[auth.controller.js] Imported authService.accountService:', authService.accountService ? 'defined' : 'undefined'); // Veja se accountService está lá

// ... restante do código
const catchAsync = require('../../modules/helpers/catchAsync.helper');

console.log('[auth.controller.js] File loaded');

/**
 * Controlador para o login de usuário.
 * Endpoint: POST /api/v1/auth/login
 */
const login = catchAsync(async (req, res) => {
  console.log('[auth.controller.js] login controller called');
  const { email, password } = req.body;
  console.log('[auth.controller.js] login: Received email:', email, 'password: ***');

  console.log('[auth.controller.js] login: Calling authService.login');
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
    // req.body já foi validado.
    const userData = req.body;
    console.log('[auth.controller.js] register: Received user data:', userData ? { ...userData, password: '***' } : null);

    console.log('[auth.controller.js] register: Calling authService.register');
    const newUser = await authService.register(userData); // Chama o NOVO método register do authService
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
  register, // Exporta o novo controlador de registro
};