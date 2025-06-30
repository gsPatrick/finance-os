// src/transaction/transaction.routes.js

const express = require('express');
const transactionController = require('./transaction.controller');
const authMiddleware = require('../../modules/auth/auth.middleware'); // Middleware de autenticação
const validate = require('../../modules/validation/validate.middleware'); // Middleware de validação Joi
const transactionValidation = require('../../modules/validation/schemas/transaction.validation'); // Esquemas de validação para Transaction

const router = express.Router();

// Aplica o middleware de autenticação a todas as rotas definidas ABAIXO
router.use(authMiddleware);

// --- Rotas que requerem autenticação a partir daqui ---

// POST /api/v1/transactions
// Cria uma nova transação (normal, recorrente ou parcelada - primeira ocorrência).
router.post(
  '/',
  validate({ body: transactionValidation.createTransaction }),
  transactionController.createTransaction
);

// GET /api/v1/transactions
// Busca todas as transações do usuário autenticado com filtros, paginação e ordenação.
router.get(
  '/',
  validate({ query: transactionValidation.getTransactionsQuery }),
  transactionController.getTransactions
);

// GET /api/v1/transactions/:transactionId
// Busca uma transação específica do usuário autenticado pelo ID.
router.get(
  '/:transactionId',
  validate({ params: transactionValidation.transactionIdParam }),
  transactionController.getTransaction
);

// PUT /api/v1/transactions/:transactionId
// Atualiza uma transação específica do usuário autenticado pelo ID.
router.put(
  '/:transactionId',
  validate({ params: transactionValidation.transactionIdParam, body: transactionValidation.updateTransaction }),
  transactionController.updateTransaction
);

// DELETE /api/v1/transactions/:transactionId
// Deleta uma transação específica do usuário autenticado pelo ID.
router.delete(
  '/:transactionId',
  validate({ params: transactionValidation.transactionIdParam }),
  transactionController.deleteTransaction
);

// TODO: Adicionar rotas para efetivação manual ou agendamento, se forem endpoints HTTP
// Ex: POST /api/v1/transactions/:transactionId/clear
// router.post('/:transactionId/clear', authMiddleware, validate({ params: transactionValidation.transactionIdParam }), transactionController.clearTransaction);

module.exports = router;