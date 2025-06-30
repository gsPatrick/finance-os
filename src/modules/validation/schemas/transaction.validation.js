// src/modules/validation/schemas/transaction.validation.js (CORRIGIDO: Adiciona forecast e ajusta regra de exclusividade)

const Joi = require('joi');

// Esquema base para o ID da transação nos parâmetros
const transactionIdParam = Joi.object({
  transactionId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de transações (mantido)
const getTransactionsQuery = Joi.object({
  type: Joi.string().valid('income', 'expense').optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),
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


// Esquema para criação de transação
const createTransaction = Joi.object({
  description: Joi.string().trim().min(1).max(255).required(),
  amount: Joi.number().precision(2).positive().required(),
  type: Joi.string().valid('income', 'expense').required(),
  date: Joi.date().iso().required(),
  accountId: Joi.number().integer().positive().required(),
  categoryId: Joi.number().integer().positive().optional().allow(null),
  invoiceId: Joi.number().integer().positive().optional().allow(null),

  // --- ADICIONADO forecast E AJUSTADA A LÓGICA DE EXCLUSIVIDADE ---

  // Adiciona o campo 'forecast' que vem do frontend
  forecast: Joi.boolean().default(false).optional(), // Permite true/false, default é false se ausente


  // Campos de recorrência/parcelamento com regras de exclusividade mais explícitas
  recurring: Joi.boolean().default(false).optional(),
  frequency: Joi.string().when('recurring', { // Frequência é necessária apenas se recurring for true
      is: true,
      then: Joi.string().trim().min(1).required(),
      otherwise: Joi.optional().allow(null), // Opcional/Null se não for recorrente
  }),
   recurringStartDate: Joi.date().iso().when('recurring', { // Data de início é necessária apenas se recurring for true
       is: true,
       then: Joi.required(),
       otherwise: Joi.optional().allow(null),
   }),

  installment: Joi.boolean().default(false).optional(),
  installmentCount: Joi.number().integer().min(1).when('installment', { // installmentCount necessário apenas se installment for true
      is: true,
      then: Joi.number().integer().min(1).required(),
      otherwise: Joi.optional().allow(null),
  }),
   installmentCurrent: Joi.number().integer().min(1).optional().allow(null).default(1), // Parcela atual (sempre opcional/default, não depende de installment ser true)
   installmentUnit: Joi.string().when('installment', { // installmentUnit necessário apenas se installment for true
       is: true,
       then: Joi.string().trim().min(1).required(),
       otherwise: Joi.optional().allow(null),
   }),

   // Regra de exclusividade: Se 'recurring' for TRUE, 'installment' DEVE ser FALSE.
   // E se 'installment' for TRUE, 'recurring' DEVE ser FALSE.
   // Isso lida corretamente com os casos onde um campo é TRUE e o outro está ausente (Joi default para false)
   // ou onde ambos estão presentes como FALSE.
    status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),
    observation: Joi.string().trim().allow('', null).optional(),

}).when(Joi.object({ recurring: true }).unknown(), { // Se recurring é true...
    then: Joi.object({
        installment: Joi.valid(false).required(), // ...installment deve ser false e requerido (para garantir que não está ausente)
    }).messages({
        'any.required': 'O campo "installment" deve ser explicitamente false quando "recurring" é true.',
        'any.only': 'O campo "installment" deve ser false quando "recurring" é true.',
    }),
}).when(Joi.object({ installment: true }).unknown(), { // Se installment é true...
    then: Joi.object({
        recurring: Joi.valid(false).required(), // ...recurring deve ser false e requerido
    }).messages({
        'any.required': 'O campo "recurring" deve ser explicitamente false quando "installment" é true.',
        'any.only': 'O campo "recurring" deve ser false quando "installment" é true.',
    }),
}); // Removido .nand() aqui, as regras 'when' já impõem a exclusividade.


// Esquema para atualização de transação (ajustado para incluir forecast e a nova regra)
const updateTransaction = Joi.object({
  description: Joi.string().trim().min(1).max(255).optional(),
  amount: Joi.number().precision(2).positive().optional(),
  type: Joi.string().valid('income', 'expense').optional(),
  date: Joi.date().iso().optional(),
  accountId: Joi.number().integer().positive().optional().allow(null),
  categoryId: Joi.number().integer().positive().optional().allow(null),
  invoiceId: Joi.number().integer().positive().optional().allow(null),

  // Adicionado forecast à atualização
  forecast: Joi.boolean().optional(),

  recurring: Joi.boolean().optional(),
  frequency: Joi.string().when('recurring', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  recurringStartDate: Joi.date().iso().when('recurring', { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  installment: Joi.boolean().optional(),
  installmentCount: Joi.number().integer().min(1).when('installment', { is: true, then: Joi.number().integer().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  installmentCurrent: Joi.number().integer().min(1).optional().allow(null),
  installmentUnit: Joi.string().when('installment', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),

   // Aplica as mesmas regras de exclusividade 'when' para atualização
}).when(Joi.object({ recurring: true }).unknown(), {
    then: Joi.object({
        installment: Joi.valid(false).required(),
    }).messages({
        'any.required': 'O campo "installment" deve ser explicitamente false quando "recurring" é true.',
        'any.only': 'O campo "installment" deve ser false quando "recurring" é true.',
    }),
}).when(Joi.object({ installment: true }).unknown(), {
    then: Joi.object({
        recurring: Joi.valid(false).required(),
    }).messages({
        'any.required': 'O campo "recurring" deve ser explicitamente false quando "installment" é true.',
        'any.only': 'O campo "recurring" deve ser false quando "installment" é true.',
    }),
}).min(1); // Garante que pelo menos um campo esteja presente para atualização


module.exports = {
  transactionIdParam,
  getTransactionsQuery,
  createTransaction,
  updateTransaction,
};