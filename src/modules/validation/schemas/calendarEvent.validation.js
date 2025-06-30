// src/modules/validation/schemas/calendarEvent.validation.js

const Joi = require('joi').extend(require('@joi/date')); // Extensão para validação de data mais rica

// Configura o Joi para usar formato ISO 8601 (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ssZ)
Joi.date().format('YYYY-MM-DD').iso();
Joi.date().format('YYYY-MM-DDTHH:mm:ssZ').iso();


// Esquema base para o ID do evento nos parâmetros
const calendarEventIdParam = Joi.object({
  calendarEventId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de eventos
const getCalendarEventsQuery = Joi.object({
  typeId: Joi.number().integer().positive().optional(), // Filtrar por tipo de evento
  search: Joi.string().trim().optional(), // Buscar por título, detalhes

  // Filtrar por range de datas (início do evento)
   // Use Joi.date().iso() para validar strings no formato ISO 8601
  startDate: Joi.date().iso().optional(), // Eventos que começam APÓS ou EM esta data
  endDate: Joi.date().iso().optional(),   // Eventos que terminam ANTES ou EM esta data (ou começam antes/em)
   // Nota: Filtrar por range de datas em eventos com start/end é complexo.
   // O service precisará de lógica para buscar eventos que *se sobrepõem* a um range de datas,
   // não apenas os que *começam* ou *terminam* no range.
   // A validação aqui apenas garante que as datas fornecidas estão no formato correto.


  // Parâmetros de paginação e ordenação
  limit: Joi.number().integer().positive().default(20).optional(), // Ajuste o default se necessário
  page: Joi.number().integer().positive().default(1).optional(),
  sortBy: Joi.string().optional(), // Formato esperado: 'campo:direcao' (ex: 'start:asc', 'title:desc')
});


// Esquema para criação de evento
const createCalendarEvent = Joi.object({
  title: Joi.string().trim().min(1).max(255).required(),
   // Use Joi.date().iso() para validar strings no formato ISO 8601 (com ou sem hora)
  start: Joi.date().iso().required(), // Data/hora de início

  end: Joi.date().iso().min(Joi.ref('start')).optional().allow(null), // Data/hora de fim (opcional, deve ser depois do start)

  isAllDay: Joi.boolean().default(false).optional(), // Dia inteiro?

  typeId: Joi.number().integer().positive().optional().allow(null), // Tipo de evento associado (opcional)

  details: Joi.string().trim().allow('', null).optional(), // Detalhes/Observação (opcional)

  amount: Joi.number().precision(2).min(0).optional().allow(null), // Valor associado (opcional)

  // TODO: Adicionar validação para location se implementado
});

// Esquema para atualização de evento
const updateCalendarEvent = Joi.object({
  title: Joi.string().trim().min(1).max(255).optional(),
  start: Joi.date().iso().optional(),
  end: Joi.date().iso().min(Joi.ref('start')).optional().allow(null), // Opcional, mas valida contra o NOVO start se ele existir
  isAllDay: Joi.boolean().optional(),
  typeId: Joi.number().integer().positive().optional().allow(null),
  details: Joi.string().trim().allow('', null).optional(),
  amount: Joi.number().precision(2).min(0).optional().allow(null),
}).min(1); // Garante que pelo menos um campo esteja presente

module.exports = {
  calendarEventIdParam,
  getCalendarEventsQuery,
  createCalendarEvent,
  updateCalendarEvent,
};