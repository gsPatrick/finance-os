// src/modules/auth/checkRole.middleware.js

const ApiError = require('../errors/apiError');
const catchAsync = require('../helpers/catchAsync.helper');

console.log('[checkRole.middleware.js] File loaded');


/**
 * Middleware para verificar se o usuário autenticado tem uma das roles permitidas.
 * Este middleware DEVE ser usado APÓS o `authMiddleware`.
 * @param {...string} requiredRoles - Uma lista de roles permitidas (ex: 'admin', 'user').
 */
const checkRole = (...requiredRoles) => catchAsync(async (req, res, next) => {
    console.log('[checkRole.middleware.js] checkRole middleware called with required roles:', requiredRoles);

    // Verifica se req.user foi anexado pelo authMiddleware
    if (!req.user || !req.user.role) {
        console.error('[checkRole.middleware.js] ERROR: req.user or req.user.role is undefined. authMiddleware likely failed or was not used before.');
        // Isso indica um erro de programação - authMiddleware deveria ter sido usado antes.
        throw new ApiError(500, 'Erro de autenticação: usuário não definido na requisição.');
    }
    console.log('[checkRole.middleware.js] Authenticated user role:', req.user.role);


    // Verifica se a role do usuário está na lista de roles permitidas
    if (!requiredRoles.includes(req.user.role)) {
        console.log('[checkRole.middleware.js] User role', req.user.role, 'is not in required roles', requiredRoles, '. Throwing 403 ApiError');
        // Lança um erro 403 Forbidden se o usuário não tiver a permissão necessária
        throw new ApiError(403, 'Você não tem permissão para realizar esta ação.');
    }

    // Se a role for permitida, continua para o próximo middleware/rota
    console.log('[checkRole.middleware.js] Role check passed. Calling next()');
    next();
});

console.log('[checkRole.middleware.js] Exporting checkRole function');
module.exports = checkRole;