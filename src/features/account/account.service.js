// src/account/account.service.js

const db = require('../../models'); // Importa todos os modelos
const { Op } = require('sequelize');
const ApiError = require('../../modules/errors/apiError');

class AccountService {
  constructor() {
    this.AccountModel = db.Account; // Referência ao modelo Account
    this.UserModel = db.User; // Pode precisar referenciar o modelo User para includes
  }

  /**
   * Cria uma nova conta para um usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} accountData - Dados da conta/cartão (name, type, currentBalance, + campos de credit_card).
   * @returns {Promise<Account>} A conta criada.
   * @throws {ApiError} Se o usuário não for encontrado (embora o middleware de auth já garanta que req.user exista).
   *                   Erros de validação/unicidade do Sequelize serão capturados pelo errorMiddleware.
   */
  async createAccount(userId, accountData) {
    // accountData já foi validado pelo Joi.

    // O Sequelize model fará a validação final e garantirá a associação com o user.
    const account = await this.AccountModel.create({
      userId: userId, // Associa a conta ao usuário autenticado
      ...accountData,
       // Garantir que campos de credit_card sejam nulos para type 'cash'
       ...(accountData.type === 'cash' && {
            limit: null,
            closingDay: null,
            dueDay: null,
            brand: null,
            finalDigits: null,
            color: null,
            icon: null,
       })
    });

    // Retorna a conta criada
    return account.toJSON();
  }

  /**
   * Busca contas de um usuário com opções de filtro, paginação e ordenação.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} options - Opções de busca (where, limit, offset, order, etc.).
   * @returns {Promise<{rows: Account[], count: number}>} Lista de contas e total.
   */
  async getAccounts(userId, options = {}) {
    // Adiciona automaticamente o filtro por userId para garantir que o usuário só veja suas próprias contas.
    const findOptions = {
      ...options,
      where: {
        userId: userId,
        ...options.where, // Combina com outros filtros passados
      },
      // Opcional: Incluir relações, como transações (com paginação nas transações se houver muitas)
      // include: [
      //   {
      //     model: db.Transaction,
      //     as: 'transactions',
      //     limit: 5, // Exemplo: Limitar transações incluídas por conta
      //     order: [['date', 'DESC']],
      //   }
      // ]
    };

    const result = await this.AccountModel.findAndCountAll(findOptions);

    return {
      rows: result.rows.map(account => account.toJSON()),
      count: result.count
    };
  }

  /**
   * Busca uma conta específica pelo ID para um usuário.
   * Garante que o usuário autenticado é o dono da conta.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} accountId - O ID da conta a ser buscada.
   * @param {object} options - Opções de busca adicionais (ex: includes).
   * @returns {Promise<Account>} A conta encontrada.
   * @throws {ApiError} Se a conta não for encontrada (404) ou não pertencer ao usuário (403).
   */
  async getAccountById(userId, accountId, options = {}) {
    const account = await this.AccountModel.findOne({
      where: {
        id: accountId,
        userId: userId, // Garante que a conta pertence ao usuário
      },
       ...options, // Combina com outras opções (ex: includes)
    });

    if (!account) {
      // Se não encontrou, ou não pertence ao usuário
      throw new ApiError(404, 'Conta ou cartão não encontrado.');
      // TODO: Para maior segurança, não diferenciar 404 e 403 aqui, apenas 404.
      // Uma resposta de 403 informaria a existência da conta para outro usuário.
      // throw new ApiError(403, 'Você não tem permissão para acessar esta conta ou ela não existe.'); // Alternativa mais segura
    }

    return account.toJSON();
  }

  /**
   * Atualiza uma conta existente para um usuário.
   * Garante que o usuário autenticado é o dono da conta.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} accountId - O ID da conta a ser atualizada.
   * @param {object} updateData - Dados para atualização.
   * @returns {Promise<Account>} A conta atualizada.
   * @throws {ApiError} Se a conta não for encontrada (404) ou não pertencer ao usuário (403).
   *                   Erros de validação/unicidade do Sequelize serão capturados pelo errorMiddleware.
   */
  async updateAccount(userId, accountId, updateData) {
    // Busca a conta garantindo que ela pertence ao usuário
    const account = await this.AccountModel.findOne({
       where: {
         id: accountId,
         userId: userId,
       }
    });

    if (!account) {
       throw new ApiError(404, 'Conta ou cartão não encontrado.');
    }

    // O Joi validou a estrutura, mas precisamos de validações adicionais aqui
    // se o tipo for alterado para 'cash' ou 'credit_card'.
    // Se o type for atualizado para 'cash', garante que os campos de credit_card sejam removidos.
    if (updateData.type === 'cash') {
        updateData.limit = null;
        updateData.closingDay = null;
        updateData.dueDay = null;
        updateData.brand = null;
        updateData.finalDigits = null;
        // color/icon podem ser mantidos se for genérico, ou setar para null também
        updateData.color = null;
        updateData.icon = null;
    }
     // Se o type for atualizado para 'credit_card', o Joi já garantiu que os campos obrigatórios estejam presentes.
     // Se o type não for atualizado, mas updateData contém campos de 'credit_card' para uma conta 'cash',
     // o Sequelize Model Validation (se bem configurado) ou o Joi `forbidden()` deveria impedir.
     // Se o Joi `forbidden()` não for suficiente (ex: no update é complexo), pode adicionar validação aqui:
     if (account.type === 'cash' && updateData.type !== 'credit_card') { // Se era cash e não está virando credit_card
          const creditCardFields = ['limit', 'closingDay', 'dueDay', 'brand', 'finalDigits'];
          creditCardFields.forEach(field => {
              if (updateData[field] !== undefined) {
                  // Lançar erro se tentar adicionar campos de cartão a uma conta cash sem mudar o tipo
                   throw new ApiError(400, `Campo "${field}" inválido para conta tipo "${account.type}".`);
              }
          });
     }


    // Realiza a atualização. Erros de validação do Sequelize (ex: campos nulos obrigatórios)
    // serão capturados pelo errorMiddleware.
    await account.update(updateData);

    // Retorna a conta atualizada
    return account.toJSON();
  }

  /**
   * Deleta uma conta existente para um usuário.
   * Garante que o usuário autenticado é o dono da conta.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} accountId - O ID da conta a ser deletada.
   * @returns {Promise<void>}
   * @throws {ApiError} Se a conta não for encontrada (404) ou não pertencer ao usuário (403).
   *                   Erros de chave estrangeira (se houver transações linkadas e a política não for SET NULL/CASCADE)
   *                   serão capturados pelo errorMiddleware.
   */
  async deleteAccount(userId, accountId) {
    // Busca a conta garantindo que ela pertence ao usuário
    const account = await this.AccountModel.findOne({
       where: {
         id: accountId,
         userId: userId,
       }
    });

    if (!account) {
      throw new ApiError(404, 'Conta ou cartão não encontrado.');
    }

    // O onDelete 'SET NULL' nas associações de Transaction e Invoice cuidará da quebra do link.
    // Se você quiser proibir a exclusão de contas com transações, adicione uma verificação aqui antes de destroy().
    // const transactionCount = await account.countTransactions();
    // if (transactionCount > 0) {
    //     throw new ApiError(400, 'Não é possível excluir a conta porque há transações associadas.');
    // }

    await account.destroy();
  }
}

module.exports = new AccountService(); // Exporta uma instância da classe