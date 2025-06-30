// src/investment/investment.service.js

const db = require('../../models'); // Importa todos os modelos
const { Op } = require('sequelize');
const ApiError = require('../../modules/errors/apiError');

class InvestmentService {
  constructor() {
    this.InvestmentModel = db.Investment;
    this.UserModel = db.User; // Para verificar o usuário (embora authMiddleware já faça)
  }

  /**
   * Cria um novo ativo de investimento para um usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} investmentData - Dados do investimento (asset, name, type, quantity, avgPrice, ...).
   * @returns {Promise<Investment>} O investimento criado.
   * @throws {ApiError} Se usuário não encontrado. Erros de validação do Sequelize serão capturados.
   */
  async createInvestment(userId, investmentData) {
    // investmentData já foi validado pelo Joi.
    // TODO: Adicionar validação de unicidade de 'asset' OU 'name' POR USUÁRIO, se necessário.
    // Isso pode ser feito no Model com índice composto ou aqui buscando antes de criar.

    const investment = await this.InvestmentModel.create({
      userId: userId, // Associa o investimento ao usuário autenticado
      ...investmentData,
    });

    return investment.toJSON();
  }

  /**
   * Busca ativos de investimento de um usuário com opções de filtro, paginação e ordenação.
   * Inclui o cálculo do valor total da posição.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} options - Opções de busca (where, limit, offset, order, etc.).
   * @returns {Promise<{rows: Investment[], count: number}>} Lista de investimentos e total.
   */
  async getInvestments(userId, options = {}) {
    // Adiciona automaticamente o filtro por userId
    const findOptions = {
      ...options,
      where: {
        userId: userId,
        ...options.where, // Combina com outros filtros passados (ex: type, search)
      },
      // Opcional: attributes, include
    };

     // Mapeia campo de busca de texto (se search estiver nas options.where)
    if (findOptions.where.search) {
        const searchTerm = findOptions.where.search;
        delete findOptions.where.search;
        findOptions.where[Op.or] = [
            { asset: { [Op.iLike]: `%${searchTerm}%` } }, // Busca por ticker
            { name: { [Op.iLike]: `%${searchTerm}%` } },   // Busca por nome
        ];
    }

     // Se houver ordenação por valor total, pode ser necessário buscar todos os dados
     // e ordenar em memória, ou usar literais SQL complexos. Para simplificar,
     // assumimos que a ordenação é por campos diretos do modelo.
     // Ex: order: [['currentPrice', 'DESC']]

    const result = await this.InvestmentModel.findAndCountAll(findOptions);

     // Adiciona o cálculo do valor total da posição em cada item retornado
    const investmentsWithTotal = result.rows.map(investment => {
        const investmentPlain = investment.toJSON();
         // Calcula o valor total (pode ser null se currentPrice for null)
        investmentPlain.totalValue = (investmentPlain.quantity !== null && investmentPlain.currentPrice !== null)
                                        ? parseFloat(investmentPlain.quantity) * parseFloat(investmentPlain.currentPrice)
                                        : null;
        return investmentPlain;
    });


    return {
      rows: investmentsWithTotal, // Retorna com o totalValue calculado
      count: result.count
    };
  }

  /**
   * Busca um ativo de investimento específico pelo ID para um usuário.
   * Garante que o usuário autenticado é o dono do ativo.
   * Inclui o cálculo do valor total da posição.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} investmentId - O ID do investimento a ser buscado.
   * @param {object} options - Opções de busca adicionais.
   * @returns {Promise<Investment>} O investimento encontrado.
   * @throws {ApiError} Se não for encontrado (404) ou não pertencer ao usuário.
   */
  async getInvestmentById(userId, investmentId, options = {}) {
    const investment = await this.InvestmentModel.findOne({
      where: {
        id: investmentId,
        userId: userId, // Garante que o investimento pertence ao usuário
      },
       ...options, // Combina com outras opções
    });

    if (!investment) {
      throw new ApiError(404, 'Ativo de investimento não encontrado.');
    }

     // Calcula o valor total para o item individual
     const investmentPlain = investment.toJSON();
     investmentPlain.totalValue = (investmentPlain.quantity !== null && investmentPlain.currentPrice !== null)
                                    ? parseFloat(investmentPlain.quantity) * parseFloat(investmentPlain.currentPrice)
                                    : null;

    return investmentPlain;
  }

  /**
   * Atualiza um ativo de investimento existente para um usuário.
   * Garante que o usuário autenticado é o dono do ativo.
   * ATENÇÃO: Atualizar `quantity` ou `avgPrice` manualmente pode ser inconsistente
   * com a lógica de aportes/vendas. Considere endpoints específicos para isso.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} investmentId - O ID do investimento a ser atualizado.
   * @param {object} updateData - Dados para atualização.
   * @returns {Promise<Investment>} O investimento atualizado.
   * @throws {ApiError} Se não for encontrado/pertencer ao usuário.
   */
  async updateInvestment(userId, investmentId, updateData) {
    // Busca o ativo garantindo que pertence ao usuário
    const investment = await this.InvestmentModel.findOne({
       where: {
         id: investmentId,
         userId: userId,
       }
    });

    if (!investment) {
       throw new ApiError(404, 'Ativo de investimento não encontrado.');
    }

     // Realiza a atualização.
    await investment.update(updateData);

    // Retorna o ativo atualizado, incluindo o totalValue recalculado
     const updatedInvestmentPlain = investment.toJSON();
     updatedInvestmentPlain.totalValue = (updatedInvestmentPlain.quantity !== null && updatedInvestmentPlain.currentPrice !== null)
                                    ? parseFloat(updatedInvestmentPlain.quantity) * parseFloat(updatedInvestmentPlain.currentPrice)
                                    : null;

    return updatedInvestmentPlain;
  }

  /**
   * Deleta um ativo de investimento existente para um usuário.
   * Garante que o usuário autenticado é o dono do ativo.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} investmentId - O ID do investimento a ser deletado.
   * @returns {Promise<void>}
   * @throws {ApiError} Se não for encontrado/pertencer ao usuário.
   */
  async deleteInvestment(userId, investmentId) {
    // Busca o ativo garantindo que pertence ao usuário
    const investment = await this.InvestmentModel.findOne({
       where: {
         id: investmentId,
         userId: userId,
       }
    });

    if (!investment) {
      throw new ApiError(404, 'Ativo de investimento não encontrado.');
    }

    // TODO: Se você tiver InvestmentHistory, considere deletar o histórico associado.
    // Ou proibir exclusão se houver histórico?

    await investment.destroy();
  }

    /**
     * Endpoint interno/job: Atualiza preços e variação de ativos rastreados.
     * Busca ativos de determinados tipos (ex: Stocks, Crypto) e usa uma API externa
     * para obter preços e variação diária, atualizando os campos `currentPrice`
     * e `dailyChange`, e possivelmente adicionando ao `history`.
     */
     async updateAssetPrices() {
         // TODO: Implementar lógica para buscar ativos (filtrados por tipo rastreável),
         // chamar APIs externas (Alpha Vantage, CoinGecko, etc.),
         // e atualizar os campos `currentPrice`, `dailyChange`, e `history`.
         console.warn('Funcionalidade de atualização de preços de ativos pendente.');
         throw new ApiError(501, 'Funcionalidade de atualização de preços pendente.');
     }

}

module.exports = InvestmentService; // <<-- DEVE SER ASSIM
