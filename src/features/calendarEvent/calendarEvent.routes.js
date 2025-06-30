// src/calendarEvent/calendarEvent.routes.js

const express = require('express');
const calendarEventController = require('./calendarEvent.controller');
const authMiddleware = require('../../modules/auth/auth.middleware'); // Middleware de autenticação
const validate = require('../../modules/validation/validate.middleware'); // Middleware de validação Joi
const calendarEventValidation = require('../../modules/validation/schemas/calendarEvent.validation'); // Esquemas de validação para CalendarEvent

const router = express.Router();

// Aplica o middleware de autenticação a todas as rotas definidas ABAIXO
router.use(authMiddleware);

// --- Rotas que requerem autenticação a partir daqui ---

// POST /api/v1/calendar-events
// Cria um novo evento para o usuário autenticado.
router.post(
  '/',
  validate({ body: calendarEventValidation.createCalendarEvent }),
  calendarEventController.createCalendarEvent
);

// GET /api/v1/calendar-events
// Busca eventos de calendário do usuário autenticado com filtros, paginação e ordenação.
// Inclui filtros de data para buscar eventos em um período.
router.get(
  '/',
  validate({ query: calendarEventValidation.getCalendarEventsQuery }),
  calendarEventController.getCalendarEvents
);

// GET /api/v1/calendar-events/:calendarEventId
// Busca um evento específico do usuario autenticado pelo ID.
router.get(
  '/:calendarEventId',
  validate({ params: calendarEventValidation.calendarEventIdParam }),
  calendarEventController.getCalendarEvent
);

// PUT /api/v1/calendar-events/:calendarEventId
// Atualiza um evento específico do usuario autenticado pelo ID.
router.put(
  '/:calendarEventId',
  validate({ params: calendarEventValidation.calendarEventIdParam, body: calendarEventValidation.updateCalendarEvent }),
  calendarEventController.updateCalendarEvent
);

// DELETE /api/v1/calendar-events/:calendarEventId
// Deleta um evento específico do usuario autenticado pelo ID.
router.delete(
  '/:calendarEventId',
  validate({ params: calendarEventValidation.calendarEventIdParam }),
  calendarEventController.deleteCalendarEvent
);

module.exports = router;