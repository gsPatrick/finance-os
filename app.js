// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Caminhos relativos a partir de 'src/'
const apiRoutes = require('./src/routes/index'); 
const errorMiddleware = require('./src/modules/errors/error.middleware');
const ApiError = require('./src/modules/errors/apiError');

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100,
	standardHeaders: true,
	legacyHeaders: false,
    message: { status: 'error', message: 'Muitas requisições enviadas deste IP, por favor tente novamente em 15 minutos.' },
});
app.use(limiter);

// Rotas da API
app.use('/', apiRoutes);

// Tratamento de Erros
app.use((req, res, next) => {
  next(new ApiError(404, 'Rota não encontrada.'));
});

app.use(errorMiddleware);

module.exports = app;