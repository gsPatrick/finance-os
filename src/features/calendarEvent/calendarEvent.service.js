// src/calendarEvent/calendarEvent.service.js

const db = require('../../models'); // Importa todos os modelos
const { Op } = require('sequelize');
const ApiError = require('../../modules/errors/apiError');
const { startOfDay, endOfDay, parseISO } = require('date-fns');


class CalendarEventService {
  constructor() {
    this.CalendarEventModel = db.CalendarEvent;
    this.CalendarEventTypeModel = db.CalendarEventType; // Para verificar o tipo
  }

  /**
   * Cria um novo evento de calendário para um usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} eventData - Dados do evento (title, start, end, isAllDay, typeId, details, amount).
   * @returns {Promise<CalendarEvent>} O evento criado.
   * @throws {ApiError} Se typeId for fornecido mas o tipo não existir ou não pertencer ao usuário (se aplicável).
   */
  async createCalendarEvent(userId, eventData) {
    // eventData já foi validado pelo Joi.
    const { typeId, ...otherData } = eventData;

    // 1. Verificar e buscar Tipo de Evento (se fornecido)
    if (typeId) {
        const eventType = await this.CalendarEventTypeModel.findByPk(typeId); // Buscar tipo global ou do usuário?
        // Se os tipos forem por usuário, adicione filtro:
        // const eventType = await this.CalendarEventTypeModel.findOne({
        //    where: { id: typeId, [Op.or]: [{ userId: userId }, { userId: null }] }
        // });
        if (!eventType) {
            throw new ApiError(404, 'Tipo de evento associado não encontrado.');
        }
    }

    // 2. Criar o evento
    const event = await this.CalendarEventModel.create({
      userId: userId, // Associa o evento ao usuário autenticado
      typeId: typeId, // typeId será null se não fornecido
      ...otherData,
    });

    // 3. Retorna o evento criado, incluindo o tipo associado para a resposta da API
     // Pode ser necessário recarregar ou incluir explicitamente para obter a relação
    const createdEventWithRelation = await this.CalendarEventModel.findByPk(event.id, {
        include: [{
             model: db.CalendarEventType,
             as: 'type',
             attributes: ['id', 'name', 'color', 'icon'],
             required: false,
        }]
    });

    return createdEventWithRelation.toJSON();
  }

  /**
   * Busca eventos de calendário de um usuário com opções de filtro, paginação e ordenação.
   * Inclui o Tipo de Evento associado.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} options - Opções de busca (where, limit, offset, order, date range).
   * @returns {Promise<{rows: CalendarEvent[], count: number}>} Lista de eventos e total.
   */
  async getCalendarEvents(userId, options = {}) {
    // Adiciona automaticamente o filtro por userId
    const findOptions = {
      ...options,
      where: {
        userId: userId,
        ...options.where, // Combina com outros filtros passados (ex: typeId, search)
      },
      // Incluir a relação CalendarEventType
      include: [
        {
            model: db.CalendarEventType,
            as: 'type',
            attributes: ['id', 'name', 'color', 'icon'], // Campos relevantes do tipo
            required: false, // Usa LEFT JOIN para incluir eventos sem tipo
        },
      ],
      // Ordenação padrão se não especificada (ex: por data de início crescente)
       order: options.order || [['start', 'ASC'], ['createdAt', 'ASC']],

       // Garante que a senha do usuário nunca seja incluída através da relação `user` se ela for incluída acidentalmente
       attributes: { exclude: ['password'] }
    };

     // Lógica para filtrar eventos que se sobrepõem a um range de datas (startDate, endDate)
     // Isso é complexo e pode precisar de um escopo específico no Model ou lógica manual aqui.
     // A validação Joi apenas garante o formato. A lógica de consulta vai aqui.
     // Exemplo BÁSICO de filtro por start/end date (não cobre sobreposição total):
    if (findOptions.where.startDate || findOptions.where.endDate) {
        const { startDate, endDate } = findOptions.where;
        delete findOptions.where.startDate;
        delete findOptions.where.endDate;

         // Busca eventos que começam APÓS ou EM startDate E terminam ANTES ou EM endDate
         // OU eventos de dia inteiro que se sobrepõem
         findOptions.where[Op.and] = [
             { start: { ...(startDate && { [Op.gte]: parseISO(startDate) }) } },
             // A lógica de filtro por data final é mais complexa para sobreposição
             // Para sobreposição simples com end date:
             // Eventos cujo INÍCIO é <= endDate
             // E Eventos cujo FIM é >= startDate (ou são all day e >= startDate)
             // Simplifying for now: Search events that start between startDate and endDate or overlap significantly
             // A query real para sobreposição é: (Event.start <= range.end AND Event.end >= range.start) OR (Event.isAllDay AND Event.start <= range.end AND Event.start >= range.start)
             // Vamos simplificar para buscar eventos que começam ou terminam *dentro* do range, ou cujo range *contém* o período.
             // Consulta Completa de Sobreposição:
             // WHERE
             //  (
             //     ("start" < @endDate AND "end" > @startDate) OR  -- Evento se sobrepõe
             //     ("isAllDay" = TRUE AND "start" <= @endDate AND "start" >= @startDate) -- Evento dia inteiro que começa no range
             //  )
             //  AND "userId" = @userId

             // Exemplo de filtro mais simples, buscando eventos cujo START está no range (mais comum para visualização mensal)
             ...(endDate && { start: { [Op.lte]: parseISO(endDate) } }), // Eventos que começam até a data final
         ];
          // Adiciona o filtro de data de início se presente
         if (startDate) {
              findOptions.where[Op.and].push({ start: { [Op.gte]: parseISO(startDate) } });
         }

          // Remove o filtro de data se o [Op.and] resultante estiver vazio ou sem condições de data
         if (findOptions.where[Op.and].length === 0) {
             delete findOptions.where[Op.and];
         } else {
              // Remove Op.and se ele só contém uma condição (simplifica a query SQL)
              if (findOptions.where[Op.and].length === 1) {
                  const condition = findOptions.where[Op.and][0];
                  delete findOptions.where[Op.and];
                  Object.assign(findOptions.where, condition); // Move a condição para o where principal
              }
         }
    }


     // Mapeia campo de busca de texto (se search estiver nas options.where)
    if (findOptions.where.search) {
        const searchTerm = findOptions.where.search;
        delete findOptions.where.search;
        findOptions.where[Op.or] = [
            { title: { [Op.iLike]: `%${searchTerm}%` } },
            { details: { [Op.iLike]: `%${searchTerm}%` } },
             // Buscar no nome do tipo de evento (requer include do tipo)
            { '$type.name$': { [Op.iLike]: `%${searchTerm}%` } },
        ];
    }


    const result = await this.CalendarEventModel.findAndCountAll(findOptions);

    return {
      rows: result.rows.map(event => event.toJSON()),
      count: result.count
    };
  }

