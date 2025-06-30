// src/modules/errors/error.middleware.js

const ApiError = require('./apiError');
const Boom = require('@hapi/boom');

console.log('[error.middleware.js] File loaded');


/**
 * Middleware de tratamento centralizado de erros.
 * Captura erros e os formata em respostas HTTP padronizadas.
 */
const errorMiddleware = (err, req, res, next) => {
  console.error('\n--- START ERROR HANDLER ---');
  console.error('[error.middleware.js] Received error:', err);
  console.error('[error.middleware.js] Error name:', err.name);
  console.error('[error.middleware.js] Error message:', err.message);
  // Log stack trace only for unexpected errors or in dev
  if (!err.isOperational && !Boom.isBoom(err) || process.env.NODE_ENV === 'development') {
      console.error('[error.middleware.js] Error stack:', err.stack);
  }


  let error = err;

  // Verifica se o erro já é um erro operacional (como ApiError ou Boom)
  const isOperationalError = error.isOperational || Boom.isBoom(error);
  console.log('[error.middleware.js] Is operational error:', isOperationalError);


  // Se não for um erro operacional, tenta converter
  if (!isOperationalError) {
     console.log('[error.middleware.js] Error is not operational, attempting conversion.');
     // Ex: erros do Sequelize, erros de programação inesperados
     // Tenta identificar o tipo de erro para dar um status mais apropriado
     if (error.name === 'SequelizeValidationError') {
        console.log('[error.middleware.js] Converting SequelizeValidationError to ApiError 400');
        // Erros de validação do Sequelize
         error = new ApiError(400, error.message); // Bad Request
     } else if (error.name === 'SequelizeUniqueConstraintError') {
        console.log('[error.middleware.js] Converting SequelizeUniqueConstraintError to ApiError 409');
        // Erros de unicidade do Sequelize
         const field = Object.keys(error.fields)[0];
         const value = error.fields[field];
         error = new ApiError(409, `O valor "${value}" já existe para o campo "${field}".`); // Conflict
     } else if (error.name === 'SequelizeForeignKeyConstraintError') {
        console.log('[error.middleware.js] Converting SequelizeForeignKeyConstraintError to ApiError 409');
        // Erros de chave estrangeira
         error = new ApiError(409, `Violação de chave estrangeira. Verifique os dados relacionados.`); // Conflict
     } else if (error.name === 'SequelizeDatabaseError') {
        console.log('[error.middleware.js] Converting generic SequelizeDatabaseError to ApiError 500');
        // Outros erros de banco de dados (mais genérico)
         error = new ApiError(500, 'Erro no banco de dados.'); // Internal Server Error
     } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
         console.log('[error.middleware.js] Converting JWT error to ApiError 401');
         // Erros de JWT
         error = new ApiError(401, 'Token inválido ou expirado.'); // Unauthorized
     } else {
         console.log('[error.middleware.js] Converting unexpected error to ApiError 500');
         // Erros genéricos inesperados
         // The stack was already logged above for unexpected errors
         error = new ApiError(500, 'Ocorreu um erro interno inesperado.'); // Internal Server Error
     }
  }

   // Garante que o erro é um erro Boom ou tem a estrutura similar
   // Use Boom.wrap for operational errors or our converted errors
   const boomError = Boom.isBoom(error) ? error : (error.isOperational ? Boom.boomify(error, { statusCode: error.statusCode }) : Boom.internal(error.message));

   const { statusCode, payload } = boomError.output;
   console.log('[error.middleware.js] Final error output:', { statusCode, payload });


   // Envia a resposta de erro formatada
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: payload.message,
    // Opcional: Adicionar detalhes do erro em ambiente de desenvolvimento
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined, // Stack trace only in dev
    // details: error.errors // For SequelizeValidationError details if needed
  });

  console.error('--- END ERROR HANDLER ---\n');
};

console.log('[error.middleware.js] Exporting errorMiddleware');
module.exports = errorMiddleware;