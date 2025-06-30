// src/models/account.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Account extends Model {
    static associate(models) {
      Account.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      Account.hasMany(models.Transaction, {
        foreignKey: 'accountId',
        as: 'transactions',
        onDelete: 'SET NULL', // Se a conta for excluída, não exclui as transações, apenas seta accountId para NULL
      });
      Account.hasMany(models.Invoice, {
        foreignKey: 'accountId',
        as: 'invoices',
        onDelete: 'SET NULL', // Se o cartão for excluído, não exclui as faturas, apenas seta accountId para NULL
      });
    }
  }
  Account.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { // Define a chave estrangeira
        model: 'Users', // Nome da tabela referenciada
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      }
    },
    type: { // 'cash' ou 'credit_card'
      type: DataTypes.ENUM('cash', 'credit_card'),
      allowNull: false,
      defaultValue: 'cash',
    },
    currentBalance: { // Saldo atual (positivo para cash, geralmente negativo para credit_card)
      type: DataTypes.DECIMAL(15, 2), // Precisão para valores monetários
      allowNull: false,
      defaultValue: 0.00,
    },

    // --- Campos específicos para type = 'credit_card' ---
    limit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true, // Permitir NULL para contas tipo 'cash'
    },
    closingDay: { // Dia do mês (1-31)
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 31,
      }
    },
    dueDay: { // Dia do mês (1-31)
      type: DataTypes.INTEGER,
      allowNull: true,
       validate: {
        min: 1,
        max: 31,
      }
    },
    brand: { // Ex: Visa, Mastercard
      type: DataTypes.STRING,
      allowNull: true,
    },
    finalDigits: { // Ex: '4242'
      type: DataTypes.STRING(4), // Apenas 4 dígitos
      allowNull: true,
      validate: {
        len: [4, 4], // Exige exatamente 4 dígitos
         isNumeric: true, // Exige que sejam apenas números
      }
    },
    // Cor e Ícone podem ser strings (Ex: '#f6339a' ou nome de ícone)
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    icon: {
      type: DataTypes.STRING,
      allowNull: true,
    },

  }, {
    sequelize,
    modelName: 'Account',
    tableName: 'Accounts',
    timestamps: true,
    // Índices podem ser adicionados para otimização de queries
    indexes: [
        {
            fields: ['userId'],
        },
        {
             fields: ['type'],
        }
    ]
  });
  return Account;
};