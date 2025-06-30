// src/modules/errors/apiError.js

// Importa Boom para criar erros HTTP padronizados
const Boom = require('@hapi/boom');

/**
 * Classe customizada para erros de API.
 * Estende o Boom para incluir facilmente status HTTP e mensagens.
 */
class ApiError {
  constructor(statusCode, message) {
    // Cria um erro Boom com o status e a mensagem fornecidos
    const boomError = Boom.boomify(new Error(message), { statusCode });
    
    // Copia as propriedades do erro Boom para esta instância
    Object.assign(this, boomError);

    // Garante que o status code seja um número
    this.statusCode = parseInt(this.output.statusCode, 10) || 500;
    this.message = boomError.output.payload.message || 'Erro interno do servidor';
    this.isOperational = true; // Indica que é um erro esperado/tratável
  }
}

module.exports = ApiError;