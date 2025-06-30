// src/modules/validation/schemas/auth.validation.js

const Joi = require('joi');

/**
 * Esquema para validar o corpo da requisição de login.
 * Garante que ambos 'email' e 'password' sejam fornecidos e estejam no formato correto.
 */
const login = Joi.object({
  // Validação para o campo 'email'
  email: Joi.string()
    .trim() // Remove espaços em branco do início e do fim
    .email({ tlds: { allow: false } }) // Valida se é um formato de email válido (tlds:false é uma opção comum para emails internos/locais)
    .required() // O campo é obrigatório
    .messages({
      'string.base': `"email" deve ser do tipo texto.`,
      'string.empty': `"email" não pode estar vazio.`,
      'string.email': `"email" deve ser um email válido.`,
      'any.required': `"email" é um campo obrigatório.`,
    }),

  // Validação para o campo 'password'
  password: Joi.string()
    .required() // O campo é obrigatório
    .messages({
      'string.base': `"password" deve ser do tipo texto.`,
      'string.empty': `"password" não pode estar vazio.`,
      'any.required': `"password" é um campo obrigatório.`,
    }),
});

// Exporta o esquema para ser usado no middleware de validação
module.exports = {
  login,
};