// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Caminhos relativos a partir de 'src/' (certifique-se de que estes arquivos existem)
const apiRoutes = require('./routes/index');
const errorMiddleware = require('./modules/errors/error.middleware');
const ApiError = require('./modules/errors/apiError');

const app = express();

// Middlewares de Segurança e Utilidades
// Helmet ajuda a proteger sua aplicação de algumas vulnerabilidades conhecidas
// Definindo cabeçalhos HTTP adequados.
app.use(helmet());

// CORS (Cross-Origin Resource Sharing)
// Configurado para permitir requisições de QUALQUER origem ('*')
// Ao colocar este middleware antes das rotas, ele se aplica a todas elas.
app.use(cors({ origin: '*' }));

// Parsers para o corpo da requisição
// Permite que a aplicação leia JSON e dados de formulário url-encoded
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiter (Limitador de Taxa)
// Limita o número de requisições por IP para evitar ataques de força bruta/DDoS simples
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 100, // Limita cada IP a 100 requisições por janela de 15 minutos
	standardHeaders: true, // Retorna informações de limite nas headers RateLimit-*
	legacyHeaders: false, // Desabilita headers X-RateLimit-*
    message: { status: 'error', message: 'Muitas requisições enviadas deste IP, por favor tente novamente em 15 minutos.' }, // Mensagem customizada
});
// Aplica o limitador a todas as requisições
app.use(limiter);


// --- Definição das Rotas ---

// Rotas da API principal
// Monta as rotas definidas em './routes/index.js' no caminho raiz '/'
app.use('/', apiRoutes);


// --- Tratamento de Erros ---

// Middleware para tratar rotas não encontradas (404)
// Se a requisição chegou até aqui, significa que nenhuma rota definida acima a manipulou.
app.use((req, res, next) => {
  // Encaminha um erro 404 para o próximo middleware de tratamento de erros
  next(new ApiError(404, 'Rota não encontrada.'));
});

// Middleware de tratamento de erros global
// Este middleware captura quaisquer erros que foram passados para next(err)
app.use(errorMiddleware);


// Exporta a instância do aplicativo Express para ser usada em server.js ou index.js
module.exports = app;