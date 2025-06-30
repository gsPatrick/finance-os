// src/modules/validation/schemas/invoice.validation.js

const Joi = require('joi').extend(require('@joi/date'));
Joi.date().format('YYYY-MM-DD').iso();

// Esquema base para o ID da fatura nos parâmetros (já existia)
const invoiceIdParam = Joi.object({
  invoiceId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de faturas (já existia)
const getInvoicesQuery = Joi.object({
  accountId: Joi.number().integer().positive().optional(), // Filtrar por cartão de crédito
  status: Joi.string().valid('open', 'closed', 'paid').optional(), // Filtrar por status da fatura
  paymentStatus: Joi.string().valid('unpaid', 'partial', 'paid').optional(), // Filtrar por status de pagamento

  startDate: Joi.date().iso().optional(), // Data de início (para filtro de dueDate)
  endDate: Joi.date().iso().optional(), // Data de fim (para filtro de dueDate)

  year: Joi.number().integer().min(1900).optional(),
  month: Joi.number().integer().min(1).max(12).optional(),

  limit: Joi.number().integer().positive().default(10).optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  sortBy: Joi.string().optional(),
});


// Esquema para criação de fatura (manual, se aplicável - já existia)
const createInvoice = Joi.object({
  accountId: Joi.number().integer().positive().required(),
  month: Joi.number().integer().min(1).max(12).required(),
  year: Joi.number().integer().min(1900).required(),
  dueDate: Joi.date().iso().required(),
  closingDate: Joi.date().iso().required(),
  status: Joi.string().valid('open', 'closed', 'paid').default('open').optional(),
  total: Joi.number().precision(2).min(0).default(0.00).optional(),
  // Campos de pagamento não devem ser setados na criação manual geralmente
  // paidAmount: Joi.forbidden(),
  // paymentStatus: Joi.forbidden(),
});

// Esquema para atualização de fatura (já existia, mas refinado)
const updateInvoice = Joi.object({
  status: Joi.string().valid('open', 'closed', 'paid').optional(),
  dueDate: Joi.date().iso().optional(),
  paidAmount: Joi.number().precision(2).min(0).optional(), // Permitir atualizar o valor pago manualmente

  // Não permitir atualizar paymentStatus diretamente, é calculado pelo service
  // paymentStatus: Joi.forbidden(),

  // Não permitir atualizar campos proibidos como accountId, month, year, total
  accountId: Joi.forbidden(),
  month: Joi.forbidden(),
  year: Joi.forbidden(),
  total: Joi.forbidden(),

}).min(1); // Garante que pelo menos um campo atualizável esteja presente


// Esquema para query params ao buscar transações de uma fatura (já existia)
const getInvoiceTransactionsQuery = Joi.object({
     type: Joi.string().valid('income', 'expense').optional(),
     status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),
     search: Joi.string().trim().optional(),
     limit: Joi.number().integer().positive().default(20).optional(),
     page: Joi.number().integer().positive().default(1).optional(),
     sortBy: Joi.string().optional(),
});

// NOVO: Esquema para o corpo da requisição de pagamento de fatura
const payInvoiceBody = Joi.object({
    amount: Joi.number().precision(2).positive().required(), // Valor pago
    accountId: Joi.number().integer().positive().required(), // ID da conta cash pagadora
    date: Joi.date().iso().optional(), // Data do pagamento (opcional, padrão hoje)
});


module.exports = {
  invoiceIdParam,
  getInvoicesQuery,
  createInvoice,
  updateInvoice,
  getInvoiceTransactionsQuery,
  payInvoiceBody, // Exporta o novo esquema
};