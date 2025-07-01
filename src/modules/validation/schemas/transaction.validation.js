// src/modules/validation/schemas/transaction.validation.js

const Joi = require('joi');

// Esquema base para o ID da transação nos parâmetros
const transactionIdParam = Joi.object({
  transactionId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de transações
const getTransactionsQuery = Joi.object({
  // 'type' espera 'income' ou 'expense'. O frontend deve mapear para isso.
  type: Joi.string().valid('income', 'expense').optional(),

  // CORRIGIDO: 'status' agora aceita uma string OU um array de strings permitidas
  status: Joi.alternatives().try(
      Joi.string().valid('pending', 'cleared', 'scheduled'), // Permite uma única string
      Joi.array().items(Joi.string().valid('pending', 'cleared', 'scheduled')) // Permite um array de strings
  ).optional(),

  recurring: Joi.boolean().optional(),

  // 'installment' espera boolean. O frontend deve mapear 'yes'/'no' para true/false.
  installment: Joi.boolean().optional(),

  accountId: Joi.number().integer().positive().optional(),
  categoryId: Joi.number().integer().positive().optional().allow(null),
  invoiceId: Joi.number().integer().positive().optional().allow(null),

  // Filtros de data esperam strings no formato ISO 8601 (YYYY-MM-DD)
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),

  search: Joi.string().trim().optional(),

  // Parâmetros de paginação e ordenação
  limit: Joi.number().integer().positive().default(20).optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  sortBy: Joi.string().optional(), // Formato esperado: 'campo:direcao' (ex: 'date:desc', 'amount:asc')
});


// Esquema para criação de transação
const createTransaction = Joi.object({
  description: Joi.string().trim().min(1).max(255).required(),
  amount: Joi.number().precision(2).positive().required(),
  type: Joi.string().valid('income', 'expense').required(), // Espera 'income' ou 'expense'
  date: Joi.date().iso().required(), // Espera string ISO 8601 (YYYY-MM-DD)
  accountId: Joi.number().integer().positive().required(),
  categoryId: Joi.number().integer().positive().optional().allow(null),
  invoiceId: Joi.number().integer().positive().optional().allow(null),

  // Campo para indicar se é um lançamento futuro. Service decide o status inicial.
  forecast: Joi.boolean().default(false).optional(),

  // Flags para indicar se é uma série recorrente ou parcelada
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

   // CORRIGIDO: installmentCurrent SÓ É PERMITIDO se 'installment' for true na CRIAÇÃO
   // Removido o .default(1) daqui. O Service define installmentCurrent para a primeira parcela.
   installmentCurrent: Joi.number().integer().min(1).optional().allow(null).when('installment', {
       is: false, // Se installment for false...
       then: Joi.forbidden(), // ...então installmentCurrent é proibido
       otherwise: Joi.optional().allow(null), // Caso contrário (installment é true), é opcional e pode ser null
   }),


  observation: Joi.string().trim().allow('', null).optional(),

  // Status inicial é determinado pelo service com base na data, forecast e flags de série.
  // Não deve ser enviado pelo frontend na criação.
  // status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),


  // --- Regra de exclusividade no nível do objeto ---
  // Se o objeto contiver { recurring: true, installment: true }, a validação falha.
  // Usa Joi.object para verificar a combinação. .unknown() permite outros campos no body.
  // .then(Joi.forbidden()) nega o objeto se a condição for satisfeita.
  // Mensagem personalizada definida usando .options().messages() no nível do when.
}).when(Joi.object({ recurring: true, installment: true }).unknown(), {
    then: Joi.forbidden(),
}).options({
    messages: { // Mensagens no nível do objeto
        'any.unknown': '{{#label}} is not allowed', // Mensagem padrão para campos desconhecidos (útil manter)
        'object.forbidden': 'Lançamentos recorrentes e parcelados não podem ser ambos verdadeiros.', // Mensagem para Joi.forbidden()
    }
});


// Esquema para atualização de transação
const updateTransaction = Joi.object({
  description: Joi.string().trim().min(1).max(255).optional(),
  amount: Joi.number().precision(2).positive().optional(),
  type: Joi.string().valid('income', 'expense').optional(), // Espera 'income' ou 'expense'
  date: Joi.date().iso().optional(), // Espera string ISO 8601 (YYYY-MM-DD)
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

  // CORRIGIDO: installmentCurrent SÓ É PERMITIDO se 'installment' for true na ATUALIZAÇÃO
  installmentCurrent: Joi.number().integer().min(1).optional().allow(null).when('installment', {
      is: false,
      then: Joi.forbidden(),
      otherwise: Joi.optional().allow(null),
  }),

  observation: Joi.string().trim().allow('', null).optional(),
  // Permitir atualizar status manualmente (ex: de pending para cleared)
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),

   // Aplica a mesma regra de exclusividade no nível do objeto para atualização
}).when(Joi.object({ recurring: true, installment: true }).unknown(), {
    then: Joi.forbidden(),
}).options({
    messages: {
        'any.unknown': '{{#label}} is not allowed',
        'object.forbidden': 'Lançamentos recorrentes e parcelados não podem ser ambos verdadeiros (update).', // Mensagem ligeiramente diferente para update
    }
}).min(1); // Garante que pelo menos um campo atualizável esteja presente


// Exporta todos os esquemas relevantes
module.exports = {
  transactionIdParam,
  getTransactionsQuery,
  createTransaction,
  updateTransaction,
};