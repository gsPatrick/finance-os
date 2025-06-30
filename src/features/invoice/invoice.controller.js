// src/invoice/invoice.controller.js

const invoiceService = require('./invoice.service');
const catchAsync = require('../../modules/helpers/catchAsync.helper');
const ApiError = require('../../modules/errors/apiError');
const { parseISO } = require('date-fns');
const { Op } = require('sequelize'); // Necessário para construir filtros


/**
 * Controlador para criar uma nova fatura (manual, se aplicável).
 * Endpoint: POST /api/v1/invoices
 * Requer autenticação.
 */
const createInvoice = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const invoiceData = req.body;

  const newInvoice = await invoiceService.createInvoice(userId, invoiceData);

  res.status(201).json({
    status: 'success',
    message: 'Fatura criada com sucesso.',
    data: newInvoice,
  });
});

/**
 * Controlador para buscar faturas do usuário.
 * Endpoint: GET /api/v1/invoices
 * Requer autenticação.
 */
const getInvoices = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const queryParams = req.query;

  const options = {
    limit: queryParams.limit,
    offset: (queryParams.page - 1) * queryParams.limit,
    where: {
        ...(queryParams.accountId && { accountId: queryParams.accountId }),
        ...(queryParams.status && { status: queryParams.status }),
        ...(queryParams.paymentStatus && { paymentStatus: queryParams.paymentStatus }), // Incluído filtro por paymentStatus
        ...(queryParams.year && { year: queryParams.year }),
        ...(queryParams.month && { month: queryParams.month }),
        ...(queryParams.startDate && { startDate: queryParams.startDate }),
        ...(queryParams.endDate && { endDate: queryParams.endDate }),
    },
     order: queryParams.sortBy ? [[queryParams.sortBy.split(':')[0], queryParams.sortBy.split(':')[1] || 'DESC']] : undefined,
  };

  const invoices = await invoiceService.getInvoices(userId, options);

  res.status(200).json({
    status: 'success',
    results: invoices.rows.length,
    total: invoices.count,
    data: invoices.rows,
  });
});

/**
 * Controlador para buscar uma fatura específica pelo ID.
 * Endpoint: GET /api/v1/invoices/:invoiceId
 * Requer autenticação.
 */
const getInvoice = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const invoiceId = parseInt(req.params.invoiceId, 10);

  const invoice = await invoiceService.getInvoiceById(userId, invoiceId); // O service já inclui cartão

  res.status(200).json({
    status: 'success',
    data: invoice,
  });
});

/**
 * Controlador para buscar as transações associadas a uma fatura específica.
 * Endpoint: GET /api/v1/invoices/:invoiceId/transactions
 * Requer autenticação.
 */
const getInvoiceTransactions = catchAsync(async (req, res) => {
     const userId = req.user.id;
     const invoiceId = parseInt(req.params.invoiceId, 10); // Validado por invoiceIdParam

     const queryParams = req.query;

     const options = {
         limit: queryParams.limit,
         offset: (queryParams.page - 1) * queryParams.limit,
         where: {
             ...(queryParams.type && { type: queryParams.type }),
             ...(queryParams.status && { status: queryParams.status }),
             ...(queryParams.search && { search: queryParams.search }),
         },
          order: queryParams.sortBy ? [[queryParams.sortBy.split(':')[0], queryParams.sortBy.split(':')[1] || 'ASC']] : undefined,
     };

     const transactions = await invoiceService.getTransactionsByInvoiceId(userId, invoiceId, options);

     res.status(200).json({
         status: 'success',
         results: transactions.rows.length,
         total: transactions.count,
         data: transactions.rows,
     });
});


/**
 * Controlador para atualizar uma fatura específica pelo ID.
 * Endpoint: PUT /api/v1/invoices/:invoiceId
 * Requer autenticação.
 */
const updateInvoice = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const invoiceId = parseInt(req.params.invoiceId, 10);
  const updateData = req.body;

  const updatedInvoice = await invoiceService.updateInvoice(userId, invoiceId, updateData);

  res.status(200).json({
    status: 'success',
    message: 'Fatura atualizada com sucesso.',
    data: updatedInvoice,
  });
});

/**
 * Controlador para deletar uma fatura específica pelo ID.
 * Endpoint: DELETE /api/v1/invoices/:invoiceId
 * Requer autenticação.
 */
const deleteInvoice = catchAsync(async (req, res) => {
  const userId = req.user.id;
  const invoiceId = parseInt(req.params.invoiceId, 10);

  await invoiceService.deleteInvoice(userId, invoiceId);

  res.status(204).json({}); // 204 No Content
});

/**
 * NOVO: Controlador para registrar um pagamento em uma fatura.
 * Endpoint: POST /api/v1/invoices/:invoiceId/pay
 * Requer autenticação.
 */
const payInvoice = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const invoiceId = parseInt(req.params.invoiceId, 10); // Validado por invoiceIdParam
    // req.body já foi validado por payInvoiceBody schema
    const paymentData = req.body;

    const updatedInvoice = await invoiceService.registerInvoicePayment(userId, invoiceId, paymentData);

    res.status(200).json({
        status: 'success',
        message: 'Pagamento registrado com sucesso.',
        data: updatedInvoice,
    });
});

/**
 * Opcional: Controlador para disparar o fechamento de faturas.
 * Endpoint: POST /api/v1/invoices/run-closing-job
 * Requer autenticação e provavelmente autorização (admin).
 */
const runClosingJob = catchAsync(async (req, res) => {
    // TODO: Adicionar lógica de autorização (apenas admin pode disparar jobs manualmente?)
    // if (!req.user.isAdmin) throw new ApiError(403, 'Você não tem permissão para disparar jobs.');

    // Chama o método de serviço que contém a lógica do job
    const closedCount = await invoiceService.closeInvoices();

    res.status(200).json({
        status: 'success',
        message: `Processo de fechamento de faturas disparado. ${closedCount} faturas foram fechadas hoje (se aplicável).`,
        closedCount: closedCount,
    });
});


module.exports = {
   createInvoice, // Exportar apenas se a criação manual for permitida
   getInvoices,
   getInvoice,
   getInvoiceTransactions,
   updateInvoice,
   deleteInvoice,
   payInvoice, // Exporta o novo controlador de pagamento
   runClosingJob, // Exporta o controlador do job de fechamento (opcional)
};