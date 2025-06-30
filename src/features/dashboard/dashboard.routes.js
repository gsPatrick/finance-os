// src/features/dashboard/dashboard.routes.js

const express = require('express');
const dashboardController = require('./dashboard.controller');
const authMiddleware = require('../../modules/auth/auth.middleware');

const router = express.Router();

// Todas as rotas do dashboard exigem autenticação
router.use(authMiddleware);

// Rota para buscar todos os dados do dashboard
// GET /api/v1/dashboard
router.get('/', dashboardController.getDashboardData);

module.exports = router;