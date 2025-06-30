// src/modules/validation/validate.middleware.js (TESTE: DESABILITA stripUnknown)

const Joi = require('joi');
const ApiError = require('../errors/apiError');
const catchAsync = require('../helpers/catchAsync.helper');

console.log('[validate.middleware.js] File loaded');

const validate = (schema) => catchAsync((req, res, next) => {
  console.log('[validate.middleware.js] validate middleware called with schema:', Object.keys(schema));

  const validParts = ['params', 'query', 'body'];
  const validationErrors = [];

  const validationOptions = {
    abortEarly: false,
    allowUnknown: false,
    stripUnknown: false, // <-- TEMPORARIAMENTE PARA DEBUG! REVERTA DEPOIS!
  };
  console.log('[validate.middleware.js] Validation options:', validationOptions);

  validParts.forEach((part) => {
    if (schema[part]) {
      console.log(`[validate.middleware.js] Validating ${part}...`);
      // Log the raw data before validation (be careful with sensitive body data)
      console.log(`[validate.middleware.js] Raw ${part} data:`, req[part]); // LOG O RAW DATA
      const { error, value } = schema[part].validate(req[part], validationOptions);

      if (error) {
        console.log(`[validate.middleware.js] Validation FAILED for ${part}. Errors found:`, error.details.length);
        error.details.forEach(detail => {
            const errorMessage = `${part}.${detail.path.join('.')} :: ${detail.message}`;
            validationErrors.push(errorMessage);
            console.log(`[validate.middleware.js] Validation Error: ${errorMessage}`);
        });
      } else {
         console.log(`[validate.middleware.js] Validation PASSED for ${part}.`);
         // Sobrescreve a parte da requisição com os dados validados.
         // Se stripUnknown: false, `value` será o objeto original + defaults (se houver).
         req[part] = value;
         console.log(`[validate.middleware.js] req.${part} after validation:`, req[part]); // LOG AFTER VALIDATION
      }
    } else {
       console.log(`[validate.middleware.js] No schema provided for ${part}. Skipping.`);
    }
  });

  if (validationErrors.length > 0) {
    console.log('[validate.middleware.js] Total validation errors:', validationErrors.length);
    const errorMessage = `Erros de validação: ${validationErrors.join('; ')}`;
    console.log('[validate.middleware.js] Throwing ApiError 400 with message:', errorMessage);
    return next(new ApiError(400, errorMessage));
  }

  console.log('[validate.middleware.js] All validations passed. Calling next()');
  next();
});

console.log('[validate.middleware.js] Exporting validate middleware');
module.exports = validate;