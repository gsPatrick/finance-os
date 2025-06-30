// src/modules/validation/schemas/transaction.validation.js (COMPLETO com forecast e regras when)

const Joi = require('joi');

// Esquema base para o ID da transação nos parâmetros
const transactionIdParam = Joi.object({
  transactionId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de transações (mantido)
const getTransactionsQuery = Joi.object({
  type: Joi.string().valid('income', 'expense').optional(), // Filtrar por tipo
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(), // Filtrar por status
  recurring: Joi.boolean().optional(), // Filtrar por recorrência (true/false)
  installment: Joi.boolean().optional(), // Filtrar por parcelamento (true/false)
  accountId: Joi.number().integer().positive().optional(), // Filtrar por conta/cartão
  categoryId: Joi.number().integer().positive().optional().allow(null), // Filtrar por categoria
  invoiceId: Joi.number().integer().positive().optional().allow(null), // Filtrar por fatura (para despesas de cartão)

  // Filtrar por range de datas
  startDate: Joi.date().iso().optional(), // Data de início (formato ISO 8601: YYYY-MM-DD)
  endDate: Joi.date().iso().optional(), // Data de fim

  search: Joi.string().trim().optional(), // Buscar por descrição, observação, categoria/conta nome? (implementação no service)

  // Parâmetros de paginação e ordenação genéricos
  limit: Joi.number().integer().positive().default(20).optional(), // Ajuste o default se necessário
  page: Joi.number().integer().positive().default(1).optional(),
  sortBy: Joi.string().optional(), // Formato esperado: 'campo:direcao' (ex: 'date:desc', 'amount:asc')
});


// Esquema para criação de transação
const createTransaction = Joi.object({
  description: Joi.string().trim().min(1).max(255).required(),
  amount: Joi.number().precision(2).positive().required(), // Valor positivo, o tipo (income/expense) define o sinal
  type: Joi.string().valid('income', 'expense').required(),
  date: Joi.date().iso().required(), // Data da transação (ocorrida ou agendada)
  accountId: Joi.number().integer().positive().required(), // Conta ou cartão associado
  categoryId: Joi.number().integer().positive().optional().allow(null), // Categoria (opcional)
  invoiceId: Joi.number().integer().positive().optional().allow(null), // Fatura (opcional, apenas para despesas de cartão)

  // Adicionado o campo 'forecast' que vem do frontend
  forecast: Joi.boolean().default(false).optional(), // Permite true/false, default é false se ausente


  // Campos de recorrência/parcelamento (condicionais)
  // São opcionais no payload de entrada, mas Joi lhes dará o default(false) se não enviados.
  recurring: Joi.boolean().default(false).optional(),
  installment: Joi.boolean().default(false).optional(),

  // frequency e recurringStartDate são necessários apenas se 'recurring' for true
  frequency: Joi.string().when('recurring', {
      is: true,
      then: Joi.string().trim().min(1).required(),
      otherwise: Joi.optional().allow(null), // Opcional/Null se não for recorrente
  }),
   recurringStartDate: Joi.date().iso().when('recurring', {
       is: true,
       then: Joi.required(),
       otherwise: Joi.optional().allow(null),
   }),

   // installmentCount e installmentUnit são necessários apenas se 'installment' for true
  installmentCount: Joi.number().integer().min(1).when('installment', {
      is: true,
      then: Joi.number().integer().min(1).required(),
      otherwise: Joi.optional().allow(null),
  }),
   installmentCurrent: Joi.number().integer().min(1).optional().allow(null).default(1), // Parcela atual (sempre opcional/default)
   installmentUnit: Joi.string().when('installment', {
       is: true,
       then: Joi.string().trim().min(1).required(),
       otherwise: Joi.optional().allow(null),
   }),

  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),


  // --- Regras de exclusividade usando when ---
  // Regra: Se 'recurring' for TRUE, 'installment' DEVE ser FALSE e estar presente.
  // A condição 'is: true' só é satisfeita se o campo 'recurring' estiver presente E for true.
}).when('recurring', {
    is: true, // Condição: O campo 'recurring' existe e é true
    then: J.object({
        installment: Joi.valid(false).required() // Então, 'installment' deve ser explicitamente 'false' e requerido.
    }).messages({ // Mensagens personalizadas para este caso
        'any.required': 'O campo "installment" deve ser explicitamente false quando "recurring" é true.',
        'any.only': 'O campo "installment" deve ser false quando "recurring" é true.',
    }),
})
// Regra: Se 'installment' for TRUE, 'recurring' DEVE ser FALSE e estar presente.
.when('installment', {
    is: true, // Condição: O campo 'installment' existe e é true
    then: Joi.object({
        recurring: Joi.valid(false).required() // Então, 'recurring' deve ser explicitamente 'false' e requerido.
    }).messages({ // Mensagens personalizadas para este caso
        'any.required': 'O campo "recurring" deve ser explicitamente false quando "installment" é true.',
        'any.only': 'O campo "recurring" deve ser false quando "installment" é true.',
    }),
});
// Removido .nand(), .oxor(). As regras 'when' combinadas cuidam da exclusividade.


// Esquema para atualização de transação (aplicando a mesma lógica)
const updateTransaction = Joi.object({
  description: Joi.string().trim().min(1).max(255).optional(),
  amount: Joi.number().precision(2).positive().optional(),
  type: Joi.string().valid('income', 'expense').optional(),
  date: Joi.date().iso().optional(),
  accountId: Joi.number().integer().positive().optional().allow(null),
  categoryId: Joi.number().integer().positive().optional().allow(null),
  invoiceId: Joi.number().integer().positive().optional().allow(null),

  forecast: Joi.boolean().optional(), // forecast também opcional na atualização

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
}).when('recurring', {
    is: true,
    then: Joi.object({
        installment: Joi.valid(false).required()
    }),
}).when('installment', {
    is: true,
    then: Joi.object({
        recurring: Joi.valid(false).required()
    }),
}).min(1); // Garante que pelo menos um campo esteja presente para atualização


// Exporta todos os esquemas relevantes
module.exports = {
  transactionIdParam,
  getTransactionsQuery,
  createTransaction,
  updateTransaction,
};