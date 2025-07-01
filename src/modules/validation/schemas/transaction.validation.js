// src/modules/validation/schemas/transaction.validation.js (CORRIGIDO: Remove dependência circular no esquema)

const Joi = require('joi'); // Variável Joi importada

// Esquema base para o ID da transação nos parâmetros (mantido)
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
  // REMOVIDA A REGRA when AQUI - A exclusividade será verificada no nível do objeto
  recurring: Joi.boolean().default(false).optional(),

  // REMOVIDA A REGRA when AQUI - A exclusividade será verificada no nível do objeto
  installment: Joi.boolean().default(false).optional(),

  // frequency e recurringStartDate dependem APENAS de 'recurring' ser true
  frequency: Joi.string().when('recurring', {
      is: true, // Se 'recurring' é true
      then: Joi.string().trim().min(1).required(), // frequency é necessário
      otherwise: Joi.optional().allow(null), // Senão, opcional/null
  }),
   recurringStartDate: Joi.date().iso().when('recurring', {
       is: true, // Se 'recurring' é true
       then: Joi.required(), // recurringStartDate é necessário
       otherwise: Joi.optional().allow(null), // Senão, opcional/null
   }),

   // installmentCount e installmentUnit dependem APENAS de 'installment' ser true
  installmentCount: Joi.number().integer().min(1).when('installment', {
      is: true, // Se 'installment' é true
      then: Joi.number().integer().min(1).required(), // installmentCount é necessário
      otherwise: Joi.optional().allow(null), // Senão, opcional/null
  }),
   installmentCurrent: Joi.number().integer().min(1).optional().allow(null).default(1), // Parcela atual (sempre opcional/default)
   installmentUnit: Joi.string().when('installment', {
       is: true, // Se 'installment' é true
       then: Joi.string().trim().min(1).required(), // installmentUnit é necessário
       otherwise: Joi.optional().allow(null), // Senão, opcional/null
   }),

  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),


  // --- Regra de exclusividade no nível do objeto ---
  // Se o objeto contiver { recurring: true, installment: true }, a validação falha.
  // Use Joi.object para verificar a combinação. .unknown() permite outros campos.
  // .then(Joi.forbidden()) nega o objeto se a condição for satisfeita.
}).when(Joi.object({ recurring: true, installment: true }).unknown(), {
    then: Joi.forbidden().message('Lançamentos recorrentes e parcelados não podem ser ambos verdadeiros.'), // Mensagem de erro customizada
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
  installment: Joi.boolean().optional(), // Removida regra when aqui

  frequency: Joi.string().when('recurring', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  recurringStartDate: Joi.date().iso().when('recurring', { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  installmentCount: Joi.number().integer().min(1).when('installment', { is: true, then: Joi.number().integer().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  installmentCurrent: Joi.number().integer().min(1).optional().allow(null),
  installmentUnit: Joi.string().when('installment', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),

   // Aplica a mesma regra de exclusividade no nível do objeto para atualização
}).when(Joi.object({ recurring: true, installment: true }).unknown(), {
    then: Joi.forbidden().message('Lançamentos recorrentes e parcelados não podem ser ambos verdadeiros.'),
}).min(1);


// Exporta todos os esquemas relevantes
module.exports = {
  transactionIdParam,
  getTransactionsQuery,
  createTransaction,
  updateTransaction,
};