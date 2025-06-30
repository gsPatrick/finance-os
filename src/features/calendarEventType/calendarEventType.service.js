// src/calendarEventType/calendarEventType.service.js

const db = require('../../models'); // Importa todos os modelos
const { Op } = require('sequelize');
const ApiError = require('../../modules/errors/apiError');

class CalendarEventTypeService {
  constructor() {
    this.CalendarEventTypeModel = db.CalendarEventType;
    // Se for por usuário, precisaria do UserModel
    // this.UserModel = db.User;
  }

  /**
   * Cria um novo tipo de evento.
   * Se for global, apenas requer autenticação (admin). Se for por usuário, requer userId.
   * @param {object} eventTypeData - Dados do tipo de evento (name, color, icon, userId - se aplicável).
   * @returns {Promise<CalendarEventType>} O tipo de evento criado.
   * @throws {ApiError} Se o nome já existir (global ou por usuário).
   */
  async createCalendarEventType(eventTypeData) {
    // eventTypeData já foi validado pelo Joi.
    const { name, color, icon /*, userId */ } = eventTypeData;

     // Se for global, a unicidade do nome é garantida pelo Model.
     // Se for por usuário, a unicidade do nome por userId é garantida pelo índice composto no Model.
    const eventType = await this.CalendarEventTypeModel.create({
      name: name,
      color: color,
      icon: icon,
      // userId: userId, // Se for por usuário
    });

    return eventType.toJSON();
  }

  /**
   * Busca tipos de evento.
   * Se for global, qualquer usuário autenticado pode ver (ou até não autenticado, dependendo da regra).
   * Se for por usuário, busca apenas os do usuário autenticado + tipos globais.
   * @param {number | null} userId - O ID do usuário autenticado (null se buscar tipos globais + públicos).
   * @param {object} options - Opções de busca (where, limit, offset, order, etc.).
   * @returns {Promise<{rows: CalendarEventType[], count: number}>} Lista de tipos de evento e total.
   */
  async getCalendarEventTypes(userId = null, options = {}) {
      const findOptions = {
          ...options,
          where: {
              ...options.where, // Combina com outros filtros (ex: name, search)
              // Se for por usuário, adicione filtro:
              // [Op.or]: [{ userId: userId }, { userId: null }] // Tipos do usuário OU globais
          },
           // Ordenação padrão se não especificada
          order: options.order || [['name', 'ASC']],
          // Opcional: attributes
      };

      // Mapeia campo de busca de texto (se search ou name estiver nas options.where)
      const searchTerm = findOptions.where.search || findOptions.where.name;
     if (searchTerm) {
          delete findOptions.where.search;
          delete findOptions.where.name;
          findOptions.where.name = { [Op.iLike]: `%${searchTerm}%` };
     }

    const result = await this.CalendarEventTypeModel.findAndCountAll(findOptions);

    return {
      rows: result.rows.map(eventType => eventType.toJSON()),
      count: result.count
    };
  }

  /**
   * Busca um tipo de evento específico pelo ID.
   * Se for por usuário, garante que pertence ao usuário ou é global.
   * @param {number | null} userId - O ID do usuário autenticado (null se buscar tipo global).
   * @param {number} eventTypeId - O ID do tipo de evento a ser buscado.
   * @param {object} options - Opções de busca adicionais.
   * @returns {Promise<CalendarEventType>} O tipo de evento encontrado.
   * @throws {ApiError} Se não for encontrado (404) ou não pertencer ao usuário (se aplicável).
   */
  async getCalendarEventTypeById(userId = null, eventTypeId, options = {}) {
    const where = {
        id: eventTypeId,
        // Se for por usuário, adicione filtro:
        // [Op.or]: [{ userId: userId }, { userId: null }]
    };

    const eventType = await this.CalendarEventTypeModel.findOne({
      where: where,
       ...options,
    });

    if (!eventType) {
      throw new ApiError(404, 'Tipo de evento não encontrado.');
    }

     // Se for por usuário, verificação adicional se encontrou mas não pertence/não é global
     // if (eventType.userId !== userId && eventType.userId !== null) {
     //     throw new ApiError(403, 'Você não tem permissão para acessar este tipo de evento.');
     // }

    return eventType.toJSON();
  }

  /**
   * Atualiza um tipo de evento existente.
   * Se for por usuário, garante que pertence ao usuário. Não permite atualizar tipos globais.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} eventTypeId - O ID do tipo de evento a ser atualizado.
   * @param {object} updateData - Dados para atualização (name, color, icon).
   * @returns {Promise<CalendarEventType>} O tipo de evento atualizado.
   * @throws {ApiError} Se não for encontrado/pertencer ao usuário, ou tentar atualizar tipo global, ou nome duplicado.
   */
  async updateCalendarEventType(userId, eventTypeId, updateData) {
     // Busca o tipo de evento garantindo que pertence ao usuário (e não é global)
    const eventType = await this.CalendarEventTypeModel.findOne({
       where: {
         id: eventTypeId,
         // Se for por usuário:
         // userId: userId,
         // userId: { [Op.not]: null } // Garantir que não é um tipo global
       }
    });

    if (!eventType) {
       throw new ApiError(404, 'Tipo de evento não encontrado ou não pertence ao seu usuário.');
    }

     // Realiza a atualização. Unicidade de nome garantida pelo model/middleware.
    await eventType.update(updateData);

    // Retorna o tipo de evento atualizado
    return eventType.toJSON();
  }

  /**
   * Deleta um tipo de evento existente.
   * Se for por usuário, garante que pertence ao usuário. Não permite deletar tipos globais.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} eventTypeId - O ID do tipo de evento a ser deletado.
   * @returns {Promise<void>}
   * @throws {ApiError} Se não for encontrado/pertencer ao usuário, ou tentar deletar tipo global.
   */
  async deleteCalendarEventType(userId, eventTypeId) {
     // Busca o tipo de evento garantindo que pertence ao usuário (e não é global)
    const eventType = await this.CalendarEventTypeModel.findOne({
       where: {
         id: eventTypeId,
         // Se for por usuário:
         // userId: userId,
         // userId: { [Op.not]: null } // Garantir que não é um tipo global
       }
    });

    if (!eventType) {
      throw new ApiError(404, 'Tipo de evento não encontrado ou não pertence ao seu usuário.');
    }

    // O onDelete 'SET NULL' na associação CalendarEventType -> CalendarEvent cuidará de quebrar o link.
    await eventType.destroy();
  }

    /**
     * Popula os tipos de evento padrão (se forem globais).
     * Chamado na inicialização ou em um script de setup.
     */
     async ensureDefaultTypesExist() {
        // TODO: Implementar lógica para verificar se os tipos padrão do frontend (financeData.eventTypes)
        // já existem no banco. Se não, criá-los com userId = null.
        // Isso garante que haja tipos básicos disponíveis.
         // Ex: const defaultTypes = Object.values(eventTypesEnumDoFrontend);
         // await Promise.all(defaultTypes.map(async (name) => {
         //    const existing = await this.CalendarEventTypeModel.findOne({ where: { name: name, userId: null } });
         //    if (!existing) {
         //       await this.CalendarEventTypeModel.create({ name: name, userId: null /*, color, icon */ }); // Adicionar cor/ícone se tiver no frontend data
         //    }
         // }));
         console.warn('Funcionalidade de população de tipos de evento padrão pendente.');
     }

}

module.exports = CalendarEventTypeService; // <<-- DEVE SER ASSIM
