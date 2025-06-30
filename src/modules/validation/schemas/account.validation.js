// src/modules/validation/schemas/account.validation.js

const Joi = require('joi');

// Esquema base para o ID da conta nos parâmetros
const accountIdParam = Joi.object({
  accountId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de contas
const getAccountsQuery = Joi.object({
  type: Joi.string().valid('cash', 'credit_card').optional(), // Filtrar por tipo
  search: Joi.string().trim().optional(), // Buscar por nome, marca, final
  // Adicionar outros filtros se necessário (ex: status, currency)

  // Parâmetros de paginação e ordenação genéricos
  limit: Joi.number().integer().positive().default(10).optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  sortBy: Joi.string().optional(), // Formato esperado: 'campo:direcao' (ex: 'name:asc', 'createdAt:desc')
});


// Esquema base para criação/atualização de conta, com campos comuns
const baseAccountSchema = Joi.object({
  name: Joi.string().trim().min(3).max(100).required(),
  type: Joi.string().valid('cash', 'credit_card').required(),
  currentBalance: Joi.number().precision(2).default(0.00).optional(), // Saldo inicial, opcional na criação/atualização
});

// Esquema para criação de conta, estendendo o base e adicionando validações condicionais
const createAccount = baseAccountSchema.keys({
    // Validações condicionais para tipo 'credit_card'
    limit: Joi.number().precision(2).positive().when('type', {
        is: 'credit_card',
        then: Joi.required(), // Requerido se for cartão
        otherwise: Joi.forbidden(), // Proibido se não for cartão
    }),
    closingDay: Joi.number().integer().min(1).max(31).when('type', {
        is: 'credit_card',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
    }),
    dueDay: Joi.number().integer().min(1).max(31).when('type', {
        is: 'credit_card',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
    }),
    brand: Joi.string().trim().max(50).when('type', {
        is: 'credit_card',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
    }),
    finalDigits: Joi.string().length(4).pattern(/^[0-9]+$/).when('type', { // Exige 4 dígitos numéricos
        is: 'credit_card',
        then: Joi.required(),
        otherwise: Joi.forbidden(),
    }),
    color: Joi.string().trim().optional().when('type', { // Cor é opcional para cartão
        is: 'credit_card',
        then: Joi.optional(),
        otherwise: Joi.forbidden(),
    }),
     icon: Joi.string().trim().optional().when('type', { // Ícone é opcional para cartão
        is: 'credit_card',
        then: Joi.optional(),
        otherwise: Joi.forbidden(),
     }),
}).min(3); // Garante que pelo menos 'name', 'type' e um dos campos condicionais (ou currentBalance) estejam presentes

// Esquema para atualização de conta, estendendo o base e permitindo campos opcionais
const updateAccount = baseAccountSchema.keys({
  name: Joi.string().trim().min(3).max(100).optional(), // Opcional na atualização
  type: Joi.string().valid('cash', 'credit_card').optional(), // Opcional na atualização

  // Validações condicionais para tipo 'credit_card', mas campos opcionais na atualização
  limit: Joi.number().precision(2).positive().optional().when('type', {
      is: 'credit_card',
      then: Joi.optional(), // Permitido se type for atualizado para 'credit_card'
      otherwise: Joi.forbidden(), // Proibido se type for atualizado para 'cash'
  }),
  closingDay: Joi.number().integer().min(1).max(31).optional().when('type', {
       is: 'credit_card',
       then: Joi.optional(),
       otherwise: Joi.forbidden(),
  }),
  dueDay: Joi.number().integer().min(1).max(31).optional().when('type', {
        is: 'credit_card',
        then: Joi.optional(),
        otherwise: Joi.forbidden(),
  }),
  brand: Joi.string().trim().max(50).optional().when('type', {
       is: 'credit_card',
       then: Joi.optional(),
       otherwise: Joi.forbidden(),
  }),
  finalDigits: Joi.string().length(4).pattern(/^[0-9]+$/).optional().when('type', {
        is: 'credit_card',
        then: Joi.optional(),
        otherwise: Joi.forbidden(),
  }),
  color: Joi.string().trim().optional(), // Opcional independente do type (para permitir remover cor)
  icon: Joi.string().trim().optional(),  // Opcional independente do type (para permitir remover icone)

  // TODO: Adicionar validação para garantir que, se type for credit_card, pelo menos um dos campos específicos de credit_card esteja presente OU o campo type esteja sendo alterado para credit_card. Isso é complexo com Joi e pode ser mais fácil validar no Service.
  // Exemplo simplificado: Se type for 'credit_card' no body, exigir campos de cartão.
  // Ou confiar na validação do modelo Sequelize após a tentativa de update.

}).min(1); // Garante que pelo menos um campo esteja presente para atualização


module.exports = {
  accountIdParam,
  getAccountsQuery,
  createAccount,
  updateAccount,
};