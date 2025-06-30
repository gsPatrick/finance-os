// src/user/user.service.js

const db = require('../../models'); // Importa todos os modelos
const { Op } = require('sequelize'); // Importa operadores Sequelize para consultas complexas
const { hashPassword } = require('../../modules/helpers/password.helper'); // Helper para hashear senha
const ApiError = require('../../modules/errors/apiError'); // Classe de erro customizada

console.log('[user.service.js] File loaded.');

// *** EXPORTAÇÃO CORRETA: Exporta a CLASSE UserService ***
// src/services/index.js importa esta CLASSE e cria a instância.
class UserService {
  constructor() {
    this.UserModel = db.User; // Referência ao modelo User
    console.log('[UserService] Constructor called. UserModel assigned.');
  }

  /**
   * Cria um novo usuário.
   * @param {object} userData - Dados do usuário (username, email, password).
   * @returns {Promise<User>} O usuário criado.
   * @throws {ApiError} Se o email ou username já existirem (capturado pelo middleware).
   */
  async createUser(userData) {
    console.log('[UserService] createUser called with userData:', userData ? { ...userData, password: '***' } : null);
    // A validação com Joi já aconteceu no middleware `validate`.
    console.log('[UserService] createUser: Hashing password');
    const hashedPassword = await hashPassword(userData.password);
    console.log('[UserService] createUser: Password hashed');

    try {
        console.log('[UserService] createUser: Calling UserModel.create');
        const user = await this.UserModel.create({
          username: userData.username,
          email: userData.email,
          password: hashedPassword,
          // TODO: Definir role padrão se aplicável (ex: role: 'user')
           role: 'user', // Assuming default role is 'user'
        });
        console.log('[UserService] createUser: UserModel.create successful. User ID:', user.id);


        // Retorna o usuário, excluindo o campo de senha por segurança
        // user.toJSON() remove getters/setters e métodos, retornando um objeto simples
        const userPlain = user.toJSON();
        delete userPlain.password; // Remove a senha explicitamente do objeto retornado
        console.log('[UserService] createUser: Returning user object (password removed)');
        return userPlain;

    } catch (error) {
        console.error('[UserService] createUser: Error during creation:', error.name, error.message);
        // Rethrow the error or handle specific database errors here if needed before middleware
        throw error; // Let errorMiddleware handle it
    }
  }

  /**
   * Busca múltiplos usuários com opções de filtro, paginação e ordenação.
   * @param {object} options - Opções de busca (ex: { where: { email: '...' }, limit: 10, offset: 0, order: [['createdAt', 'DESC']] }).
   * @returns {Promise<{rows: User[], count: number}>} Lista de usuários e total.
   */
  async getUsers(options = {}) {
    console.log('[UserService] getUsers called with options:', options);

    // Por segurança, evite retornar senhas na lista
    const defaultAttributes = ['id', 'username', 'email', 'role', 'createdAt', 'updatedAt']; // Added 'role'
    const findOptions = {
        ...options,
        attributes: options.attributes || defaultAttributes, // Usa atributos fornecidos ou padrão
        attributes: { exclude: ['password'] } // Garantir que a senha nunca seja incluída
    };
    console.log('[UserService] getUsers: Final findOptions:', findOptions);


    // findAndCountAll é ótimo para paginação, pois retorna tanto a lista quanto o total de resultados sem limite/offset
     try {
        console.log('[UserService] getUsers: Calling UserModel.findAndCountAll');
        const result = await this.UserModel.findAndCountAll(findOptions);
        console.log('[UserService] getUsers: UserModel.findAndCountAll successful. Found', result.count, 'users.');


        console.log('[UserService] getUsers: Formatting results (removing password)');
        return {
            rows: result.rows.map(user => {
                const userPlain = user.toJSON();
                delete userPlain.password; // Remove a senha explicitamente
                return userPlain;
            }),
            count: result.count // Total de usuários (ignorando limit/offset na contagem)
        };
     } catch (error) {
         console.error('[UserService] getUsers: Error during retrieval:', error.name, error.message);
         throw error;
     }
  }

