// src/modules/validation/schemas/category.validation.js

const Joi = require('joi');

// Esquema base para o ID da categoria nos parâmetros
const categoryIdParam = Joi.object({
  categoryId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de categorias
const getCategoriesQuery = Joi.object({
  name: Joi.string().trim().optional(), // Filtrar por nome
  search: Joi.string().trim().optional(), // Buscar por nome (similar)

  // Parâmetros de paginação e ordenação
  limit: Joi.number().integer().positive().default(10).optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  sortBy: Joi.string().optional(), // Formato esperado: 'campo:direcao' (ex: 'name:asc')
});

// Esquema para criação de categoria
const createCategory = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  color: Joi.string().trim().optional().allow(null, ''), // Cor opcional
  icon: Joi.string().trim().optional().allow(null, ''), // Ícone opcional
});

// Esquema para atualização de categoria
const updateCategory = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(), // Nome opcional na atualização
  color: Joi.string().trim().optional().allow(null, ''),
  icon: Joi.string().trim().optional().allow(null, ''),
}).min(1); // Garante que pelo menos um campo esteja presente

module.exports = {
  categoryIdParam,
  getCategoriesQuery,
  createCategory,
  updateCategory,
};