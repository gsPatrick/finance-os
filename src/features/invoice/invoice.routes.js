// src/invoice/invoice.routes.js

const express = require('express');
const invoiceController = require('./invoice.controller');
const authMiddleware = require('../../modules/auth/auth.middleware'); // Middleware de autenticação
const validate = require('../../modules/validation/validate.middleware'); // Middleware de validação Joi
const invoiceValidation = require('../../modules/validation/schemas/invoice.validation'); // Esquemas de validação para Invoice

const router = express.Router();

// Aplica o middleware de autenticação a todas as rotas definidas ABAIXO
router.use(authMiddleware);

// --- Rotas que requerem autenticação a partir daqui ---

// POST /api/v1/invoices
// Cria uma nova fatura (manual).
// Incluir apenas se você decidir permitir a criação manual de faturas.
// router.post(
//   '/',
//   validate({ body: invoiceValidation.createInvoice }),
//   invoiceController.createInvoice
// );

// GET /api/v1/invoices
// Busca todas as faturas do usuário autenticado com filtros, paginação e ordenação.
router.get(
  '/',
  validate({ query: invoiceValidation.getInvoicesQuery }),
  invoiceController.getInvoices
);

// GET /api/v1/invoices/:invoiceId
// Busca uma fatura específica do usuário autenticado pelo ID (inclui detalhes da fatura e cartão).
router.get(
  '/:invoiceId',
  validate({ params: invoiceValidation.invoiceIdParam }),
  invoiceController.getInvoice
);

// GET /api/v1/invoices/:invoiceId/transactions
// Busca as transações associadas a uma fatura específica, com filtros e paginação para as transações.
router.get(
   '/:invoiceId/transactions',
   validate({ params: invoiceValidation.invoiceIdParam, query: invoiceValidation.getInvoiceTransactionsQuery }),
   invoiceController.getInvoiceTransactions
);


// PUT /api/v1/invoices/:invoiceId
// Atualiza uma fatura específica do usuário autenticado pelo ID (ex: mudar status para 'paid', atualizar dueDate).
router.put(
  '/:invoiceId',
  validate({ params: invoiceValidation.invoiceIdParam, body: invoiceValidation.updateInvoice }),
  invoiceController.updateInvoice
);

// DELETE /api/v1/invoices/:invoiceId
// Deleta uma fatura específica do usuário autenticado pelo ID.
router.delete(
  '/:invoiceId',
  validate({ params: invoiceValidation.invoiceIdParam }),
  invoiceController.deleteInvoice
);

// NOVO: POST /api/v1/invoices/:invoiceId/pay
// Registra um pagamento em uma fatura.
router.post(
   '/:invoiceId/pay',
   validate({ params: invoiceValidation.invoiceIdParam, body: invoiceValidation.payInvoiceBody }),
   invoiceController.payInvoice
);

// Opcional: POST /api/v1/invoices/run-closing-job
// Endpoint para disparar o job de fechamento de faturas manualmente (útil para testes ou admin).
// router.post(
//     '/run-closing-job',
//     // TODO: Adicionar middleware de autorização (apenas admin)
//     invoiceController.runClosingJob
// );


module.exports = router;