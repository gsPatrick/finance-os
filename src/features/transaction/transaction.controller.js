// src/transaction/transaction.controller.js

const { transactionService } = require('../../services'); // <-- Importação corrigida para vir do index central
const catchAsync = require('../../modules/helpers/catchAsync.helper');
const ApiError = require('../../modules/errors/apiError');
const { Op } = require('sequelize'); // Necessário para construir filtros complexos no service, mas a construção é feita aqui.
const { parseISO } = require('date-fns'); // Para converter strings de data dos query params


/**
 * Controlador para criar uma nova transação.
 * Endpoint: POST /api/v1/transactions
 * Requer autenticação (req.user deve estar disponível).
 */
const createTransaction = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.body já foi validado e limpo pelo middleware `validate` (createTransaction schema)
  const transactionData = req.body;

  // O service cuidará da validação de IDs de conta/categoria/fatura e associações ao usuário
  const newTransaction = await transactionService.createTransaction(userId, transactionData);

  res.status(201).json({ // 201 Created
    status: 'success',
    message: 'Transação criada com sucesso.',
    data: newTransaction,
  });
});

/**
 * Controlador para buscar transações do usuário.
 * Endpoint: GET /api/v1/transactions
 * Requer autenticação.
 */
const getTransactions = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.query já foi validado e limpo pelo middleware `validate` (getTransactionsQuery schema)
  const queryParams = req.query;

  // Constrói as opções para o Service a partir dos query params
  const options = {
    limit: queryParams.limit,
    offset: (queryParams.page - 1) * queryParams.limit,
    where: {
        // Filtros específicos mapeados de query params para Sequelize where
        ...(queryParams.type && { type: queryParams.type }),
        ...(queryParams.status && { status: queryParams.status }),
        ...(queryParams.recurring !== undefined && { recurring: queryParams.recurring }), // Trata booleano
        ...(queryParams.installment !== undefined && { installment: queryParams.installment }), // Trata booleano
        ...(queryParams.accountId && { accountId: queryParams.accountId }),
        ...(queryParams.categoryId && { categoryId: queryParams.categoryId }),
        ...(queryParams.invoiceId && { invoiceId: queryParams.invoiceId }),

        // Filtro por range de datas
        ...((queryParams.startDate || queryParams.endDate) && {
            date: {
                ...(queryParams.startDate && { [Op.gte]: parseISO(queryParams.startDate) }), // >= data de início
                ...(queryParams.endDate && { [Op.lte]: parseISO(queryParams.endDate) }),   // <= data de fim
                 // Se startDate e endDate forem iguais, buscar por um dia específico
                ...(queryParams.startDate && queryParams.endDate && queryParams.startDate === queryParams.endDate && {
                    [Op.between]: [startOfDay(parseISO(queryParams.startDate)), endOfDay(parseISO(parseISO(queryParams.endDate)))] // Busca no dia inteiro
                }),
            }
        }),

         // Adiciona termo de busca ao `where` para que o Service possa processar
        ...(queryParams.search && { search: queryParams.search }),

        // ... outros filtros
    },
    // Exemplo de ordenação
     order: queryParams.sortBy ? [[queryParams.sortBy.split(':')[0], queryParams.sortBy.split(':')[1] || 'DESC']] : [['date', 'DESC'], ['createdAt', 'DESC']], // Padrão por data decrescente
    // Opcional: attributes, include (se o service não incluir por padrão)
  };

    // Remove o filtro de data se estiver vazio após a construção
    if (options.where.date && Object.keys(options.where.date).length === 0) {
        delete options.where.date;
    }

  const transactions = await transactionService.getTransactions(userId, options);

  res.status(200).json({
    status: 'success',
    results: transactions.rows.length,
    total: transactions.count,
    data: transactions.rows,
  });
});

/**
 * Controlador para buscar uma transação específica pelo ID.
 * Endpoint: GET /api/v1/transactions/:transactionId
 * Requer autenticação.
 */
const getTransaction = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado pelo middleware `validate` (transactionIdParam schema)
  const transactionId = parseInt(req.params.transactionId, 10);

   // TODO: Adicionar opções de include se necessário (o service já inclui account/category por padrão)
   // const options = { include: [...] };

  const transaction = await transactionService.getTransactionById(userId, transactionId);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(200).json({
    status: 'success',
    data: transaction,
  });
});

/**
 * Controlador para atualizar uma transação específica pelo ID.
 * Endpoint: PUT /api/v1/transactions/:transactionId
 * Requer autenticação.
 */
const updateTransaction = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params e req.body já foram validados e limpos pelo middleware `validate`
  const transactionId = parseInt(req.params.transactionId, 10);
  const updateData = req.body;

  // O service cuidará da lógica de atualização de saldo e validações adicionais
  const updatedTransaction = await transactionService.updateTransaction(userId, transactionId, updateData);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(200).json({ // 200 OK
    status: 'success',
    message: 'Transação atualizada com sucesso.',
    data: updatedTransaction,
  });
});

/**
 * Controlador para deletar uma transação específica pelo ID.
 * Endpoint: DELETE /api/v1/transactions/:transactionId
 * Requer autenticação.
 */
const deleteTransaction = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado.
  const transactionId = parseInt(req.params.transactionId, 10);

  // O service cuidará da lógica de reversão de saldo e exclusão
  await transactionService.deleteTransaction(userId, transactionId);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(204).json({ // 204 No Content
    // status: 'success', // Não inclua status em 204
    // data: null,        // Não inclua corpo em 204
  });
});

// TODO: Adicionar controladores para endpoints de efetivação/agendamento (se forem endpoints HTTP)
// Ex: const clearTransaction = catchAsync(async (req, res) => { ... });
// Ex: const scheduleRecurring = catchAsync(async (req, res) => { ... });


module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  // clearTransaction, // Exportar se for um endpoint
  // scheduleRecurring, // Exportar se for um endpoint
};  