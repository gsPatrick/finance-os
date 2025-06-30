// src/modules/auth/auth.middleware.js

const ApiError = require('../errors/apiError');
const catchAsync = require('../helpers/catchAsync.helper');
const { verifyToken } = require('./auth.utils');
const db = require('../../models'); // Importa os modelos

/**
 * Middleware para autenticar requisições usando JWT.
 * Extrai o token do header 'Authorization', verifica, e anexa o usuário à requisição (req.user).
 */
const authMiddleware = catchAsync(async (req, res, next) => {
  // 1. Extrai o token
  let token = null;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Formato: "Bearer TOKEN_AQUI"
    token = req.headers.authorization.split(' ')[1];
  }
  // Opcional: Permitir token na query param (ex: para download de arquivos seguros)
  // else if (req.query.token) {
  //     token = req.query.token;
  // }

  // 2. Verifica se o token existe
  if (!token) {
    // 401 Unauthorized - Token não fornecido
    return next(new ApiError(401, 'Você não está logado. Por favor, faça login para ter acesso.'));
  }

  // 3. Verifica o token
  const decodedPayload = verifyToken(token);

  if (!decodedPayload) {
    // 401 Unauthorized - Token inválido ou expirado (verifyToken já lida com a expiração)
     // verifyToken já retorna null em caso de erro/expiração
    return next(new ApiError(401, 'Token inválido ou expirado. Faça login novamente.'));
  }

  // 4. Busca o usuário pelo ID no payload decodificado
  const user = await db.User.findByPk(decodedPayload.id);

  if (!user) {
    // 401 Unauthorized - Usuário do token não existe mais
    return next(new ApiError(401, 'O usuário pertencente a este token não existe mais.'));
  }

  // 5. Anexa o usuário à requisição
  req.user = user; // Agora você pode acessar req.user em seus controllers

  // 6. Continua para o próximo middleware/rota
  next();
});

module.exports = authMiddleware;