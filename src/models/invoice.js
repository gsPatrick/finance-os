// src/models/invoice.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Invoice extends Model {
    static associate(models) {
      Invoice.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      Invoice.belongsTo(models.Account, { // O cartão de crédito ao qual a fatura pertence
        foreignKey: 'accountId',
        as: 'creditCard',
      });
       // Uma fatura tem muitas transações (as despesas que a compõem)
       Invoice.hasMany(models.Transaction, {
        foreignKey: 'invoiceId',
        as: 'transactions',
        onDelete: 'SET NULL', // Se a fatura for excluída, não exclui as transações, apenas seta invoiceId para NULL
      });
       // Uma fatura pode ter uma transação de pagamento associada (opcional)
       // Isso pode ser um BelongsTo se o pagamento for uma Transaction no sistema.
       // Invoice.belongsTo(models.Transaction, {
       //    foreignKey: 'paymentTransactionId',
       //    as: 'paymentTransaction',
       //    allowNull: true,
       // });
    }
  }
  Invoice.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    accountId: { // ID do cartão de crédito (Account com type='credit_card')
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Accounts',
        key: 'id',
      },
    },
    month: { // Mês da fatura (1-12)
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 12,
      }
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1900,
      }
    },
     // Total da fatura - Este campo deve ser ATUALIZADO pela lógica que associa/cria transações nesta fatura.
     // Não deve ser atualizado manualmente via PUT, exceto para ajustes finos (com cuidado).
    total: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
       validate: {
         isDecimal: true,
       }
    },
    dueDate: { // Data de vencimento da fatura
        type: DataTypes.DATEONLY,
        allowNull: false,
    },
     closingDate: { // Data de fechamento da fatura
        type: DataTypes.DATEONLY,
        allowNull: false,
     },
     status: { // Estado da fatura: 'open', 'closed', 'paid'
        type: DataTypes.ENUM('open', 'closed', 'paid'),
        allowNull: false,
        defaultValue: 'open',
     },
     // --- Campos para Rastreamento de Pagamento ---
     paidAmount: { // Valor já pago para esta fatura
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.00,
         validate: {
             isDecimal: true,
             min: 0,
         }
     },
     paymentStatus: { // Estado do pagamento: 'unpaid', 'partial', 'paid'
         type: DataTypes.ENUM('unpaid', 'partial', 'paid'),
         allowNull: false,
         defaultValue: 'unpaid',
     },
     // paymentTransactionId: { // ID da transação que efetuou o pagamento total/parcial (opcional)
     //     type: DataTypes.INTEGER,
     //     allowNull: true,
     //     references: {
     //         model: 'Transactions',
     //         key: 'id',
     //     }
     // },

    // TODO: Adicionar campo para PDF da fatura ou link externo se aplicável
    // TODO: Adicionar campo para guardar o período de transações que a fatura cobre (ex: date_from, date_to) para facilitar o fechamento.
  }, {
    sequelize,
    modelName: 'Invoice',
    tableName: 'Invoices',
    timestamps: true,
     // Índice composto para garantir uma fatura única por cartão por mês/ano
     indexes: [
        {
            unique: true,
            fields: ['accountId', 'year', 'month'],
        },
         {
             fields: ['userId'],
         },
         {
             fields: ['accountId'],
         },
          {
             fields: ['dueDate'],
         },
          {
             fields: ['status'],
         },
         {
             fields: ['paymentStatus'],
         }
    ]
  });
  return Invoice;
};