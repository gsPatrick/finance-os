// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/index'); // Roteador principal
const errorMiddleware = require('./modules/errors/error.middleware');
const ApiError = require('./modules/errors/apiError');

const app = express();

// --- Middlewares de Segurança ---

// 1. Helmet: Adiciona vários headers HTTP de segurança para proteger a aplicação
app.use(helmet());

// 2. CORS (Cross-Origin Resource Sharing): Permite que seu frontend (em outro domínio) acesse a API.
// Em produção, configure com opções mais restritivas.
app.use(cors({
  origin: '*', // Em produção: 'https://seu-dominio-frontend.com'
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
}));

// 3. Body Parsers: Essenciais para ler o corpo das requisições
app.use(express.json()); // Para parsear application/json
app.use(express.urlencoded({ extended: true })); // Para parsear application/x-www-form-urlencoded

// 4. Rate Limiter: Protege contra ataques de força bruta e abuso de API.
// Aplica a todas as requisições, mas pode ser configurado por rota.
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // Janela de 15 minutos
	max: 100, // Limita cada IP a 100 requisições por janela de 15 minutos
	standardHeaders: true, // Retorna informações do limite nos headers `RateLimit-*`
	legacyHeaders: false, // Desabilita os headers antigos `X-RateLimit-*`
    message: { status: 'error', message: 'Muitas requisições enviadas deste IP, por favor tente novamente em 15 minutos.' },
});
app.use(limiter);


// --- Rotas da API ---
// Monta o roteador principal em `/`
app.use('/', apiRoutes);


// --- Tratamento de Erros ---

// 1. Captura 404 Not Found para rotas não definidas
// Este middleware é acionado se nenhuma rota anterior correspondeu à requisição.
app.use((req, res, next) => {
  next(new ApiError(404, 'Rota não encontrada.'));
});

// 2. Middleware Centralizado de Tratamento de Erros
// Deve ser o ÚLTIMO middleware adicionado ao app.
app.use(errorMiddleware);


module.exports = app;