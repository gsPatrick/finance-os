// src/routes/index.js (Atualizado)

const express = require('express');
const userRoutes = require('../features/user/user.routes');
const accountRoutes = require('../features/account/account.routes');
const transactionRoutes = require('../features/transaction/transaction.routes');
const invoiceRoutes = require('../features/invoice/invoice.routes');
const categoryRoutes = require('../features/category/category.routes');
const calendarEventTypeRoutes = require('../features/calendarEventType/calendarEventType.routes');
const calendarEventRoutes = require('../features/calendarEvent/calendarEvent.routes');
const investmentRoutes = require('../features/investment/investment.routes'); 
const authRoutes = require('../auth/auth.routes'); // Importa as rotas de autenticação

// Importa rotas de investimento
// Importe aqui as rotas de outros módulos se necessário (ex: relatórios, settings)
// const reportRoutes = require('../report/report.routes');
// const settingRoutes = require('../setting/setting.routes');
// ...

const router = express.Router();

const apiVersion = '/api/v1';

// Conecta as rotas de cada módulo ao router principal
router.use(`${apiVersion}/auth`, authRoutes); // Ex: /api/v1/auth/login
router.use(`${apiVersion}/users`, userRoutes);
router.use(`${apiVersion}/accounts`, accountRoutes);
router.use(`${apiVersion}/transactions`, transactionRoutes);
router.use(`${apiVersion}/invoices`, invoiceRoutes);
router.use(`${apiVersion}/categories`, categoryRoutes);
router.use(`${apiVersion}/calendar-event-types`, calendarEventTypeRoutes);
router.use(`${apiVersion}/calendar-events`, calendarEventRoutes);
router.use(`${apiVersion}/investments`, investmentRoutes); // Adiciona rotas de investimento
// Exemplo para outros módulos:
// router.use(`${apiVersion}/reports`, reportRoutes);
// router.use(`${apiVersion}/settings`, settingRoutes);
// ...


// Exemplo de rota raiz da API
router.get('/', (req, res) => {
    res.send('API Finance OS está funcionando!');
});


module.exports = router;