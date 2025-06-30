// src/calendarEventType/calendarEventType.routes.js

const express = require('express');
const calendarEventTypeController = require('./calendarEventType.controller');
const authMiddleware = require('../../modules/auth/auth.middleware'); // Middleware de autenticação
const validate = require('../../modules/validation/validate.middleware'); // Middleware de validação Joi
const eventTypeValidation = require('../../modules/validation/schemas/calendarEventType.validation'); // Esquemas de validação para CalendarEventType

const router = express.Router();

// Aplica o middleware de autenticação a todas as rotas definidas ABAIXO
router.use(authMiddleware);

// --- Rotas que requerem autenticação a partir daqui ---

// POST /api/v1/calendar-event-types
// Cria um novo tipo de evento. Requer autenticação.
// Se os tipos forem globais, adicionar middleware de autorização aqui (ex: checkRole('admin')).
router.post(
  '/',
   // Validação do corpo da requisição. Se os tipos forem por usuário, o userId virá do authMiddleware.
  validate({ body: eventTypeValidation.createCalendarEventType }),
  calendarEventTypeController.createCalendarEventType
);

// GET /api/v1/calendar-event-types
// Busca tipos de evento (do usuário + globais, ou apenas globais). Requer autenticação.
router.get(
  '/',
  validate({ query: eventTypeValidation.getCalendarEventTypesQuery }),
  calendarEventTypeController.getCalendarEventTypes
);

// GET /api/v1/calendar-event-types/:eventTypeId
// Busca um tipo de evento específico. Requer autenticação.
router.get(
  '/:eventTypeId',
  validate({ params: eventTypeValidation.eventTypeIdParam }),
  calendarEventTypeController.getCalendarEventType
);

// PUT /api/v1/calendar-event-types/:eventTypeId
// Atualiza um tipo de evento. Requer autenticação. Só pode atualizar tipos do usuário.
router.put(
  '/:eventTypeId',
  validate({ params: eventTypeValidation.eventTypeIdParam, body: eventTypeValidation.updateCalendarEventType }),
  calendarEventTypeController.updateCalendarEventType
);

// DELETE /api/v1/calendar-event-types/:eventTypeId
// Deleta um tipo de evento. Requer autenticação. Só pode deletar tipos do usuário.
router.delete(
  '/:eventTypeId',
  validate({ params: eventTypeValidation.eventTypeIdParam }),
  calendarEventTypeController.deleteCalendarEventType
);

module.exports = router;