  /**
   * Busca um evento de calendário específico pelo ID para um usuário.
   * Garante que o usuário autenticado é o dono do evento.
   * Inclui o Tipo de Evento associado.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} calendarEventId - O ID do evento a ser buscado.
   * @param {object} options - Opções de busca adicionais (ex: includes).
   * @returns {Promise<CalendarEvent>} O evento encontrado.
   * @throws {ApiError} Se o evento não for encontrado (404) ou não pertencer ao usuário.
   */
  async getCalendarEventById(userId, calendarEventId, options = {}) {
    const event = await this.CalendarEventModel.findOne({
      where: {
        id: calendarEventId,
        userId: userId, // Garante que o evento pertence ao usuário
      },
       include: [ // Inclui sempre a relação essencial
         {
             model: db.CalendarEventType,
             as: 'type',
             attributes: ['id', 'name', 'color', 'icon'],
             required: false,
         },
       ],
       ...options, // Combina com outras opções passadas
    });

    if (!event) {
      throw new ApiError(404, 'Evento de calendário não encontrado.');
    }

    return event.toJSON();
  }

  /**
   * Atualiza um evento de calendário existente para um usuário.
   * Garante que o usuário autenticado é o dono do evento.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} calendarEventId - O ID do evento a ser atualizado.
   * @param {object} updateData - Dados para atualização.
   * @returns {Promise<CalendarEvent>} O evento atualizado.
   * @throws {ApiError} Se o evento não for encontrado (404) ou não pertencer ao usuário.
   */
  async updateCalendarEvent(userId, calendarEventId, updateData) {
    // Busca o evento garantindo que pertence ao usuário
    const event = await this.CalendarEventModel.findOne({
       where: {
         id: calendarEventId,
         userId: userId,
       }
    });

    if (!event) {
       throw new ApiError(404, 'Evento de calendário não encontrado.');
    }

    // Realiza a atualização.
    await event.update(updateData);

     // Retorna o evento atualizado, incluindo o tipo associado
     const updatedEventWithRelation = await this.CalendarEventModel.findByPk(event.id, {
        include: [{
             model: db.CalendarEventType,
             as: 'type',
             attributes: ['id', 'name', 'color', 'icon'],
             required: false,
        }]
     });

    return updatedEventWithRelation.toJSON();
  }

  /**
   * Deleta um evento de calendário existente para um usuário.
   * Garante que o usuário autenticado é o dono do evento.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} calendarEventId - O ID do evento a ser deletado.
   * @returns {Promise<void>}
   * @throws {ApiError} Se o evento não for encontrado (404) ou não pertencer ao usuário.
   */
  async deleteCalendarEvent(userId, calendarEventId) {
    // Busca o evento garantindo que pertence ao usuário
    const event = await this.CalendarEventModel.findOne({
       where: {
         id: calendarEventId,
         userId: userId,
       }
    });

    if (!event) {
      throw new ApiError(404, 'Evento de calendário não encontrado.');
    }

    await event.destroy();
  }
}

module.exports = CalendarEventService; // <<-- DEVE SER ASSIM
