// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

// Caminhos relativos a partir de 'src/' (certifique-se de que estes arquivos existem)
const apiRoutes = require('./src/routes/index'); // Importa o roteador principal
const errorMiddleware = require('./src/modules/errors/error.middleware'); // Importa o middleware de erro
const ApiError = require('./src/modules/errors/apiError'); // Importa a classe de erro customizada

const app = express();

// Middlewares de Segurança e Utilidades
app.use(helmet());

// *** CONFIGURAÇÃO TRUST PROXY ***
// O warning ERR_ERL_PERMISSIVE_TRUST_PROXY ocorre porque 'trust proxy' está como 'true'.
// 'true' significa confiar em *qualquer* cabeçalho X-Forwarded-For, o que pode ser inseguro.
// Para DEV local ou sem proxy, use 'false'.
// Para produção atrás de 1 proxy, use '1'.
// Para produção atrás de proxies específicos, use um array de IPs ou CIDRs.
// Mantenho como 'true' pois foi o que você forneceu, mas SAIBAM que isso pode gerar o warning e precisa ser ajustado para PROD.
app.set('trust proxy', true); // <-- Ajuste conforme sua infraestrutura de deployment

app.use(cors({ origin: '*' })); // Permite CORS de qualquer origem (ajustar em produção)

app.use(express.json()); // Middleware para parsear JSON no body
app.use(express.urlencoded({ extended: true })); // Middleware para parsear URL-encoded no body

// --- Definição das Rotas ---
// Todas as rotas definidas em src/routes/index.js serão prefixadas com '/' (raiz)
// Se quiser prefixar com /api/v1, mude para app.use('/api/v1', apiRoutes);
app.use('/', apiRoutes);

// --- Tratamento de Rotas Não Encontradas (404) ---
app.use((req, res, next) => {
  next(new ApiError(404, 'Rota não encontrada.'));
});

// --- Tratamento Centralizado de Erros ---
app.use(errorMiddleware);

module.exports = app;