// src/account/account.routes.js

const express = require('express');
const accountController = require('./account.controller');
const authMiddleware = require('../../modules/auth/auth.middleware'); // Middleware de autenticação
const validate = require('../../modules/validation/validate.middleware'); // Middleware de validação Joi
const accountValidation = require('../../modules/validation/schemas/account.validation'); // Esquemas de validação para Account

const router = express.Router();

// Aplica o middleware de autenticação a todas as rotas definidas ABAIXO
// Todas as operações em contas requerem que o usuário esteja logado.
router.use(authMiddleware);

// --- Rotas que requerem autenticação a partir daqui ---

// POST /api/v1/accounts
// Cria uma nova conta ou cartão.
router.post(
  '/',
  validate({ body: accountValidation.createAccount }),
  accountController.createAccount
);

// GET /api/v1/accounts
// Busca todas as contas do usuário autenticado.
// Aplica validação para query parameters (filtros, paginação, ordenação).
router.get(
  '/',
  validate({ query: accountValidation.getAccountsQuery }),
  accountController.getAccounts
);

// GET /api/v1/accounts/:accountId
// Busca uma conta específica do usuário autenticado pelo ID.
router.get(
  '/:accountId',
  validate({ params: accountValidation.accountIdParam }),
  accountController.getAccount
);

// PUT /api/v1/accounts/:accountId
// Atualiza uma conta específica do usuário autenticado pelo ID.
router.put(
  '/:accountId',
  validate({ params: accountValidation.accountIdParam, body: accountValidation.updateAccount }),
  accountController.updateAccount
);

// DELETE /api/v1/accounts/:accountId
// Deleta uma conta específica do usuário autenticado pelo ID.
router.delete(
  '/:accountId',
  validate({ params: accountValidation.accountIdParam }),
  accountController.deleteAccount
);

module.exports = router;