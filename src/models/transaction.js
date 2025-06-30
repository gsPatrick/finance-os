// src/models/transaction.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      Transaction.belongsTo(models.Account, {
        foreignKey: 'accountId',
        as: 'account', // Pode ser uma conta cash ou um cartão de crédito
      });
      Transaction.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category',
      });
       Transaction.belongsTo(models.Invoice, {
        foreignKey: 'invoiceId',
        as: 'invoice', // Opcional, apenas para despesas de cartão
      });
       // Auto-referência para agrupar parcelas/recorrências em uma série
       // Um transaction pode ter um pai (a transação "mestra" ou a primeira parcela)
       Transaction.belongsTo(models.Transaction, {
            foreignKey: 'parentId',
            as: 'parent',
            allowNull: true // Permitir NULL para transações normais e as "mestras"
       });
        // Um transaction "mestra" pode ter muitas "filhas" (parcelas ou ocorrências recorrentes)
       Transaction.hasMany(models.Transaction, {
           foreignKey: 'parentId',
           as: 'children', // Ou 'installments', 'occurrences'
           onDelete: 'SET NULL' // Se o pai for deletado, as filhas perdem o link (ajustar lógica se necessário)
       });
    }
  }
  Transaction.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    accountId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Accounts', // Nome da tabela referenciada
        key: 'id',
      },
    },
    categoryId: { // Categoria da transação (opcional)
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Categories',
        key: 'id',
      },
    },
     invoiceId: { // Para despesas de cartão, linka para a fatura à qual pertence (opcional)
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Invoices',
            key: 'id',
        },
     },
     parentId: { // ID da transação "mestra" ou da primeira parcela/ocorrência na série
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: 'Transactions', // Auto-referência para a própria tabela de transações
            key: 'id',
        },
     },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      }
    },
    amount: { // Valor da transação (para parcelas, é o valor da parcela; para recorrência, é o valor da ocorrência)
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        isDecimal: true,
        min: 0.01,
      }
    },
    type: { // 'income' (receita) ou 'expense' (despesa)
      type: DataTypes.ENUM('income', 'expense'),
      allowNull: false,
    },
    date: { // Data em que a transação ocorreu ou ocorrerá (para futuras/agendadas)
      type: DataTypes.DATEONLY, // Apenas data, sem hora
      allowNull: false,
    },
    status: { // 'pending' (futura/agendada), 'cleared' (efetivada), 'scheduled' (agendada por job, mas ainda não efetivada)
        type: DataTypes.ENUM('pending', 'cleared', 'scheduled'),
        allowNull: false,
        defaultValue: 'pending', // Padrão como pendente até ser efetivada ou agendada
    },

    // --- Campos de Recorrência (preenchidos apenas na transação "mestra" ou regra) ---
    recurring: { // Flag para indicar se esta transação É a regra/mestra de uma recorrência
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    frequency: { // Ex: 'daily', 'weekly', 'monthly', 'annually' (preenchido apenas na mestra)
      type: DataTypes.STRING, // Pode ser um ENUM se as frequências forem fixas
      allowNull: true, // Permitir NULL para transações normais e ocorrências filhas
    },
    recurringStartDate: { // Data de início da recorrência (preenchido apenas na mestra)
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    // TODO: Adicionar campos como 'recurringEndDate' ou 'recurringNumOccurrences', 'recurringEndCondition' (never, after_date, after_occurrences)

    // --- Campos de Parcelamento (preenchidos na primeira transação da série) ---
    installment: { // Flag para indicar se esta transação É a primeira de uma série parcelada
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    installmentCount: { // Número total de parcelas na série (preenchido na primeira)
      type: DataTypes.INTEGER,
      allowNull: true, // Permitir NULL para transações normais e parcelas filhas
      validate: {
        min: 1,
      }
    },
     installmentCurrent: { // Número da parcela atual (preenchido em todas as parcelas da série, 1 de X, 2 de X, ...)
        type: DataTypes.INTEGER,
        allowNull: true, // Permitir NULL para transações normais e a primeira da série (se installmentCount > 1)
        validate: {
            min: 1,
        }
     },
    installmentUnit: { // Unidade das parcelas (Ex: 'Meses', 'Semanas') (preenchido na primeira)
        type: DataTypes.STRING, // Pode ser um ENUM
        allowNull: true, // Permitir NULL para transações normais e parcelas filhas
    },
     // Opcional: Armazenar o valor TOTAL da série parcelada na primeira transação
     // totalInstallmentAmount: DataTypes.DECIMAL(15, 2),


    observation: { // Campo de texto livre para detalhes
      type: DataTypes.TEXT,
      allowNull: true,
    },

    // TODO: Adicionar campos como 'tags', 'attachments', 'location' se necessário

  }, {
    sequelize,
    modelName: 'Transaction',
    tableName: 'Transactions',
    timestamps: true,
    // Índices para otimização
     indexes: [
        {
            fields: ['userId', 'date'],
        },
         {
             fields: ['accountId'],
         },
          {
             fields: ['categoryId'],
         },
          {
             fields: ['invoiceId'],
         },
          {
             fields: ['parentId'], // Índice para buscar séries (filhas de um pai)
         },
          {
             fields: ['type'],
         },
          {
             fields: ['status'],
         },
          {
             fields: ['recurring'],
         },
          {
             fields: ['installment'],
         },
    ]
  });
  return Transaction;
};