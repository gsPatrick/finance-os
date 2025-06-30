// src/user/user.controller.js

// Importa a instância do userService a partir do arquivo central de serviços
const { userService } = require('../../services'); // <--- Importação corrigida para vir do index central

// Importa o helper catchAsync
const catchAsync = require('../../modules/helpers/catchAsync.helper'); // <--- A importação da catchAsync DEVE estar aqui

// Importa outros módulos necessários
const ApiError = require('../../modules/errors/apiError');
const { Op } = require('sequelize');

console.log('[user.controller.js] File loaded.');


/**
 * Controlador para registrar um novo usuário.
 * Endpoint: POST /api/v1/users/register
 */
const register = catchAsync(async (req, res) => {
  console.log('[user.controller.js] register controller called');
  // A validação com Joi já aconteceu no middleware `validate`. `req.body` está limpo.
  // Chama o serviço de usuário na instância importada
  console.log('[user.controller.js] register: Calling userService.createUser with body:', req.body);
  const newUser = await userService.createUser(req.body); // <--- Chama o método na instância do serviço
  console.log('[user.controller.js] register: userService.createUser returned:', newUser ? 'user object' : 'null/undefined');


  // TODO: Considerar fluxo de login automático após registro e retornar token JWT.
  // const { generateToken } = require('../modules/auth/auth.utils');
  // const token = generateToken(newUser);

  console.log('[user.controller.js] register: Sending 201 response');
  res.status(201).json({ // 201 Created
    status: 'success',
    message: 'Usuário registrado com sucesso.',
    data: newUser, // Retorna os dados do usuário (sem senha)
    // token: token, // Opcional: retornar token
  });
});

/**
 * Controlador para buscar todos os usuários.
 * Endpoint: GET /api/v1/users
 * Requer autenticação e autorização de 'admin' (verificada na rota com `checkRole`).
 */
