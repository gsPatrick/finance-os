// src/account/account.controller.js

const { accountService } = require('../../services');
const catchAsync = require('../../modules/helpers/catchAsync.helper');
const ApiError = require('../../modules/errors/apiError'); // Para lançar erros específicos se necessário
const { Op } = require('sequelize'); // Para construir filtros Sequelize

/**
 * Controlador para criar uma nova conta/cartão.
 * Endpoint: POST /api/v1/accounts
 * Requer autenticação (req.user deve estar disponível).
 */
const createAccount = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.body já foi validado e limpo pelo middleware `validate` (createAccount schema)
  const accountData = req.body;

  const newAccount = await accountService.createAccount(userId, accountData);

  res.status(201).json({ // 201 Created
    status: 'success',
    message: 'Conta ou cartão criado com sucesso.',
    data: newAccount,
  });
});

/**
 * Controlador para buscar contas do usuário.
 * Endpoint: GET /api/v1/accounts
 * Requer autenticação.
 */
const getAccounts = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.query já foi validado e limpo pelo middleware `validate` (getAccountsQuery schema)
  const queryParams = req.query;

  // Constrói as opções para o Service a partir dos query params
  const options = {
    limit: queryParams.limit,
    offset: (queryParams.page - 1) * queryParams.limit,
    where: {
        // Filtros específicos mapeados de query params para Sequelize where
        ...(queryParams.type && { type: queryParams.type }), // Adiciona filtro por tipo se presente

        // Exemplo de filtro de busca por texto (em múltiplos campos)
        ...(queryParams.search && {
            [Op.or]: [
                { name: { [Op.iLike]: `%${queryParams.search}%` } },
                // Adicione outros campos pesquisáveis para cartões, se aplicável
                ...(queryParams.type !== 'cash' && { brand: { [Op.iLike]: `%${queryParams.search}%` } }),
                ...(queryParams.type !== 'cash' && { finalDigits: { [Op.iLike]: `%${queryParams.search}%` } }),
            ]
        }),
        // ... outros filtros (ex: por status, range de saldo, etc.)
    },
    // Exemplo de ordenação
     order: queryParams.sortBy ? [[queryParams.sortBy.split(':')[0], queryParams.sortBy.split(':')[1] || 'ASC']] : [['name', 'ASC']],
    // Opcional: attributes, include, etc.
  };

  const accounts = await accountService.getAccounts(userId, options);

  res.status(200).json({
    status: 'success',
    results: accounts.rows.length,
    total: accounts.count,
    data: accounts.rows,
  });
});

/**
 * Controlador para buscar uma conta específica pelo ID.
 * Endpoint: GET /api/v1/accounts/:accountId
 * Requer autenticação.
 */
const getAccount = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado pelo middleware `validate` (accountIdParam schema)
  const accountId = parseInt(req.params.accountId, 10);

   // TODO: Adicionar opções de include se necessário (ex: incluir as últimas transações)
   // const options = {
   //    include: [{
   //      model: db.Transaction,
   //      as: 'transactions',
   //      limit: 10,
   //      order: [['date', 'DESC']],
   //    }]
   // };

  const account = await accountService.getAccountById(userId, accountId);
  // O service já lança 404 (ou 403 dependendo da implementação), capturado pelo catchAsync.

  res.status(200).json({
    status: 'success',
    data: account,
  });
});

/**
 * Controlador para atualizar uma conta específica pelo ID.
 * Endpoint: PUT /api/v1/accounts/:accountId
 * Requer autenticação.
 */
const updateAccount = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params e req.body já foram validados e limpos pelo middleware `validate`
  const accountId = parseInt(req.params.accountId, 10);
  const updateData = req.body;

  const updatedAccount = await accountService.updateAccount(userId, accountId, updateData);
  // O service já lança 404 (ou 403), capturado pelo catchAsync.
  // Erros de validação do Sequelize também são capturados.

  res.status(200).json({ // 200 OK
    status: 'success',
    message: 'Conta ou cartão atualizado com sucesso.',
    data: updatedAccount,
  });
});

/**
 * Controlador para deletar uma conta específica pelo ID.
 * Endpoint: DELETE /api/v1/accounts/:accountId
 * Requer autenticação.
 */
const deleteAccount = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado.
  const accountId = parseInt(req.params.accountId, 10);

  await accountService.deleteAccount(userId, accountId);
  // O service já lança 404 (ou 403), capturado pelo catchAsync.

  res.status(204).json({ // 204 No Content
    // status: 'success', // Não inclua status em 204
    // data: null,        // Não inclua corpo em 204
  });
});

module.exports = {
  createAccount,
  getAccounts,
  getAccount,
  updateAccount,
  deleteAccount,
};