  /**
   * Busca um usuário pelo ID.
   * @param {number} userId - O ID do usuário.
   * @returns {Promise<User>} O usuário encontrado (sem senha).
   * @throws {ApiError} Se o usuário não for encontrado (404).
   */
  async getUserById(userId) {
    console.log('[UserService] getUserById called with userId:', userId);
    try {
        console.log('[UserService] getUserById: Calling UserModel.findByPk');
        const user = await this.UserModel.findByPk(userId, {
            attributes: { exclude: ['password'] } // Exclui a senha
        });
        console.log('[UserService] getUserById: UserModel.findByPk result:', user ? 'Found user ID ' + user.id : 'Not found');

        if (!user) {
            console.log('[UserService] getUserById: User not found, throwing 404 ApiError');
            throw new ApiError(404, 'Usuário não encontrado.'); // Lança erro 404 se não encontrar
        }
        console.log('[UserService] getUserById: Returning user object');
        return user.toJSON(); // Return plain object
    } catch (error) {
        console.error('[UserService] getUserById: Error during retrieval:', error.name, error.message);
         // Check if it's already an ApiError thrown by us, otherwise rethrow
         if (error instanceof ApiError) {
             throw error;
         }
        throw new ApiError(500, 'Erro ao buscar usuário.'); // Generic error for unexpected DB issues
    }
  }

  /**
   * Busca um usuário pelo email.
   * Útil para verificações de unicidade ou processos que não precisam da senha.
   * @param {string} email - O email do usuário.
   * @returns {Promise<User>} O usuário encontrado (sem senha).
   * @throws {ApiError} Se o usuário não for encontrado (404).
   */
  async getUserByEmail(email) {
    console.log('[UserService] getUserByEmail called with email:', email);
    try {
        console.log('[UserService] getUserByEmail: Calling UserModel.findOne');
        const user = await this.UserModel.findOne({
            where: { email },
            attributes: { exclude: ['password'] } // Exclui a senha
        });
         console.log('[UserService] getUserByEmail: UserModel.findOne result:', user ? 'Found user ID ' + user.id : 'Not found');

         if (!user) {
             console.log('[UserService] getUserByEmail: User not found by email, throwing 404 ApiError');
             throw new ApiError(404, 'Usuário com este email não encontrado.'); // Lança erro 404
         }
         console.log('[UserService] getUserByEmail: Returning user object');
        return user.toJSON(); // Return plain object
    } catch (error) {
        console.error('[UserService] getUserByEmail: Error during retrieval:', error.name, error.message);
        if (error instanceof ApiError) {
             throw error;
         }
        throw new ApiError(500, 'Erro ao buscar usuário por email.');
    }
  }


  /**
   * Busca um usuário pelo email E inclui a senha (para processos de login ou redefinição de senha).
   * @param {string} email - O email do usuário.
   * @returns {Promise<User | null>} O objeto Sequelize do usuário encontrado COM a senha, ou null se não encontrado.
   * NOTA: Retorna o objeto Sequelize para que a comparação de senha via `user.comparePassword` (método do modelo) funcione, se existir. Se não, use comparePassword do helper com `user.password`.
   */
   async getUserByEmailWithPassword(email) {
       console.log('[UserService] getUserByEmailWithPassword called with email:', email);
        try {
            console.log('[UserService] getUserByEmailWithPassword: Calling UserModel.findOne including password attribute');
            const user = await this.UserModel.findOne({
               where: { email },
               attributes: { include: ['password', 'id', 'email', 'role'] } // Inclui explicitamente a senha e outros campos essenciais
           });
           console.log('[UserService] getUserByEmailWithPassword: UserModel.findOne result:', user ? 'Found user ID ' + user.id : 'Not found');

           // Não joga 404 aqui intencionalmente, pois a lógica de login deve lidar com o email não existente sem revelar isso.
           console.log('[UserService] getUserByEmailWithPassword: Returning user object (Sequelize instance, possibly null)');
           return user; // Retorna o objeto Sequelize (incluindo password)
        } catch (error) {
             console.error('[UserService] getUserByEmailWithPassword: Error during retrieval:', error.name, error.message);
             throw new ApiError(500, 'Erro ao buscar usuário para login.'); // Generic error for unexpected DB issues
        }
   }


