// src/modules/errors/apiError.js

// Importa Boom para criar erros HTTP padronizados
const Boom = require('@hapi/boom');

console.log('[apiError.js] File loaded');


/**
 * Classe customizada para erros de API.
 * Estende o Boom para incluir facilmente status HTTP e mensagens.
 */
class ApiError {
  constructor(statusCode, message) {
    // Logging the creation of an ApiError
    console.log(`[ApiError] Creating new ApiError with status ${statusCode} and message: "${message}"`);

    // Create a standard Error object to get a stack trace
    const error = new Error(message);

    // Create a Boom error based on the standard Error and status code
    const boomError = Boom.boomify(error, { statusCode });

    // Copy properties from the Boom error instance
    Object.assign(this, boomError);

    // Ensure statusCode is a number and message is correct
    this.statusCode = parseInt(this.output.statusCode, 10) || 500;
    this.message = boomError.output.payload.message || 'Erro interno do servidor';
    this.isOperational = true; // Mark as an expected/handled error

    console.log(`[ApiError] ApiError instance created. statusCode: ${this.statusCode}, message: "${this.message}"`);
  }
}

console.log('[apiError.js] Exporting ApiError class');
module.exports = ApiError;