// src/features/dashboard/dashboard.controller.js

const dashboardService = require('./dashboard.service');
const catchAsync = require('../../modules/helpers/catchAsync.helper');

/**
 * Controlador para buscar todos os dados agregados para o dashboard.
 * Endpoint: GET /api/v1/dashboard
 * Requer autenticação.
 */
const getDashboardData = catchAsync(async (req, res) => {
  const userId = req.user.id; // Usuário autenticado

  const dashboardData = await dashboardService.getDashboardData(userId);

  res.status(200).json({
    status: 'success',
    data: dashboardData,
  });
});

module.exports = {
  getDashboardData,
};