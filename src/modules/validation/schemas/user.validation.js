// src/modules/validation/schemas/user.validation.js

const Joi = require('joi');

// Esquema base para o ID do usuário nos parâmetros
const userIdParam = Joi.object({
  userId: Joi.number().integer().positive().required(),
});

// Esquema para criação de usuário (registro)
const createUser = Joi.object({
  username: Joi.string().trim().min(3).max(50).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).required(), // TODO: Adicionar validações de força de senha mais robustas
  // Opcional: adicionar validação para isAdmin se necessário
});

// Esquema para atualização de usuário
const updateUser = Joi.object({
  username: Joi.string().trim().min(3).max(50),
  email: Joi.string().trim().email(),
  password: Joi.string().min(6), // TODO: Adicionar validações de força de senha mais robustas
  // Opcional: adicionar validação para isAdmin se necessário
}).min(1); // Garante que pelo menos um campo esteja presente para atualização

const login = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().required(),
});

module.exports = {
  userIdParam,
  createUser,
  updateUser,
  login
};