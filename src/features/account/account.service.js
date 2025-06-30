// src/account/account.service.js (MODIFICADO: Aceita parâmetro de transação)

const db = require('../../models');
const { Op } = require('sequelize');
const ApiError = require('../../modules/errors/apiError');

class AccountService {
  constructor() {
    this.AccountModel = db.Account;
    this.UserModel = db.User;
  }

  /**
   * Cria uma nova conta para um usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} accountData - Dados da conta/cartão.
   * @param {object} [t] - Objeto de transação Sequelize (opcional).
   * @returns {Promise<Account>} A conta criada.
   * @throws {ApiError} Se o usuário não for encontrado.
   */
  async createAccount(userId, accountData, t = null) { // <-- ADICIONADO parâmetro 't' com valor padrão null
    const account = await this.AccountModel.create({
      userId: userId,
      ...accountData,
       ...(accountData.type === 'cash' && {
            limit: null,
            closingDay: null,
            dueDay: null,
            brand: null,
            finalDigits: null,
            color: null,
            icon: null,
       })
    }, { transaction: t }); // <-- PASSA O OBJETO DE TRANSAÇÃO AQUI

    return account.toJSON();
  }

  /**
   * Busca contas de um usuário... (restante do serviço não modificado)
   */
  async getAccounts(userId, options = {}) {
    const findOptions = {
      ...options,
      where: {
        userId: userId,
        ...options.where,
      },
    };
    const result = await this.AccountModel.findAndCountAll(findOptions);
    return {
      rows: result.rows.map(account => account.toJSON()),
      count: result.count
    };
  }

  async getAccountById(userId, accountId, options = {}) {
    const account = await this.AccountModel.findOne({
      where: {
        id: accountId,
        userId: userId,
      },
       ...options,
    });
    if (!account) {
      throw new ApiError(404, 'Conta ou cartão não encontrado.');
    }
    return account.toJSON();
  }

  async updateAccount(userId, accountId, updateData) {
    const account = await this.AccountModel.findOne({
       where: {
         id: accountId,
         userId: userId,
       }
    });
    if (!account) {
       throw new ApiError(404, 'Conta ou cartão não encontrado.');
    }
    if (updateData.type === 'cash') {
        updateData.limit = null;
        updateData.closingDay = null;
        updateData.dueDay = null;
        updateData.brand = null;
        updateData.finalDigits = null;
        updateData.color = null;
        updateData.icon = null;
    }
     if (account.type === 'cash' && updateData.type !== 'credit_card') {
          const creditCardFields = ['limit', 'closingDay', 'dueDay', 'brand', 'finalDigits'];
          creditCardFields.forEach(field => {
              if (updateData[field] !== undefined) {
                   throw new ApiError(400, `Campo "${field}" inválido para conta tipo "${account.type}".`);
              }
          });
     }
    await account.update(updateData);
    return account.toJSON();
  }

  async deleteAccount(userId, accountId) {
    const account = await this.AccountModel.findOne({
       where: {
         id: accountId,
         userId: userId,
       }
    });
    if (!account) {
      throw new ApiError(404, 'Conta ou cartão não encontrado.');
    }
    await account.destroy();
  }
}

module.exports = AccountService;