const getUsers = catchAsync(async (req, res) => {
  console.log('[user.controller.js] getUsers controller called');
  // A autorização já foi verificada pelo middleware checkRole('admin') na rota.
  // req.query já foi validado e limpo pelo middleware `validate` (se houver esquema de query)
  const queryParams = req.query;
  console.log('[user.controller.js] getUsers: Received query params:', queryParams);

  // Constrói as opções para o Service a partir dos query params
  // Exemplo robusto de construção de options a partir de query:
  const { page = 1, limit = 10, sortBy, search, ...filterParams } = queryParams;
  const where = { ...filterParams }; // Começa com filtros diretos (ex: role=user)
  if (search) {
      where[Op.or] = [
          { username: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
      ];
  }
  const options = {
     where: where,
     limit: parseInt(limit, 10),
     offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
     order: sortBy ? [[sortBy.split(':')[0], sortBy.split(':')[1] || 'ASC']] : [['createdAt', 'DESC']]
  };
  console.log('[user.controller.js] getUsers: Built service options:', options);

  // Chama o serviço de usuário na instância importada
  console.log('[user.controller.js] getUsers: Calling userService.getUsers with options:', options);
  const users = await userService.getUsers(options);
  console.log('[user.controller.js] getUsers: userService.getUsers returned:', users ? users.count + ' users' : 'null/undefined');


  console.log('[user.controller.js] getUsers: Sending 200 response');
  res.status(200).json({
    status: 'success',
    results: users.rows.length, // Quantidade de resultados nesta página
    total: users.count, // Total geral (para paginação)
    data: users.rows,
  });
});

/**
 * Controlador para buscar um único usuário pelo ID.
 * Endpoint: GET /api/v1/users/:userId
 * Autorização: Permite se o usuário autenticado for o próprio usuário solicitado, ou se for um admin.
 */
const getUser = catchAsync(async (req, res) => {
  console.log('[user.controller.js] getUser controller called');
  // `req.params` já foi validado pelo middleware `validate` (userIdParam)
  const userId = parseInt(req.params.userId, 10);
  const authenticatedUser = req.user; // Usuário vindo do authMiddleware
  console.log('[user.controller.js] getUser: userId from params:', userId);
  console.log('[user.controller.js] getUser: Authenticated user:', authenticatedUser ? authenticatedUser.id : 'none');


  // Lógica de autorização
  if (authenticatedUser.role !== 'admin' && authenticatedUser.id !== userId) {
    console.log('[user.controller.js] getUser: Authorization failed - not admin and not self');
    throw new ApiError(403, 'Você não tem permissão para acessar este perfil.');
  }
  console.log('[user.controller.js] getUser: Authorization granted');


  // Chama o serviço de usuário na instância importada
  console.log('[user.controller.js] getUser: Calling userService.getUserById with id:', userId);
  const user = await userService.getUserById(userId);
  console.log('[user.controller.js] getUser: userService.getUserById returned:', user ? 'user object' : 'null/undefined (ApiError expected if not found)');
  // O userService já lança um ApiError(404) se não encontrar, que será capturado pelo catchAsync
  // e formatado pelo errorMiddleware.

  console.log('[user.controller.js] getUser: Sending 200 response');
  res.status(200).json({
    status: 'success',
    data: user,
  });
});

/**
 * Controlador para atualizar um usuário.
 * Endpoint: PUT /api/v1/users/:userId
 * Autorização: Permite se o usuário autenticado for o próprio usuário solicitado, ou se for um admin.
 */
const updateUser = catchAsync(async (req, res) => {
  console.log('[user.controller.js] updateUser controller called');
  // `req.params` e `req.body` já foram validados e limpos.
  const userId = parseInt(req.params.userId, 10);
  const authenticatedUser = req.user;
  let updateData = req.body; // Use let because we might modify it
  console.log('[user.controller.js] updateUser: userId from params:', userId);
  console.log('[user.controller.js] updateUser: Authenticated user:', authenticatedUser ? authenticatedUser.id : 'none');
  console.log('[user.controller.js] updateUser: Received update data:', updateData);


  // Lógica de autorização
  if (authenticatedUser.role !== 'admin' && authenticatedUser.id !== userId) {
    console.log('[user.controller.js] updateUser: Authorization failed - not admin and not self');
    throw new ApiError(403, 'Você não tem permissão para atualizar este perfil.');
  }
   console.log('[user.controller.js] updateUser: Authorization granted');


  // Segurança extra: Um usuário comum não pode se promover a admin.
  // Se a requisição veio de um usuário comum e contém o campo 'role', ele é ignorado.
  if (authenticatedUser.role !== 'admin' && updateData.role) {
      console.log('[user.controller.js] updateUser: Removing role update for non-admin user');
      delete updateData.role;
  }
  console.log('[user.controller.js] updateUser: Final update data after authorization check:', updateData);


  // Chama o serviço de usuário na instância importada
  console.log('[user.controller.js] updateUser: Calling userService.updateUser with id', userId, 'and data:', updateData);
  const updatedUser = await userService.updateUser(userId, updateData);
  console.log('[user.controller.js] updateUser: userService.updateUser returned:', updatedUser ? 'user object' : 'null/undefined (ApiError expected if not found)');
  // O userService já lança 404 se não encontrar e o errorMiddleware lida com erros de unicidade.

  console.log('[user.controller.js] updateUser: Sending 200 response');
  res.status(200).json({ // 200 OK
    status: 'success',
    message: 'Usuário atualizado com sucesso.',
    data: updatedUser,
  });
});

/**
 * Controlador para deletar um usuário.
 * Endpoint: DELETE /api/v1/users/:userId
 * Autorização: Apenas admins podem deletar (verificado na rota com `checkRole`).
 */
const deleteUser = catchAsync(async (req, res) => {
  console.log('[user.controller.js] deleteUser controller called');
  // A autorização ('admin') já foi verificada pelo middleware `checkRole` na rota.
  // `req.params` já foi validado.
  const userId = parseInt(req.params.userId, 10);
  const authenticatedUser = req.user;
  console.log('[user.controller.js] deleteUser: userId from params:', userId);
  console.log('[user.controller.js] deleteUser: Authenticated user:', authenticatedUser ? authenticatedUser.id : 'none');


  // Regra de negócio extra: um admin não pode deletar a si mesmo.
  if (authenticatedUser.id === userId) {
      console.log('[user.controller.js] deleteUser: Blocking self-deletion attempt by admin');
      throw new ApiError(400, 'Você não pode deletar sua própria conta através desta rota.');
  }
   console.log('[user.controller.js] deleteUser: Self-deletion check passed');


  // Chama o serviço de usuário na instância importada
  console.log('[user.controller.js] deleteUser: Calling userService.deleteUser with id:', userId);
  await userService.deleteUser(userId);
  console.log('[user.controller.js] deleteUser: userService.deleteUser finished (ApiError expected if not found)');
  // O userService já lança 404 se não encontrar.

  console.log('[user.controller.js] deleteUser: Sending 204 response');
  res.status(204).json({}); // 204 No Content. A resposta não deve conter corpo.
});


console.log('[user.controller.js] Exporting controllers');
module.exports = {
  register,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};