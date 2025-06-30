// src/models/investment.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Investment extends Model {
    static associate(models) {
      Investment.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      // Pode adicionar associações para InvestmentHistory se decidir normalizar
      // Investment.hasMany(models.InvestmentHistory, { ... });
    }
  }
  Investment.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    asset: { // Ticker ou identificador (ex: 'ITSA4', 'BTC', 'IMOVEL-SP')
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      }
    },
    name: { // Nome completo (ex: 'Itaúsa', 'Bitcoin', 'Apartamento Av. Paulista')
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      }
    },
    type: { // 'Stock', 'Crypto', 'Bond', 'Real Estate', 'Custom', etc.
      type: DataTypes.STRING, // Use String para flexibilidade, ou ENUM se fixo
      allowNull: false,
    },
    quantity: { // Quantidade do ativo (pode ser fracionado)
      type: DataTypes.DECIMAL(20, 8), // Precisão para criptos/ações fracionadas
      allowNull: false,
      defaultValue: 0,
      validate: {
        isDecimal: true,
        min: 0,
      }
    },
    avgPrice: { // Preço médio de compra por unidade
      type: DataTypes.DECIMAL(15, 4), // Precisão para preços
      allowNull: false,
      defaultValue: 0,
      validate: {
        isDecimal: true,
        min: 0,
      }
    },
    currentPrice: { // Preço atual por unidade (pode ser nulo se não atualizado)
      type: DataTypes.DECIMAL(15, 4),
      allowNull: true, // Pode ser nulo se os dados vêm de API externa e falham, ou não se aplica (ex: imóvel)
      validate: {
        isDecimal: true,
        min: 0,
      }
    },
    dailyChange: { // Variação percentual diária (ex: 1.2 para +1.2%, -2.5 para -2.5%)
        type: DataTypes.DECIMAL(5, 2), // % com 2 casas decimais
        allowNull: true, // Pode ser nulo
        validate: {
            isDecimal: true,
        }
    },
     // Histórico de preços - JSONB para simplicidade inicial
     // CUIDADO: Consultar dentro de JSONB pode ser menos performático que uma tabela relacional
     // Alternativa: Criar modelo InvestmentHistory { investmentId, date, price }
    history: {
        type: DataTypes.JSONB, // Armazena arrays ou objetos JSON
        allowNull: true, // Pode ser nulo se não houver histórico
        defaultValue: [], // Valor padrão como array vazio
    },

    // TODO: Adicionar campos como 'currency', 'exchange', 'broker', etc.

  }, {
    sequelize,
    modelName: 'Investment',
    tableName: 'Investments',
    timestamps: true,
     indexes: [
        {
            fields: ['userId', 'type'],
        },
         {
             fields: ['userId', 'asset'],
         },
    ]
  });
  return Investment;
};