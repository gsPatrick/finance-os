// src/modules/validation/schemas/transaction.validation.js (CORRIGIDO: Regras when aplicadas nos campos)

const Joi = require('joi'); // Variável Joi importada

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
  // As regras 'when' agora são aplicadas nos campos recurring/installment
  recurring: Joi.boolean().default(false).optional()
      .when('installment', { // <-- Aplica when em 'recurring', referenciando 'installment'
          is: true, // Se 'installment' existe e é true
          then: Joi.valid(false).required().messages({ // Então 'recurring' DEVE ser explicitamente false
              'any.required': 'O campo "recurring" deve ser explicitamente false quando "installment" é true.',
              'any.only': 'O campo "recurring" deve ser false quando "installment" é true.',
          }),
          otherwise: Joi.boolean().default(false).optional(), // Se 'installment' não é true, recurring pode ser o original (optional default false)
      }),

  installment: Joi.boolean().default(false).optional()
       .when('recurring', { // <-- Aplica when em 'installment', referenciando 'recurring'
           is: true, // Se 'recurring' existe e é true
           then: Joi.valid(false).required().messages({ // Então 'installment' DEVE ser explicitamente false
               'any.required': 'O campo "installment" deve ser explicitamente false quando "recurring" é true.',
               'any.only': 'O campo "installment" deve ser false quando "recurring" é true.',
           }),
           otherwise: Joi.boolean().default(false).optional(), // Se 'recurring' não é true, installment pode ser o original
       }),

  // frequency e recurringStartDate dependem apenas de 'recurring' ser true (sem a nova regra when aqui)
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

   // installmentCount e installmentUnit dependem apenas de 'installment' ser true (sem a nova regra when aqui)
  installmentCount: Joi.number().integer().min(1).when('installment', {
      is: true,
      then: Joi.number().integer().min(1).required(),
      otherwise: Joi.optional().allow(null),
  }),
   installmentCurrent: Joi.number().integer().min(1).optional().allow(null).default(1),
   installmentUnit: Joi.string().when('installment', {
       is: true,
       then: Joi.string().trim().min(1).required(),
       otherwise: Joi.optional().allow(null),
   }),

  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),

  // Removido as regras when aplicadas no objeto raiz.
  // A exclusividade agora é tratada pelas regras when aplicadas nos campos individuais.
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

  // Aplica as mesmas regras when nos campos recurring/installment para atualização
  recurring: Joi.boolean().optional()
       .when('installment', { // <-- Aplica when em 'recurring', referenciando 'installment'
           is: true,
           then: Joi.valid(false).required().messages({
               'any.required': 'O campo "recurring" deve ser explicitamente false quando "installment" é true.',
               'any.only': 'O campo "recurring" deve ser false quando "installment" é true.',
           }),
           otherwise: Joi.boolean().optional(), // Mantém opcional na atualização
       }),

  installment: Joi.boolean().optional()
      .when('recurring', { // <-- Aplica when em 'installment', referenciando 'recurring'
          is: true,
          then: Joi.valid(false).required().messages({
              'any.required': 'O campo "installment" deve ser explicitamente false quando "recurring" é true.',
              'any.only': 'O campo "installment" deve ser false quando "recurring" é true.',
          }),
          otherwise: Joi.boolean().optional(), // Mantém opcional na atualização
      }),


  frequency: Joi.string().when('recurring', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  recurringStartDate: Joi.date().iso().when('recurring', { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  installmentCount: Joi.number().integer().min(1).when('installment', { is: true, then: Joi.number().integer().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  installmentCurrent: Joi.number().integer().min(1).optional().allow(null),
  installmentUnit: Joi.string().when('installment', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),

}).min(1); // Garante que pelo menos um campo esteja presente para atualização


// Exporta todos os esquemas relevantes
module.exports = {
  transactionIdParam,
  getTransactionsQuery,
  createTransaction,
  updateTransaction,
};