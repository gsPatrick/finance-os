// src/modules/validation/schemas/transaction.validation.js (AJUSTADO: Lógica de installmentCurrent no Joi)

const Joi = require('joi'); // Variável Joi importada

// Esquema base para o ID da transação nos parâmetros
const transactionIdParam = Joi.object({
  transactionId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de transações
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

  forecast: Joi.boolean().default(false).optional(),

  // Campos de recorrência/parcelamento (opcionais com default)
  recurring: Joi.boolean().default(false).optional(),
  installment: Joi.boolean().default(false).optional(),

  // frequency e recurringStartDate dependem APENAS de 'recurring' ser true
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

   // installmentCount e installmentUnit dependem APENAS de 'installment' ser true
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

   // installmentCurrent SÓ É PERMITIDO se 'installment' for true
   // REMOVIDO o .default(1) daqui
   installmentCurrent: Joi.number().integer().min(1).optional().allow(null).when('installment', {
       is: false, // Se installment for false...
       then: Joi.forbidden(), // ...então installmentCurrent é proibido
       otherwise: Joi.optional().allow(null), // Caso contrário (installment é true), é opcional e pode ser null
   }),


  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),


  // --- Regra de exclusividade no nível do objeto ---
  // Se o objeto contiver { recurring: true, installment: true }, a validação falha.
  // Use Joi.object para verificar a combinação. .unknown() permite outros campos.
  // .then(Joi.forbidden()) nega o objeto se a condição for satisfeita.
  // Mensagem personalizada definida usando .options().messages() no nível do when.
}).when(Joi.object({ recurring: true, installment: true }).unknown(), {
    then: Joi.forbidden(),
    // Mensagem personalizada para a condição 'when' que resulta em 'forbidden'
}).options({
    messages: { // Mensagens no nível do objeto
        'any.unknown': '{{#label}} is not allowed', // Mensagem padrão para campos desconhecidos (útil manter)
        'object.forbidden': 'Lançamentos recorrentes e parcelados não podem ser ambos verdadeiros.', // <-- Mensagem para Joi.forbidden()
        // Nota: A chave exata para forbidden acionado por when pode variar, 'object.forbidden' é comum.
        // Se esta não funcionar, podemos tentar outras chaves ou reestruturar a mensagem.
    }
});


// Esquema para atualização de transação (aplicando a mesma lógica)
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

  // installmentCurrent SÓ É PERMITIDO se 'installment' for true (na atualização)
  installmentCurrent: Joi.number().integer().min(1).optional().allow(null).when('installment', {
      is: false,
      then: Joi.forbidden(),
      otherwise: Joi.optional().allow(null),
  }),

  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),

   // Aplica a mesma regra de exclusividade no nível do objeto para atualização
}).when(Joi.object({ recurring: true, installment: true }).unknown(), {
    then: Joi.forbidden(),
    // Mensagem personalizada para a condição 'when' que resulta em 'forbidden'
}).options({
    messages: {
        'any.unknown': '{{#label}} is not allowed',
        'object.forbidden': 'Lançamentos recorrentes e parcelados não podem ser ambos verdadeiros (update).', // Mensagem ligeiramente diferente para update
    }
}).min(1);


// Exporta todos os esquemas relevantes
module.exports = {
  transactionIdParam,
  getTransactionsQuery,
  createTransaction,
  updateTransaction,
};