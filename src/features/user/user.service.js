// src/user/user.service.js

const db = require('../../models'); // Importa todos os modelos
const { Op } = require('sequelize'); // Importa operadores Sequelize para consultas complexas
const { hashPassword } = require('../../modules/helpers/password.helper'); // Removido comparePassword, pois o login não está neste service
const ApiError = require('../../modules/errors/apiError');

class UserService {
  constructor() {
    this.UserModel = db.User; // Referência ao modelo User
  }

  /**
   * Cria um novo usuário.
   * @param {object} userData - Dados do usuário (username, email, password).
   * @returns {Promise<User>} O usuário criado.
   * @throws {ApiError} Se o email ou username já existirem (capturado pelo middleware).
   */
  async createUser(userData) {
    // A validação com Joi já aconteceu no middleware `validate`.
    const hashedPassword = await hashPassword(userData.password);
    const user = await this.UserModel.create({
      username: userData.username,
      email: userData.email,
      password: hashedPassword,
      // TODO: Definir role padrão se aplicável (ex: role: 'user')
    });

    // Retorna o usuário, excluindo o campo de senha por segurança
    // user.toJSON() remove getters/setters e métodos, retornando um objeto simples
    const userPlain = user.toJSON();
    delete userPlain.password; // Remove a senha explicitamente do objeto retornado
    return userPlain;
  }

  /**
   * Busca múltiplos usuários com opções de filtro, paginação e ordenação.
   * @param {object} options - Opções de busca (ex: { where: { email: '...' }, limit: 10, offset: 0, order: [['createdAt', 'DESC']] }).
   * @returns {Promise<{rows: User[], count: number}>} Lista de usuários e total.
   */
  async getUsers(options = {}) {
    // Aplica filtros, ordenação, paginação
    // Exemplo de como options pode ser construído no controller ou em um middleware de query parsing:
    // {
    //   where: {
    //     username: { [Op.iLike]: `%${options.search || ''}%` }, // Exemplo de filtro de busca
    //   },
    //   attributes: ['id', 'username', 'email'], // Seleciona campos específicos
    //   limit: options.limit ? parseInt(options.limit, 10) : 10,
    //   offset: options.offset ? parseInt(options.offset, 10) : 0,
    //   order: options.sortBy ? [[options.sortBy.split(':')[0], options.sortBy.split(':')[1] || 'ASC']] : [['createdAt', 'DESC']],
    //   // include: [{ model: db.SomeOtherModel, as: 'relation' }] // Inclui relações
    // }

    // Por segurança, evite retornar senhas na lista
    const defaultAttributes = ['id', 'username', 'email', 'createdAt', 'updatedAt'];
    const findOptions = {
        ...options,
        attributes: options.attributes || defaultAttributes, // Usa atributos fornecidos ou padrão
        attributes: { exclude: ['password'] } // Garantir que a senha nunca seja incluída
    };

    // findAndCountAll é ótimo para paginação, pois retorna tanto a lista quanto o total de resultados sem limite/offset
    const result = await this.UserModel.findAndCountAll(findOptions);

    return {
        rows: result.rows.map(user => {
            const userPlain = user.toJSON();
            delete userPlain.password; // Remove a senha explicitamente
            return userPlain;
        }),
        count: result.count // Total de usuários (ignorando limit/offset na contagem)
    };
  }

  /**
   * Busca um usuário pelo ID.
   * @param {number} userId - O ID do usuário.
   * @returns {Promise<User>} O usuário encontrado (sem senha).
   * @throws {ApiError} Se o usuário não for encontrado (404).
   */
  async getUserById(userId) {
    const user = await this.UserModel.findByPk(userId, {
        attributes: { exclude: ['password'] } // Exclui a senha
    });
     if (!user) {
         throw new ApiError(404, 'Usuário não encontrado.'); // Lança erro 404 se não encontrar
     }
    return user.toJSON();
  }

  /**
   * Busca um usuário pelo email.
   * Útil para verificações de unicidade ou processos que não precisam da senha.
   * @param {string} email - O email do usuário.
   * @returns {Promise<User>} O usuário encontrado (sem senha).
   * @throws {ApiError} Se o usuário não for encontrado (404).
   */
  async getUserByEmail(email) {
    const user = await this.UserModel.findOne({
        where: { email },
        attributes: { exclude: ['password'] } // Exclui a senha
    });
     if (!user) {
         throw new ApiError(404, 'Usuário com este email não encontrado.'); // Lança erro 404
     }
    return user.toJSON();
  }

  /**
   * Busca um usuário pelo email E inclui a senha (para processos de login ou redefinição de senha).
   * @param {string} email - O email do usuário.
   * @returns {Promise<User | null>} O objeto Sequelize do usuário encontrado COM a senha, ou null se não encontrado.
   * NOTA: Retorna o objeto Sequelize para que a comparação de senha via `user.comparePassword` (método do modelo) funcione, se existir. Se não, use comparePassword do helper com `user.password`.
   */
   async getUserByEmailWithPassword(email) {
       const user = await this.UserModel.findOne({
           where: { email },
           attributes: { include: ['password'] } // Inclui explicitamente a senha
       });
       // Não joga 404 aqui intencionalmente, pois a lógica de login deve lidar com o email não existente sem revelar isso.
       return user; // Retorna o objeto Sequelize
   }


  /**
   * Atualiza um usuário existente.
   * @param {number} userId - O ID do usuário a ser atualizado.
   * @param {object} updateData - Dados para atualização (username, email, password).
   * @returns {Promise<User>} O usuário atualizado (sem senha).
   * @throws {ApiError} Se o usuário não for encontrado (404) ou email/username já existirem (capturado pelo middleware).
   */
  async updateUser(userId, updateData) {
    const user = await this.UserModel.findByPk(userId);
    if (!user) {
      throw new ApiError(404, 'Usuário não encontrado.');
    }

    // Verifica e hashea a senha SOMENTE se ela estiver presente nos dados de atualização
    if (updateData.password) {
      updateData.password = await hashPassword(updateData.password);
    }

    // A unicidade de email/username é verificada no banco e capturada pelo middleware de erro (SequelizeUniqueConstraintError).
    await user.update(updateData);

    // Retorna o usuário atualizado, excluindo a senha
    const userPlain = user.toJSON();
    delete userPlain.password;
    return userPlain;
  }

  /**
   * Deleta um usuário.
   * @param {number} userId - O ID do usuário a ser deletado.
   * @returns {Promise<void>}
   * @throws {ApiError} Se o usuário não for encontrado (404).
   */
  async deleteUser(userId) {
    const user = await this.UserModel.findByPk(userId);
    if (!user) {
      throw new ApiError(404, 'Usuário não encontrado.');
    }

    // O onDelete 'CASCADE' nas associações do modelo User no index.js cuidará da exclusão em cascata.
    await user.destroy();
  }
}

module.exports = UserService; // <<-- Voltar a exportar a CLASSE
