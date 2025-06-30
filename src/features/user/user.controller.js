// src/user/user.controller.js

const userService = require('./user.service');
const catchAsync = require('../../modules/helpers/catchAsync.helper');
const ApiError = require('../../modules/errors/apiError');
const { Op } = require('sequelize');

/**
 * Controlador para registrar um novo usuário.
 * Endpoint: POST /api/v1/users/register
 */
const register = catchAsync(async (req, res) => {
  // A validação com Joi já aconteceu no middleware `validate`. `req.body` está limpo.
  const newUser = await userService.createUser(req.body);

  // TODO: Considerar fluxo de login automático após registro e retornar token JWT.
  // const { generateToken } = require('../modules/auth/auth.utils');
  // const token = generateToken(newUser);

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
  // A autorização já foi verificada pelo middleware checkRole('admin') na rota.
  // req.query já foi validado e limpo pelo middleware `validate` (se houver esquema de query)
  const queryParams = req.query;

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

  const users = await userService.getUsers(options);

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
  // `req.params` já foi validado pelo middleware `validate` (userIdParam)
  const userId = parseInt(req.params.userId, 10);
  const authenticatedUser = req.user; // Usuário vindo do authMiddleware

  // Lógica de autorização
  if (authenticatedUser.role !== 'admin' && authenticatedUser.id !== userId) {
    throw new ApiError(403, 'Você não tem permissão para acessar este perfil.');
  }

  const user = await userService.getUserById(userId);
  // O userService já lança um ApiError(404) se não encontrar, que será capturado pelo catchAsync
  // e formatado pelo errorMiddleware.

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
  // `req.params` e `req.body` já foram validados e limpos.
  const userId = parseInt(req.params.userId, 10);
  const authenticatedUser = req.user;
  const updateData = req.body;

  // Lógica de autorização
  if (authenticatedUser.role !== 'admin' && authenticatedUser.id !== userId) {
    throw new ApiError(403, 'Você não tem permissão para atualizar este perfil.');
  }

  // Segurança extra: Um usuário comum não pode se promover a admin.
  // Se a requisição veio de um usuário comum e contém o campo 'role', ele é ignorado.
  if (authenticatedUser.role !== 'admin' && updateData.role) {
      delete updateData.role;
  }

  const updatedUser = await userService.updateUser(userId, updateData);
  // O userService já lança 404 se não encontrar e o errorMiddleware lida com erros de unicidade.

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
  // A autorização ('admin') já foi verificada pelo middleware `checkRole` na rota.
  // `req.params` já foi validado.
  const userId = parseInt(req.params.userId, 10);
  const authenticatedUser = req.user;

  // Regra de negócio extra: um admin não pode deletar a si mesmo.
  if (authenticatedUser.id === userId) {
      throw new ApiError(400, 'Você não pode deletar sua própria conta através desta rota.');
  }

  await userService.deleteUser(userId);
  // O userService já lança 404 se não encontrar.

  res.status(204).json({}); // 204 No Content. A resposta não deve conter corpo.
});


module.exports = {
  register,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
};