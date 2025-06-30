// src/modules/errors/error.middleware.js

const ApiError = require('./apiError');
const Boom = require('@hapi/boom');

/**
 * Middleware de tratamento centralizado de erros.
 * Captura erros e os formata em respostas HTTP padronizadas.
 */
const errorMiddleware = (err, req, res, next) => {
  let error = err;

  // Verifica se o erro já é um erro operacional (como ApiError ou Boom)
  const isOperationalError = error.isOperational;

  // Se não for um erro operacional, tenta converter
  if (!isOperationalError && !Boom.isBoom(error)) {
     // Ex: erros do Sequelize, erros de programação inesperados
     // Tenta identificar o tipo de erro para dar um status mais apropriado
     if (error.name === 'SequelizeValidationError') {
        // Erros de validação do Sequelize
         error = new ApiError(400, error.message); // Bad Request
     } else if (error.name === 'SequelizeUniqueConstraintError') {
        // Erros de unicidade do Sequelize
         const field = Object.keys(error.fields)[0];
         const value = error.fields[field];
         error = new ApiError(409, `O valor "${value}" já existe para o campo "${field}".`); // Conflict
     } else if (error.name === 'SequelizeForeignKeyConstraintError') {
        // Erros de chave estrangeira
         error = new ApiError(409, `Violação de chave estrangeira. Verifique os dados relacionados.`); // Conflict
     } else if (error.name === 'SequelizeDatabaseError') {
        // Outros erros de banco de dados (mais genérico)
         error = new ApiError(500, 'Erro no banco de dados.'); // Internal Server Error
     } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
         // Erros de JWT
         error = new ApiError(401, 'Token inválido ou expirado.'); // Unauthorized
     } else {
         // Erros genéricos inesperados
         console.error('ERRO INESPERADO:', error); // Loga o erro para depuração
         error = new ApiError(500, 'Ocorreu um erro interno inesperado.'); // Internal Server Error
     }
  }

   // Garante que o erro é um erro Boom ou tem a estrutura similar
   const boomError = Boom.isBoom(error) ? error : Boom.internal(error.message); // Fallback para Internal se não for Boom

   const { statusCode, payload } = boomError.output;

   // Envia a resposta de erro formatada
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: payload.message,
    // Opcional: Adicionar detalhes do erro em ambiente de desenvolvimento
    // stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    // details: error.errors // Para erros de validação do Sequelize, por exemplo
  });
};

module.exports = errorMiddleware;