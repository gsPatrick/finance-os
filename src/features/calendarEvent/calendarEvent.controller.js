// src/calendarEvent/calendarEvent.controller.js

const { calendarEventService } = require('../../services');
const catchAsync = require('../../modules/helpers/catchAsync.helper');
const ApiError = require('../../modules/errors/apiError');
const { parseISO } = require('date-fns');


/**
 * Controlador para criar um novo evento de calendário.
 * Endpoint: POST /api/v1/calendar-events
 * Requer autenticação.
 */
const createCalendarEvent = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.body já foi validado e limpo (createCalendarEvent schema)
  const eventData = req.body;

   // O service validará o typeId e associará ao usuário
  const newEvent = await calendarEventService.createCalendarEvent(userId, eventData);

  res.status(201).json({ // 201 Created
    status: 'success',
    message: 'Evento de calendário criado com sucesso.',
    data: newEvent,
  });
});

/**
 * Controlador para buscar eventos de calendário do usuário.
 * Endpoint: GET /api/v1/calendar-events
 * Requer autenticação.
 */
const getCalendarEvents = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.query já foi validado e limpo (getCalendarEventsQuery schema)
  const queryParams = req.query;

  // Constrói as opções para o Service a partir dos query params
  const options = {
    limit: queryParams.limit, // Paginação pode não ser usada na view de calendário (buscar todos de um período)
    offset: (queryParams.page - 1) * queryParams.limit, // Pode ser 0 se buscar todos do período
    where: {
        // Filtros específicos mapeados
        ...(queryParams.typeId && { typeId: queryParams.typeId }),

         // Adiciona os parâmetros de data para o service usar na lógica de sobreposição
        ...(queryParams.startDate && { startDate: queryParams.startDate }),
        ...(queryParams.endDate && { endDate: queryParams.endDate }),

         // Adiciona termo de busca ao `where` para que o Service possa processar
        ...(queryParams.search && { search: queryParams.search }),
    },
    // Exemplo de ordenação
     order: queryParams.sortBy ? [[queryParams.sortBy.split(':')[0], queryParams.sortBy.split(':')[1] || 'ASC']] : undefined, // Use o default do service (ordenação por start date)
  };

   // Remove filtros de data vazios
   if (options.where.startDate === undefined) delete options.where.startDate;
   if (options.where.endDate === undefined) delete options.where.endDate;


  const events = await calendarEventService.getCalendarEvents(userId, options);

  // Nota: Para a view de calendário (FullCalendar), geralmente você busca TODOS os eventos
  // de um período (ex: mês atual visível) sem paginação (`limit`/`offset` podem ser removidos ou bem grandes).
  // A paginação é mais útil para uma lista de eventos.
  // Adapte a lógica do controller/service conforme a necessidade da UI.

  res.status(200).json({
    status: 'success',
    results: events.rows.length,
    total: events.count,
    data: events.rows,
  });
});

/**
 * Controlador para buscar um evento de calendário específico pelo ID.
 * Endpoint: GET /api/v1/calendar-events/:calendarEventId
 * Requer autenticação.
 */
const getCalendarEvent = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado (calendarEventIdParam schema)
  const calendarEventId = parseInt(req.params.calendarEventId, 10);

   // TODO: Adicionar opções de include se necessário (o service já inclui type por padrão)
   // const options = { include: [...] };

  const event = await calendarEventService.getCalendarEventById(userId, calendarEventId);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(200).json({
    status: 'success',
    data: event,
  });
});

/**
 * Controlador para atualizar um evento de calendário específico pelo ID.
 * Endpoint: PUT /api/v1/calendar-events/:calendarEventId
 * Requer autenticação.
 */
const updateCalendarEvent = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params e req.body já foram validados e limpos
  const calendarEventId = parseInt(req.params.calendarEventId, 10);
  const updateData = req.body;

  // O service garantirá que o evento pertence ao usuário e validará o typeId
  const updatedEvent = await calendarEventService.updateCalendarEvent(userId, calendarEventId, updateData);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(200).json({ // 200 OK
    status: 'success',
    message: 'Evento de calendário atualizado com sucesso.',
    data: updatedEvent,
  });
});

/**
 * Controlador para deletar um evento de calendário específico pelo ID.
 * Endpoint: DELETE /api/v1/calendar-events/:calendarEventId
 * Requer autenticação.
 */
const deleteCalendarEvent = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado.
  const calendarEventId = parseInt(req.params.calendarEventId, 10);

   // O service garantirá que o evento pertence ao usuário e cuidará da exclusão
  await calendarEventService.deleteCalendarEvent(userId, calendarEventId);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(204).json({ // 204 No Content
    // status: 'success',
    // data: null,
  });
});

module.exports = {
  createCalendarEvent,
  getCalendarEvents,
  getCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
};