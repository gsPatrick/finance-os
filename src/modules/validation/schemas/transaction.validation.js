// src/modules/validation/schemas/transaction.validation.js

const Joi = require('joi');

// Esquema base para o ID da transação nos parâmetros
const transactionIdParam = Joi.object({
  transactionId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de transações
const getTransactionsQuery = Joi.object({
  type: Joi.string().valid('income', 'expense').optional(), // Filtrar por tipo
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(), // Filtrar por status
  recurring: Joi.boolean().optional(), // Filtrar por recorrência (true/false)
  installment: Joi.boolean().optional(), // Filtrar por parcelamento (true/false)
  accountId: Joi.number().integer().positive().optional(), // Filtrar por conta/cartão
  categoryId: Joi.number().integer().positive().optional(), // Filtrar por categoria
  invoiceId: Joi.number().integer().positive().optional(), // Filtrar por fatura (para despesas de cartão)

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

  // Campos de recorrência/parcelamento (condicionais)
  recurring: Joi.boolean().default(false).optional(),
  frequency: Joi.string().when('recurring', { // Frequência é necessária se recurring for true
      is: true,
      then: Joi.string().trim().min(1).required(),
      otherwise: Joi.optional().allow(null), // Opcional/Null se não for recorrente
  }),
   recurringStartDate: Joi.date().iso().when('recurring', { // Data de início da recorrência
       is: true,
       then: Joi.required(),
       otherwise: Joi.optional().allow(null),
   }),

  installment: Joi.boolean().default(false).optional(),
  installmentCount: Joi.number().integer().min(1).when('installment', { // Número de parcelas
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional().allow(null),
  }),
   installmentCurrent: Joi.number().integer().min(1).optional().allow(null).default(1).when('installment', { // Parcela atual (começa em 1)
       is: true,
       then: Joi.optional().allow(null), // Permitido, mas não requerido, default é 1
       otherwise: Joi.optional().allow(null),
   }),
   installmentUnit: Joi.string().when('installment', { // Unidade das parcelas (Meses, Semanas, etc.)
       is: true,
       then: Joi.string().trim().min(1).required(),
       otherwise: Joi.optional().allow(null),
   }),

   // Validação para garantir que não seja recorrente E parcelado ao mesmo tempo (regra de negócio)
   // Isso pode ser feito com .and() ou .or() ou no Service. Fazer no Service pode ser mais claro.
   // Exemplo com Joi:
   // .and('recurring', 'installment') // Se ambos existirem
   // .with('recurring', 'frequency') // Se recurring, frequency é necessário (já feito above)
   // .with('installment', ['installmentCount', 'installmentUnit']) // Se installment, estes são necessários (já feito above)


  observation: Joi.string().trim().allow('', null).optional(), // Observação é opcional e pode ser string vazia ou null
  // TODO: Adicionar validação para tags, attachments se forem implementados

  // Status é geralmente definido pela data/flags (isFuture) no frontend, mas no backend pode vir ou ser inferido
  // Permitir no corpo da requisição para flexibilidade, mas o Service pode sobrescrever
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),

}).oxor('recurring', 'installment'); // Exclusivo OU entre 'recurring' e 'installment'. Não pode ser ambos true.


// Esquema para atualização de transação
const updateTransaction = Joi.object({
  // Todos os campos são opcionais na atualização
  description: Joi.string().trim().min(1).max(255).optional(),
  amount: Joi.number().precision(2).positive().optional(),
  type: Joi.string().valid('income', 'expense').optional(),
  date: Joi.date().iso().optional(),
  accountId: Joi.number().integer().positive().optional().allow(null), // Permitir desassociar? Talvez não.
  categoryId: Joi.number().integer().positive().optional().allow(null),
  invoiceId: Joi.number().integer().positive().optional().allow(null),

  // Campos de recorrência/parcelamento (com lógica de `when` para `optional`)
  recurring: Joi.boolean().optional(),
  frequency: Joi.string().when('recurring', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  recurringStartDate: Joi.date().iso().when('recurring', { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  installment: Joi.boolean().optional(),
  installmentCount: Joi.number().integer().min(1).when('installment', { is: true, then: Joi.required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),
  installmentCurrent: Joi.number().integer().min(1).optional().allow(null),
  installmentUnit: Joi.string().when('installment', { is: true, then: Joi.string().trim().min(1).required(), otherwise: Joi.optional().allow(null) }).optional().allow(null),

  observation: Joi.string().trim().allow('', null).optional(),
  status: Joi.string().valid('pending', 'cleared', 'scheduled').optional(),

   // Regra OR exclusiva entre recurring e installment é mais complexa no update.
   // Se ambos estiverem presentes, o Service deve validar que no máximo um seja true.
   // Se apenas um estiver presente, o Joi valida contra o `when`.
   // O Service é o melhor lugar para a regra final.

}).min(1); // Garante que pelo menos um campo esteja presente para atualização


module.exports = {
  transactionIdParam,
  getTransactionsQuery,
  createTransaction,
  updateTransaction,
};