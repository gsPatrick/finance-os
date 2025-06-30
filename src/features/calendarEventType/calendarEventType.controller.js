// src/calendarEventType/calendarEventType.controller.js

const calendarEventTypeService = require('./calendarEventType.service');
const catchAsync = require('../../modules/helpers/catchAsync.helper');
const ApiError = require('../../modules/errors/apiError');
const { Op } = require('sequelize');


/**
 * Controlador para criar um novo tipo de evento.
 * Endpoint: POST /api/v1/calendar-event-types
 * Requer autenticação. Requer autorização (admin) se os tipos forem globais.
 * Se for por usuário, apenas associa ao usuário autenticado.
 */
const createCalendarEventType = catchAsync(async (req, res) => {
   // TODO: Se os tipos forem globais, adicione lógica de autorização (ex: if (!req.user.isAdmin) throw 403).
   // Se for por usuário, obtenha o userId autenticado: const userId = req.user.id;
   const eventTypeData = req.body; // Já validado.

   // Adiciona o userId aos dados se os tipos forem por usuário
   // eventTypeData.userId = req.user.id;

   const newEventType = await calendarEventTypeService.createCalendarEventType(eventTypeData);

  res.status(201).json({ // 201 Created
    status: 'success',
    message: 'Tipo de evento criado com sucesso.',
    data: newEventType,
  });
});

/**
 * Controlador para buscar tipos de evento.
 * Endpoint: GET /api/v1/calendar-event-types
 * Requer autenticação (se apenas autenticados podem ver).
 * Se for por usuário, busca os do usuário + globais. Se for global, busca todos.
 */
const getCalendarEventTypes = catchAsync(async (req, res) => {
  // Se for por usuário, obtenha o userId: const userId = req.user.id;
   const userId = req.user.id; // Assumindo que buscamos tipos do usuário autenticado + globais

  // req.query já foi validado e limpo (getCalendarEventTypesQuery schema)
  const queryParams = req.query;

  // Constrói as opções para o Service
  const options = {
    limit: queryParams.limit,
    offset: (queryParams.page - 1) * queryParams.limit,
    where: {
        ...(queryParams.name && { name: queryParams.name }),
        ...(queryParams.search && { search: queryParams.search }),
    },
     order: queryParams.sortBy ? [[queryParams.sortBy.split(':')[0], queryParams.sortBy.split(':')[1] || 'ASC']] : undefined,
  };

   // Passa o userId para o service se os tipos forem por usuário
   const eventTypes = await calendarEventTypeService.getCalendarEventTypes(userId, options); // Ou null se buscar apenas globais/públicos

  res.status(200).json({
    status: 'success',
    results: eventTypes.rows.length,
    total: eventTypes.count,
    data: eventTypes.rows,
  });
});

/**
 * Controlador para buscar um tipo de evento específico pelo ID.
 * Endpoint: GET /api/v1/calendar-event-types/:eventTypeId
 * Requer autenticação.
 */
const getCalendarEventType = catchAsync(async (req, res) => {
  // Se for por usuário, obtenha o userId: const userId = req.user.id;
   const userId = req.user.id; // Assumindo que buscamos tipos do usuário autenticado + globais

  // req.params já foi validado (eventTypeIdParam schema)
  const eventTypeId = parseInt(req.params.eventTypeId, 10);

   // Passa o userId para o service se os tipos forem por usuário
  const eventType = await calendarEventTypeService.getCalendarEventTypeById(userId, eventTypeId); // Ou null

  res.status(200).json({
    status: 'success',
    data: eventType,
  });
});

/**
 * Controlador para atualizar um tipo de evento específico pelo ID.
 * Endpoint: PUT /api/v1/calendar-event-types/:eventTypeId
 * Requer autenticação. Só pode atualizar tipos CRIADOS PELO USUÁRIO.
 */
const updateCalendarEventType = catchAsync(async (req, res) => {
  const userId = req.user.id; // Requerido para garantir que o usuário pode atualizar este tipo
  // req.params e req.body já foram validados e limpos
  const eventTypeId = parseInt(req.params.eventTypeId, 10);
  const updateData = req.body;

   // O service garantirá que o tipo pertence ao usuário autenticado E não é um tipo global.
  const updatedEventType = await calendarEventTypeService.updateCalendarEventType(userId, eventTypeId, updateData);

  res.status(200).json({ // 200 OK
    status: 'success',
    message: 'Tipo de evento atualizado com sucesso.',
    data: updatedEventType,
  });
});

/**
 * Controlador para deletar um tipo de evento específico pelo ID.
 * Endpoint: DELETE /api/v1/calendar-event-types/:eventTypeId
 * Requer autenticação. Só pode deletar tipos CRIADOS PELO USUÁRIO.
 */
const deleteCalendarEventType = catchAsync(async (req, res) => {
  const userId = req.user.id; // Requerido para garantir que o usuário pode deletar este tipo
  // req.params já foi validado.
  const eventTypeId = parseInt(req.params.eventTypeId, 10);

   // O service garantirá que o tipo pertence ao usuário autenticado E não é um tipo global.
  await calendarEventTypeService.deleteCalendarEventType(userId, eventTypeId);

  res.status(204).json({ // 204 No Content
    // status: 'success',
    // data: null,
  });
});

module.exports = {
  createCalendarEventType,
  getCalendarEventTypes,
  getCalendarEventType,
  updateCalendarEventType,
  deleteCalendarEventType,
};