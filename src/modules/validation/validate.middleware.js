// src/modules/validation/validate.middleware.js

const Joi = require('joi');
const ApiError = require('../errors/apiError');
const catchAsync = require('../helpers/catchAsync.helper');

console.log('[validate.middleware.js] File loaded');


/**
 * Middleware genérico para validar partes da requisição (body, params, query)
 * contra esquemas Joi.
 * @param {object} schema - Um objeto contendo os esquemas Joi para { body, params, query }.
 */
const validate = (schema) => catchAsync((req, res, next) => {
  console.log('[validate.middleware.js] validate middleware called with schema:', Object.keys(schema));

  // Partes da requisição a serem validadas
  const validParts = ['params', 'query', 'body'];
  const validationErrors = [];

  // Configurações de validação para incluir todos os erros
  const validationOptions = {
    abortEarly: false, // Coleta todos os erros de validação
    allowUnknown: false, // Do NOT allow unknown fields by default for security
    stripUnknown: true, // Remove unknown fields after validation
  };
  console.log('[validate.middleware.js] Validation options:', validationOptions);


  // Itera sobre as partes da requisição e valida contra os esquemas fornecidos
  validParts.forEach((part) => {
    if (schema[part]) {
      console.log(`[validate.middleware.js] Validating ${part}...`);
       // Log the part being validated (be careful with logging sensitive body data)
       // console.log(`[validate.middleware.js] ${part} data:`, req[part]);
      const { error, value } = schema[part].validate(req[part], validationOptions);

      if (error) {
        console.log(`[validate.middleware.js] Validation FAILED for ${part}. Errors found:`, error.details.length);
        // Mapeia os detalhes do erro para uma lista mais amigável
        error.details.forEach(detail => {
            const errorMessage = `${part}.${detail.path.join('.')} :: ${detail.message}`;
            validationErrors.push(errorMessage);
            console.log(`[validate.middleware.js] Validation Error: ${errorMessage}`);
        });
      } else {
         console.log(`[validate.middleware.js] Validation PASSED for ${part}.`);
         // Sobrescreve a parte da requisição com os dados validados e limpos (sem unknown fields)
         req[part] = value;
         // console.log(`[validate.middleware.js] req.${part} updated to:`, req[part]); // Log cleaned data
      }
    } else {
       console.log(`[validate.middleware.js] No schema provided for ${part}. Skipping.`);
    }
  });

  // Se houver erros de validação, chama o next com um ApiError 400
  if (validationErrors.length > 0) {
    console.log('[validate.middleware.js] Total validation errors:', validationErrors.length);
    const errorMessage = `Erros de validação: ${validationErrors.join('; ')}`;
    console.log('[validate.middleware.js] Throwing ApiError 400 with message:', errorMessage);
    return next(new ApiError(400, errorMessage)); // Bad Request
  }

  // Se tudo OK, continua para o próximo middleware/rota
  console.log('[validate.middleware.js] All validations passed. Calling next()');
  next();
});

console.log('[validate.middleware.js] Exporting validate middleware');
module.exports = validate;