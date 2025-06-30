// src/modules/auth/checkRole.middleware.js

const ApiError = require('../errors/apiError');
const catchAsync = require('../helpers/catchAsync.helper');

/**
 * Middleware para verificar se o usuário autenticado tem uma das roles permitidas.
 * Este middleware DEVE ser usado APÓS o `authMiddleware`.
 * @param {...string} requiredRoles - Uma lista de roles permitidas (ex: 'admin', 'user').
 */
const checkRole = (...requiredRoles) => catchAsync(async (req, res, next) => {
    // Verifica se req.user foi anexado pelo authMiddleware
    if (!req.user || !req.user.role) {
        // Isso indica um erro de programação - authMiddleware deveria ter sido usado antes.
        throw new ApiError(500, 'Erro de autenticação: usuário não definido na requisição.');
    }

    // Verifica se a role do usuário está na lista de roles permitidas
    if (!requiredRoles.includes(req.user.role)) {
        // Lança um erro 403 Forbidden se o usuário não tiver a permissão necessária
        throw new ApiError(403, 'Você não tem permissão para realizar esta ação.');
    }

    // Se a role for permitida, continua para o próximo middleware/rota
    next();
});

module.exports = checkRole;