// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Caminhos relativos a partir de 'src/'
const apiRoutes = require('./src/routes/index'); // Certifique-se de que este caminho está correto
const errorMiddleware = require('./src/modules/errors/error.middleware'); // Corrigido: importa diretamente a função
const ApiError = require('./src/modules/errors/apiError'); // Certifique-se de que este caminho está correto

const app = express();

// Middlewares básicos
app.use(helmet());

// TRUST PROXY (apenas se estiver atrás de proxy em produção, ex: Heroku, Nginx)
// Para testes locais, essa linha pode ser mantida sem impacto
app.set('trust proxy', 1);

// CORS liberado para tudo (para testes apenas)
app.use(cors({ origin: '*' }));

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ROTAS
app.use('/', apiRoutes); // Ou use /api/... se preferir

// ROTA 404 (caso nenhuma rota seja encontrada)
app.use((req, res, next) => {
  next(new ApiError(404, 'Rota não encontrada.'));
});

// MIDDLEWARE CENTRAL DE ERROS
app.use(errorMiddleware);

module.exports = app;
