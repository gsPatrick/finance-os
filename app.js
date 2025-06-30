// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Caminhos relativos a partir de 'src/' (certifique-se de que estes arquivos existem)
const apiRoutes = require('./src/routes/index');
const errorMiddleware = require('./src/modules/errors/error.middleware');
const ApiError = require('./src/modules/errors/apiError');

const app = express();

// Middlewares de Segurança e Utilidades
app.use(helmet());
app.set('trust proxy', true); // Se estiver atrás de um proxy (como nginx ou Heroku)

app.use(cors({ origin: '*' }));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Definição das Rotas ---

app.use('/', apiRoutes);

// --- Tratamento de Erros ---

app.use((req, res, next) => {
  next(new ApiError(404, 'Rota não encontrada.'));
});

app.use(errorMiddleware);

module.exports = app;
