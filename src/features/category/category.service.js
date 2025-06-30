// src/category/category.service.js

const db = require('../../models'); // Importa todos os modelos
const { Op } = require('sequelize');
const ApiError = require('../../modules/errors/apiError');

class CategoryService {
  constructor() {
    this.CategoryModel = db.Category;
    this.UserModel = db.User; // Para verificar o usuário (embora authMiddleware já faça)
  }

  /**
   * Cria uma nova categoria para um usuário.
   * Garante que o nome da categoria é único para aquele usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} categoryData - Dados da categoria (name, color, icon).
   * @returns {Promise<Category>} A categoria criada.
   * @throws {ApiError} Se usuário não encontrado ou nome da categoria já existir para o usuário (capturado pelo errorMiddleware).
   */
  async createCategory(userId, categoryData) {
    // categoryData já foi validado pelo Joi.
    const { name, color, icon } = categoryData;

    // A unicidade do nome da categoria por usuário é garantida pelo índice composto no Model.
    // O errorMiddleware capturará SequelizeUniqueConstraintError.
    const category = await this.CategoryModel.create({
      userId: userId, // Associa a categoria ao usuário autenticado
      name: name,
      color: color,
      icon: icon,
    });

    // Retorna a categoria criada
    return category.toJSON();
  }

  /**
   * Busca categorias de um usuário com opções de filtro, paginação e ordenação.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} options - Opções de busca (where, limit, offset, order, etc.).
   * @returns {Promise<{rows: Category[], count: number}>} Lista de categorias e total.
   */
  async getCategories(userId, options = {}) {
    // Adiciona automaticamente o filtro por userId
    const findOptions = {
      ...options,
      where: {
        userId: userId,
        ...options.where, // Combina com outros filtros passados (ex: name, search)
      },
      // Opcional: attributes, include (ex: contar transações nesta categoria?)
    };

     // Mapeia campo de busca de texto (se search ou name estiver nas options.where)
     const searchTerm = findOptions.where.search || findOptions.where.name;
    if (searchTerm) {
         // Remove o termo de busca para não usá-lo no filtro geral `where`
        delete findOptions.where.search;
        delete findOptions.where.name;

         findOptions.where.name = { [Op.iLike]: `%${searchTerm}%` }; // Busca por nome (case-insensitive)
    }


    const result = await this.CategoryModel.findAndCountAll(findOptions);

    return {
      rows: result.rows.map(category => category.toJSON()),
      count: result.count
    };
  }

  /**
   * Busca uma categoria específica pelo ID para um usuário.
   * Garante que o usuário autenticado é o dono da categoria.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} categoryId - O ID da categoria a ser buscada.
   * @param {object} options - Opções de busca adicionais (ex: includes).
   * @returns {Promise<Category>} A categoria encontrada.
   * @throws {ApiError} Se a categoria não for encontrada (404) ou não pertencer ao usuário.
   */
  async getCategoryById(userId, categoryId, options = {}) {
    const category = await this.CategoryModel.findOne({
      where: {
        id: categoryId,
        userId: userId, // Garante que a categoria pertence ao usuário
      },
       ...options, // Combina com outras opções
    });

    if (!category) {
      // Se não encontrou, ou não pertence ao usuário
      throw new ApiError(404, 'Categoria não encontrada.');
    }

    return category.toJSON();
  }

  /**
   * Atualiza uma categoria existente para um usuário.
   * Garante que o usuário autenticado é o dono da categoria.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} categoryId - O ID da categoria a ser atualizada.
   * @param {object} updateData - Dados para atualização (name, color, icon).
   * @returns {Promise<Category>} A categoria atualizada.
   * @throws {ApiError} Se a categoria não for encontrada (404) ou não pertencer ao usuário.
   *                   Erros de unicidade do Sequelize (nome duplicado para o mesmo usuário)
   *                   serão capturados pelo errorMiddleware.
   */
  async updateCategory(userId, categoryId, updateData) {
    // Busca a categoria garantindo que ela pertence ao usuário
    const category = await this.CategoryModel.findOne({
       where: {
         id: categoryId,
         userId: userId,
       }
    });

    if (!category) {
       throw new ApiError(404, 'Categoria não encontrada.');
    }

    // Realiza a atualização. Unicidade de nome por usuário garantida pelo model/middleware.
    await category.update(updateData);

    // Retorna a categoria atualizada
    return category.toJSON();
  }

  /**
   * Deleta uma categoria existente para um usuário.
   * Garante que o usuário autenticado é o dono da categoria.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} categoryId - O ID da categoria a ser deletada.
   * @returns {Promise<void>}
   * @throws {ApiError} Se a categoria não for encontrada (404) ou não pertencer ao usuário.
   *                   Erros de chave estrangeira (se houver transações linkadas e a política não for SET NULL)
   *                   serão capturados pelo errorMiddleware.
   */
  async deleteCategory(userId, categoryId) {
    // Busca a categoria garantindo que ela pertence ao usuário
    const category = await this.CategoryModel.findOne({
       where: {
         id: categoryId,
         userId: userId,
       }
    });

    if (!category) {
      throw new ApiError(404, 'Categoria não encontrada.');
    }

    // O onDelete 'SET NULL' na associação Category -> Transaction cuidará de quebrar o link.
    // Se você quiser proibir a exclusão de categorias com transações, adicione uma verificação aqui.
    // const transactionCount = await category.countTransactions();
    // if (transactionCount > 0) {
    //     throw new ApiError(400, 'Não é possível excluir a categoria porque há transações associadas.');
    // }

    await category.destroy();
  }
}

module.exports = CategoryService; // <<-- DEVE SER ASSIM
