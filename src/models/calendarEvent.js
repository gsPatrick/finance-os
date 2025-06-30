// src/models/calendarEvent.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CalendarEvent extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define association here
      CalendarEvent.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      CalendarEvent.belongsTo(models.CalendarEventType, {
        foreignKey: 'typeId',
        as: 'type',
      });
    }
  }
  CalendarEvent.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    typeId: { // Linka para CalendarEventType
      type: DataTypes.INTEGER,
      allowNull: true, // Permitir eventos sem tipo específico, se necessário
      references: {
        model: 'CalendarEventTypes',
        key: 'id',
      },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      }
    },
    start: { // Data/hora de início
      type: DataTypes.DATE, // Use DataTypes.DATE para incluir hora, DataTypes.DATEONLY para apenas data
      allowNull: false,
    },
    end: { // Data/hora de fim (opcional)
      type: DataTypes.DATE,
      allowNull: true,
    },
    isAllDay: { // Flag para eventos de dia inteiro
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    },
    details: { // Detalhes/Observação do evento
      type: DataTypes.TEXT,
      allowNull: true,
    },
    amount: { // Valor associado ao evento (opcional, para eventos financeiros)
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        isDecimal: true,
        min: 0,
      }
    },
    // TODO: Adicionar campos como location se necessário
  }, {
    sequelize,
    modelName: 'CalendarEvent',
    tableName: 'CalendarEvents',
    timestamps: true,
     indexes: [
        {
            fields: ['userId', 'start'], // Consultas por usuário e data são comuns
        },
         {
             fields: ['typeId'],
         }
    ]
  });
  return CalendarEvent;
};