// src/investment/investment.controller.js

const { investmentService } = require('../../services');
const catchAsync = require('../../modules/helpers/catchAsync.helper');
const ApiError = require('../../modules/errors/apiError');
const { Op } = require('sequelize');


/**
 * Controlador para criar um novo ativo de investimento.
 * Endpoint: POST /api/v1/investments
 * Requer autenticação.
 */
const createInvestment = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.body já foi validado e limpo (createInvestment schema)
  const investmentData = req.body;

   // O service associará ao usuário e cuidará de validações adicionais (unicidade)
  const newInvestment = await investmentService.createInvestment(userId, investmentData);

  res.status(201).json({ // 201 Created
    status: 'success',
    message: 'Ativo de investimento criado com sucesso.',
    data: newInvestment,
  });
});

/**
 * Controlador para buscar ativos de investimento do usuário.
 * Endpoint: GET /api/v1/investments
 * Requer autenticação.
 */
const getInvestments = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.query já foi validado e limpo (getInvestmentsQuery schema)
  const queryParams = req.query;

  // Constrói as opções para o Service a partir dos query params
  const options = {
    limit: queryParams.limit,
    offset: (queryParams.page - 1) * queryParams.limit,
    where: {
        // Filtros específicos mapeados
        ...(queryParams.type && { type: queryParams.type }),

         // Adiciona termo de busca ao `where` para que o Service possa processar (busca em asset/name)
        ...(queryParams.search && { search: queryParams.search }),
    },
    // Exemplo de ordenação
     order: queryParams.sortBy ? [[queryParams.sortBy.split(':')[0], queryParams.sortBy.split(':')[1] || 'ASC']] : undefined, // Usa o default do service (asset ASC)
  };

  const investments = await investmentService.getInvestments(userId, options);

  res.status(200).json({
    status: 'success',
    results: investments.rows.length,
    total: investments.count,
    data: investments.rows, // Inclui totalValue calculado
  });
});

/**
 * Controlador para buscar um ativo de investimento específico pelo ID.
 * Endpoint: GET /api/v1/investments/:investmentId
 * Requer autenticação.
 */
const getInvestment = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado (investmentIdParam schema)
  const investmentId = parseInt(req.params.investmentId, 10);

   // TODO: Adicionar opções de include se necessário (ex: incluir histórico de preços)
   // const options = { include: [...] };

  const investment = await investmentService.getInvestmentById(userId, investmentId);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(200).json({
    status: 'success',
    data: investment, // Inclui totalValue calculado
  });
});

/**
 * Controlador para atualizar um ativo de investimento específico pelo ID.
 * Endpoint: PUT /api/v1/investments/:investmentId
 * Requer autenticação.
 */
const updateInvestment = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params e req.body já foram validados e limpos
  const investmentId = parseInt(req.params.investmentId, 10);
  const updateData = req.body;

  // O service garantirá que o ativo pertence ao usuário e validará dados (unicidade)
  const updatedInvestment = await investmentService.updateInvestment(userId, investmentId, updateData);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(200).json({ // 200 OK
    status: 'success',
    message: 'Ativo de investimento atualizado com sucesso.',
    data: updatedInvestment, // Inclui totalValue recalculado
  });
});

/**
 * Controlador para deletar um ativo de investimento específico pelo ID.
 * Endpoint: DELETE /api/v1/investments/:investmentId
 * Requer autenticação.
 */
const deleteInvestment = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado.
  const investmentId = parseInt(req.params.investmentId, 10);

   // O service garantirá que o ativo pertence ao usuário e cuidará da exclusão
  await investmentService.deleteInvestment(userId, investmentId);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(204).json({ // 204 No Content
    // status: 'success',
    // data: null,
  });
});

// TODO: Adicionar controladores para endpoints de compra/venda ou atualização de preços (se forem endpoints HTTP)
// Ex: POST /api/v1/investments/:investmentId/buy
// Ex: POST /api/v1/investments/update-prices
// const buyInvestment = catchAsync(async (req, res) => { ... });
// const sellInvestment = catchAsync(async (req, res) => { ... });
// const triggerPriceUpdate = catchAsync(async (req, res) => { ... });


module.exports = {
  createInvestment,
  getInvestments,
  getInvestment,
  updateInvestment,
  deleteInvestment,
  // buyInvestment, // Exportar se for um endpoint
  // sellInvestment, // Exportar se for um endpoint
  // triggerPriceUpdate, // Exportar se for um endpoint
};