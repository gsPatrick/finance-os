// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const apiRoutes = require('./src/routes/index');
const errorMiddleware = require('./src/modules/errors/error.middleware');
const ApiError = require('./src/modules/errors/apiError');

const app = express();

app.use(helmet());
app.set('trust proxy', 1);
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/', apiRoutes);

app.use((req, res, next) => {
  next(new ApiError(404, 'Rota não encontrada.'));
});

app.use(errorMiddleware);

module.exports = app;
