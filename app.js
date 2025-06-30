// src/app.js

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit'); // Importa o rateLimit

// Caminhos relativos a partir de 'src/'
const apiRoutes = require('./src/routes/index'); // <-- Corrigido o caminho (era './src/routes/index')
const errorMiddleware = require('./src/modules/errors/error.middleware');
const ApiError = require('./src/modules/errors/apiError');

const app = express();

// Middlewares
app.use(helmet());

// *** CONFIGURAÇÃO TRUST PROXY ***
// É ESSENCIAL para o rate limit funcionar corretamente atrás de um proxy.
// Ajuste o valor '1' conforme o número de proxies confiáveis entre a internet e sua aplicação.
// 'true' é possível, mas gera o warning ERR_ERL_PERMISSIVE_TRUST_PROXY e pode ser inseguro.
app.set('trust proxy', 1); // <-- Adicionado a configuração de volta (valor 1 como sugestão)

app.use(cors({ origin: '*' })); // Permite CORS de qualquer origem (ajustar em produção para domínios específicos)
app.use(express.json()); // Middleware para parsear JSON no body
app.use(express.urlencoded({ extended: true })); // Middleware para parsear URL-encoded no body

// Middleware de Rate Limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutos
	max: 100, // Limite de 100 requisições por IP por windowMs
	standardHeaders: true, // Inclui cabeçalhos RateLimit-* na resposta
	legacyHeaders: false, // Desabilita cabeçalhos X-RateLimit-*
    message: { status: 'error', message: 'Muitas requisições enviadas deste IP, por favor tente novamente em 15 minutos.' }, // Mensagem de erro para o cliente
    // Use store: ... para usar um armazenamento externo como Redis em um ambiente distribuído
});

// Aplica o middleware de rate limit a todas as rotas
app.use(limiter); // <-- O rate limit é aplicado ANTES de definir as rotas


// Rotas da API
// Certifique-se de que './routes/index' aponta corretamente para o arquivo src/routes/index.js
// Parece que em app.js o caminho correto seria './routes' se index.js está dentro de routes.
app.use('/', apiRoutes); // Ou app.use('/api/v1', apiRoutes); dependendo da sua estrutura de URL

// Tratamento de Rotas Não Encontradas (404)
app.use((req, res, next) => {
  next(new ApiError(404, 'Rota não encontrada.'));
});

// Tratamento Centralizado de Erros
// Este middleware captura todos os erros que chegam até ele (incluindo ApiErrors e ValidationErrors do rate limit)
app.use(errorMiddleware);

module.exports = app;