  /**
   * Atualiza um usuário existente.
   * @param {number} userId - O ID do usuário a ser atualizado.
   * @param {object} updateData - Dados para atualização (username, email, password).
   * @returns {Promise<User>} O usuário atualizado (sem senha).
   * @throws {ApiError} Se o usuário não for encontrado (404) ou email/username já existirem (capturado pelo middleware).
   */
  async updateUser(userId, updateData) {
    console.log('[UserService] updateUser called with userId:', userId, 'and updateData:', updateData ? { ...updateData, password: updateData.password ? '***' : undefined } : null);
    try {
        console.log('[UserService] updateUser: Finding user by ID', userId);
        const user = await this.UserModel.findByPk(userId);
        console.log('[UserService] updateUser: User found:', user ? 'Found user ID ' + user.id : 'Not found');

        if (!user) {
          console.log('[UserService] updateUser: User not found, throwing 404 ApiError');
          throw new ApiError(404, 'Usuário não encontrado.');
        }

        // Verifica e hashea a senha SOMENTE se ela estiver presente nos dados de atualização
        if (updateData.password) {
          console.log('[UserService] updateUser: Hashing new password');
          updateData.password = await hashPassword(updateData.password);
           console.log('[UserService] updateUser: New password hashed');
        }

        // A unicidade de email/username é verificada no banco e capturada pelo middleware de erro (SequelizeUniqueConstraintError).
        console.log('[UserService] updateUser: Calling user.update with data:', updateData);
        await user.update(updateData);
        console.log('[UserService] updateUser: user.update successful');


        // Retorna o usuário atualizado, excluindo a senha
        const userPlain = user.toJSON();
        delete userPlain.password;
        console.log('[UserService] updateUser: Returning updated user object (password removed)');
        return userPlain;
    } catch (error) {
        console.error('[UserService] updateUser: Error during update:', error.name, error.message);
        if (error instanceof ApiError) {
             throw error;
         }
        throw error; // Let errorMiddleware handle SequelizeUniqueConstraintError etc.
    }
  }

  /**
   * Deleta um usuário.
   * @param {number} userId - O ID do usuário a ser deletado.
   * @returns {Promise<void>}
   * @throws {ApiError} Se o usuário não for encontrado (404).
   */
  async deleteUser(userId) {
    console.log('[UserService] deleteUser called with userId:', userId);
    try {
        console.log('[UserService] deleteUser: Finding user by ID', userId);
        const user = await this.UserModel.findByPk(userId);
        console.log('[UserService] deleteUser: User found:', user ? 'Found user ID ' + user.id : 'Not found');

        if (!user) {
          console.log('[UserService] deleteUser: User not found, throwing 404 ApiError');
          throw new ApiError(404, 'Usuário não encontrado.');
        }

        // O onDelete 'CASCADE' nas associações do modelo User no index.js cuidará da exclusão em cascata.
        console.log('[UserService] deleteUser: Calling user.destroy');
        await user.destroy();
        console.log('[UserService] deleteUser: user.destroy successful');
        console.log('[UserService] deleteUser: Returning void');

    } catch (error) {
        console.error('[UserService] deleteUser: Error during deletion:', error.name, error.message);
         if (error instanceof ApiError) {
             throw error;
         }
        throw new ApiError(500, 'Erro ao deletar usuário.');
    }
  }
}

console.log('[user.service.js] Exporting UserService class');
// Exporta a CLASSE para que src/services/index.js possa instanciá-la
module.exports = UserService; // <<-- EXPORTA A CLASSE