// src/modules/validation/schemas/calendarEventType.validation.js

const Joi = require('joi');

// Esquema base para o ID do tipo de evento nos parâmetros
const eventTypeIdParam = Joi.object({
  eventTypeId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de tipos de evento
const getCalendarEventTypesQuery = Joi.object({
  name: Joi.string().trim().optional(), // Filtrar por nome
  search: Joi.string().trim().optional(), // Buscar por nome (similar)

  // Parâmetros de paginação e ordenação (menos comuns para tipos, mas incluídos para flexibilidade)
  limit: Joi.number().integer().positive().default(10).optional(),
  page: Joi.number().integer().positive().default(1).optional(),
  sortBy: Joi.string().optional(), // Formato esperado: 'campo:direcao' (ex: 'name:asc')
});

// Esquema para criação de tipo de evento (se for global ou por usuário)
const createCalendarEventType = Joi.object({
  name: Joi.string().trim().min(1).max(100).required(),
  color: Joi.string().trim().optional().allow(null, ''), // Cor opcional
  icon: Joi.string().trim().optional().allow(null, ''), // Ícone opcional
   // Se os tipos forem por usuário, adicione userId aqui ou confie no Service/Model
   // userId: Joi.number().integer().positive().optional(),
});

// Esquema para atualização de tipo de evento
const updateCalendarEventType = Joi.object({
  name: Joi.string().trim().min(1).max(100).optional(),
  color: Joi.string().trim().optional().allow(null, ''),
  icon: Joi.string().trim().optional().allow(null, ''),
}).min(1); // Garante que pelo menos um campo esteja presente

module.exports = {
  eventTypeIdParam,
  getCalendarEventTypesQuery,
  createCalendarEventType,
  updateCalendarEventType,
};