// src/transaction/transaction.controller.js (AJUSTADO FINAL: Removendo parseISO redundante)

// Importa a instância do transactionService a partir do arquivo central de serviços
const { transactionService } = require('../../services');

// Importa o helper catchAsync
const catchAsync = require('../../modules/helpers/catchAsync.helper');

// Importa outros módulos necessários
const ApiError = require('../../modules/errors/apiError');
const { Op } = require('sequelize'); // Importa operadores Sequelize para consultas complexas
// NÃO precisamos importar parseISO aqui se o middleware Joi já faz o parsing
// const { parseISO } = require('date-fns'); // Removido parseISO

console.log('[transaction.controller.js] File loaded.');


/**
 * Controlador para criar uma nova transação.
 * Endpoint: POST /api/v1/transactions
 * Requer autenticação.
 */
const createTransaction = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.body já foi validado e limpo pelo middleware `validate` (createTransaction schema)
  // Datas em req.body já são objetos Date se validadas pelo Joi
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
  // Datas em req.query (startDate, endDate) já são objetos Date se validadas pelo Joi
  const queryParams = req.query;

  // Constrói as opções para o Service a partir dos query params
  const options = {
    limit: queryParams.limit,
    offset: (queryParams.page - 1) * queryParams.limit,
    where: {
        // Filtros específicos mapeados de query params para Sequelize where
        // Os valores de type, status, recurring, installment, accountId, categoryId, invoiceId
        // já vêm validados pelo Joi, use-os diretamente.
        ...(queryParams.type && { type: queryParams.type }),
        ...(queryParams.status && { status: queryParams.status }), // Pode ser string ou array (Joi valida)
        ...(queryParams.recurring !== undefined && { recurring: queryParams.recurring }), // Trata booleano
        ...(queryParams.installment !== undefined && { installment: queryParams.installment }), // Trata booleano
        ...(queryParams.accountId && { accountId: queryParams.accountId }),
        ...(queryParams.categoryId && { categoryId: queryParams.categoryId }),
        ...(queryParams.invoiceId && { invoiceId: queryParams.invoiceId }),

        // CORRIGIDO: Filtro por range de datas - Usa objetos Date diretamente
        // queryParams.startDate e queryParams.endDate JÁ SÃO objetos Date neste ponto.
        ...((queryParams.startDate || queryParams.endDate) && {
            date: {
                // Usa os objetos Date diretamente com os operadores Sequelize
                ...(queryParams.startDate && { [Op.gte]: queryParams.startDate }), // >= data de início
                ...(queryParams.endDate && { [Op.lte]: queryParams.endDate }),   // <= data de fim

                // A lógica para [Op.between] para o mesmo dia não é estritamente necessária aqui,
                // pois date: { [Op.gte]: date, [Op.lte]: date } já funciona corretamente
                // para um único dia.
            }
        }),

         // search filter is handled in the service layer using Op.iLike
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
    // Remove o filtro de search se estiver vazio (já foi tratado no hook frontend, mas por segurança)
    if (options.where.search === '') {
        delete options.where.search;
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

   // O service já inclui account/category/parent/children por padrão
   // TODO: Adicionar options de include se necessário (mas o service já inclui por default)
   // const options = { include: [...] };

  const transaction = await transactionService.getTransactionById(userId, transactionId);
  // O service já lança 404 (ou 403 dependendo da implementação), capturado pelo catchAsync.

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
  // Datas em req.body já são objetos Date se validadas pelo Joi
  const transactionId = parseInt(req.params.transactionId, 10);
  const updateData = req.body; // updateData contém objetos Date para campos de data

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

  // Verificar query param para deletar série (se implementado na API)
  const deleteSeries = req.query.deleteSeries === 'true'; // Assume query param ?deleteSeries=true

  // O service cuidará da lógica de reversão de saldo e exclusão
  await transactionService.deleteTransaction(userId, transactionId, deleteSeries);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(204).json({}); // 204 No Content
});

// TODO: Adicionar controladores para endpoints de efetivação manual ou agendamento, se forem endpoints HTTP

module.exports = {
  createTransaction,
  getTransactions,
  getTransaction,
  updateTransaction,
  deleteTransaction,
};