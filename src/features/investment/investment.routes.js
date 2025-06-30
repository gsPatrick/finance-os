// src/investment/investment.routes.js

const express = require('express');
const investmentController = require('./investment.controller');
const authMiddleware = require('../../modules/auth/auth.middleware'); // Middleware de autenticação
const validate = require('../../modules/validation/validate.middleware'); // Middleware de validação Joi
const investmentValidation = require('../../modules/validation/schemas/investment.validation'); // Esquemas de validação para Investment

const router = express.Router();

// Aplica o middleware de autenticação a todas as rotas definidas ABAIXO
router.use(authMiddleware);

// --- Rotas que requerem autenticação a partir daqui ---

// POST /api/v1/investments
// Cria um novo ativo de investimento para o usuário autenticado.
router.post(
  '/',
  validate({ body: investmentValidation.createInvestment }),
  investmentController.createInvestment
);

// GET /api/v1/investments
// Busca todos os ativos de investimento do usuário autenticado com filtros, paginação e ordenação.
router.get(
  '/',
  validate({ query: investmentValidation.getInvestmentsQuery }),
  investmentController.getInvestments
);

// GET /api/v1/investments/:investmentId
// Busca um ativo de investimento específico do usuario autenticado pelo ID.
router.get(
  '/:investmentId',
  validate({ params: investmentValidation.investmentIdParam }),
  investmentController.getInvestment
);

// PUT /api/v1/investments/:investmentId
// Atualiza um ativo de investimento específico do usuario autenticado pelo ID.
// CUIDADO: Atualizar quantity/avgPrice diretamente pode ser problemático na lógica de negócio.
router.put(
  '/:investmentId',
  validate({ params: investmentValidation.investmentIdParam, body: investmentValidation.updateInvestment }),
  investmentController.updateInvestment
);

// DELETE /api/v1/investments/:investmentId
// Deleta um ativo de investimento específico do usuario autenticado pelo ID.
router.delete(
  '/:investmentId',
  validate({ params: investmentValidation.investmentIdParam }),
  investmentController.deleteInvestment
);

// TODO: Adicionar rotas para compra, venda, ou atualização de preços (se forem endpoints HTTP)
// Ex: POST /api/v1/investments/:investmentId/buy
// Ex: POST /api/v1/investments/:investmentId/sell
// Ex: POST /api/v1/investments/update-prices (pode requerer autorização admin ou ser job interno)

module.exports = router;