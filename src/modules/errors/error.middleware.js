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
  // Use the original err object for the stack trace
  if (!(err instanceof ApiError) && !Boom.isBoom(err) || process.env.NODE_ENV === 'development') {
      console.error('[error.middleware.js] Error stack:', err.stack);
  }


  let formattedError = err; // Start with the received error

  // If the error is not an ApiError or a Boom error, attempt to convert specific types
  if (!(formattedError instanceof ApiError) && !Boom.isBoom(formattedError)) {
     console.log('[error.middleware.js] Error is not ApiError or Boom, attempting conversion.');
     // Ex: erros do Sequelize, erros de programação inesperados
     // Tenta identificar o tipo de erro para dar um status mais apropriado
     if (formattedError.name === 'SequelizeValidationError') {
        console.log('[error.middleware.js] Converting SequelizeValidationError to ApiError 400');
         formattedError = new ApiError(400, formattedError.message); // Bad Request
     } else if (formattedError.name === 'SequelizeUniqueConstraintError') {
        console.log('[error.middleware.js] Converting SequelizeUniqueConstraintError to ApiError 409');
         const field = Object.keys(formattedError.fields)[0];
         const value = formattedError.fields[field];
         formattedError = new ApiError(409, `O valor "${value}" já existe para o campo "${field}".`); // Conflict
     } else if (formattedError.name === 'SequelizeForeignKeyConstraintError') {
        console.log('[error.middleware.js] Converting SequelizeForeignKeyConstraintError to ApiError 409');
         formattedError = new ApiError(409, `Violação de chave estrangeira. Verifique os dados relacionados.`); // Conflict
     } else if (formattedError.name === 'SequelizeDatabaseError') {
        console.log('[error.middleware.js] Converting generic SequelizeDatabaseError to ApiError 500');
         formattedError = new ApiError(500, 'Erro no banco de dados.'); // Internal Server Error
     } else if (formattedError.name === 'JsonWebTokenError' || formattedError.name === 'TokenExpiredError') {
         console.log('[error.middleware.js] Converting JWT error to ApiError 401');
         formattedError = new ApiError(401, 'Token inválido ou expirado.'); // Unauthorized
     } else {
         console.log('[error.middleware.js] Converting unexpected error to ApiError 500');
         // The stack was already logged above for unexpected errors
         formattedError = new ApiError(500, 'Ocorreu um erro interno inesperado.'); // Internal Server Error
     }
  }

   // At this point, formattedError is either the original ApiError/Boom,
   // or a new ApiError created from a specific known error,
   // or a new generic ApiError(500).
   // We can now extract the status and payload using Boom's structure properties
   // which our ApiError class copies.

   const statusCode = formattedError.statusCode || (formattedError.output ? formattedError.output.statusCode : 500);
   // Ensure we get the message from the boom output payload for consistency
   const message = (formattedError.output && formattedError.output.payload && formattedError.output.payload.message)
                   ? formattedError.output.payload.message
                   : formattedError.message || 'Erro interno do servidor';


   console.log('[error.middleware.js] Final formatted error output:', { statusCode, message });

   // Envia a resposta de erro formatada
  res.status(statusCode).json({
    status: 'error',
    statusCode: statusCode, // Use the determined statusCode
    message: message, // Use the extracted message
    // Opcional: Adicionar detalhes do erro em ambiente de desenvolvimento
    // Use the stack trace from the original err object
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    // details: err.errors // For SequelizeValidationError details if needed (use original err)
  });

  console.error('--- END ERROR HANDLER ---\n');
};

console.log('[error.middleware.js] Exporting errorMiddleware');
module.exports = errorMiddleware;