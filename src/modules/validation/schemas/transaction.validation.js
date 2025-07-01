// src/modules/validation/schemas/transaction.validation.js (AJUSTADO: Lógica de installmentCurrent no Joi)

const Joi = require('joi'); // Variável Joi importada

// Esquema base para o ID da transação nos parâmetros
const transactionIdParam = Joi.object({
  transactionId: Joi.number().integer().positive().required(),
});

const getTransactionsQuery = Joi.object({
  // 'type' já espera 'income' ou 'expense' - o frontend agora mapeia para isso.
  type: Joi.string().valid('income', 'expense').optional(),

  // CORRIGIDO: 'status' agora aceita uma string OU um array de strings permitidas
  status: J.alternatives().try(
      Joi.string().valid('pending', 'cleared', 'scheduled'), // Aceita uma única string
      Joi.array().items(Joi.string().valid('pending', 'cleared', 'scheduled')) // Aceita um array de strings
  ).optional(),

  // 'recurring' já espera boolean - o frontend agora mapeia para isso.
  recurring: Joi.boolean().optional(),

  installment: Joi.boolean().optional(),
  accountId: Joi.number().integer().positive().optional(),
  categoryId: Joi.number().integer().positive().optional().allow(null),
  invoiceId: Joi.number().integer().positive().optional().allow(null),

  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),

  search: Joi.string().trim().optional(),

  limit: Joi.number().integer().positive().default(20).optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  sortBy: Joi.string().optional(),
});


// Esquema para criação de transação (Mantido do ajuste anterior)
const createTransaction = Joi.object({
  description: Joi.string().trim().min(1).max(255).required(),
  amount: Joi.number().precision(2).positive().required(),
  type: Joi.string().valid('income', 'expense').required(),
  date: Joi.date().iso().required(),
  accountId: Joi.number().integer().positive().required(),
  categoryId: Joi.number().integer().positive().optional().allow(null),
  invoiceId: Joi.number().integer().positive().optional().allow(null),

  forecast: Joi.boolean().default(false).optional(),

  recurring: Joi.boolean().default(false).optional(),
  installment: Joi.boolean().default(false).optional(),

  frequency: Joi.string().when('recurring', {
      is: true,
      then: Joi.string().trim().min(1).required(),
      otherwise: Joi.optional().allow(null),
  }),
   recurringStartDate: Joi.date().iso().when('recurring', {
       is: true,
       then: Joi.required(),
       otherwise: Joi.optional().allow(null),
   }),

  installmentCount: Joi.number().integer().min(1).when('installment', {
      is: true,
      then: Joi.number().integer().min(1).required(),
      otherwise: Joi.optional().allow(null),
  }),
   installmentUnit: Joi.string().when('installment', {
       is: true,
       then: Joi.string().trim().min(1).required(),
       otherwise: Joi.optional().allow(null),
   }),

   installmentCurrent: Joi.number().integer().min(1).optional().allow(null).when('installment', {
       is: false,
       then: Joi.forbidden(),
       otherwise: Joi.optional().allow(null),
   }),


  observation: Joi.string().trim().allow('', null).optional(),
  // O status inicial é determinado pelo service, não pelo frontend na criação
  // status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),


}).when(Joi.object({ recurring: true, installment: true }).unknown(), {
    then: Joi.forbidden(),
}).options({
    messages: {
        'any.unknown': '{{#label}} is not allowed',
        'object.forbidden': 'Lançamentos recorrentes e parcelados não podem ser ambos verdadeiros.',
    }
});


// Esquema para atualização de transação (Mantido do ajuste anterior)
const updateTransaction = Joi.object({
  description: Joi.string().trim().min(1).max(255).optional(),
  amount: Joi.number().precision(2).positive().optional(),
  type: Joi.string().valid('income', 'expense').optional(),
  date: Joi.date().iso().optional(),
  accountId: Joi.number().integer().positive().optional().allow(null),
  categoryId: Joi.number().integer().positive().optional().allow(null),
  invoiceId: Joi.number().integer().positive().optional().allow(null),

  forecast: Joi.boolean().optional(),

  recurring: Joi.boolean().optional(),
  installment: Joi.boolean().optional(),

  frequency: Joi.string().when('recurring', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  recurringStartDate: Joi.date().iso().when('recurring', { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  installmentCount: Joi.number().integer().min(1).when('installment', { is: true, then: Joi.number().integer().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  installmentUnit: Joi.string().when('installment', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  installmentCurrent: Joi.number().integer().min(1).optional().allow(null).when('installment', {
      is: false,
      then: Joi.forbidden(),
      otherwise: Joi.optional().allow(null),
  }),

  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(), // Permitir atualizar status manualmente

}).when(Joi.object({ recurring: true, installment: true }).unknown(), {
    then: Joi.forbidden(),
}).options({
    messages: {
        'any.unknown': '{{#label}} is not allowed',
        'object.forbidden': 'Lançamentos recorrentes e parcelados não podem ser ambos verdadeiros (update).',
    }
}).min(1);


// Exporta todos os esquemas relevantes
module.exports = {
  transactionIdParam,
  getTransactionsQuery,
  createTransaction,
  updateTransaction,
};