// src/modules/validation/validate.middleware.js

const Joi = require('joi');
const ApiError = require('../errors/apiError');
const catchAsync = require('../helpers/catchAsync.helper');

/**
 * Middleware genérico para validar partes da requisição (body, params, query)
 * contra esquemas Joi.
 * @param {object} schema - Um objeto contendo os esquemas Joi para { body, params, query }.
 */
const validate = (schema) => catchAsync((req, res, next) => {
  // Partes da requisição a serem validadas
  const validParts = ['params', 'query', 'body'];
  const validationErrors = [];

  // Configurações de validação para incluir todos os erros
  const validationOptions = {
    abortEarly: false, // Coleta todos os erros de validação
    allowUnknown: true, // Permite campos desconhecidos (remova em produção estrita)
    stripUnknown: true, // Remove campos desconhecidos (útil para evitar poluição no body)
  };

  // Itera sobre as partes da requisição e valida contra os esquemas fornecidos
  validParts.forEach((part) => {
    if (schema[part]) {
      const { error, value } = schema[part].validate(req[part], validationOptions);

      if (error) {
        // Mapeia os detalhes do erro para uma lista mais amigável
        error.details.forEach(detail => {
            validationErrors.push(`${part}.${detail.path.join('.')} :: ${detail.message}`);
        });
      } else {
         // Sobrescreve a parte da requisição com os dados validados e limpos (sem unknown fields)
        req[part] = value;
      }
    }
  });

  // Se houver erros de validação, chama o next com um ApiError 400
  if (validationErrors.length > 0) {
    const errorMessage = `Erros de validação: ${validationErrors.join('; ')}`;
    return next(new ApiError(400, errorMessage)); // Bad Request
  }

  // Se tudo OK, continua para o próximo middleware/rota
  next();
});

module.exports = validate;