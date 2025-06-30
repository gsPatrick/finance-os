// src/models/calendarEventType.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CalendarEventType extends Model {
    static associate(models) {
      // CalendarEventType.belongsTo(models.User, { // Se for global, remova esta associação e o userId
      //   foreignKey: 'userId',
      //   as: 'user',
      // });
      CalendarEventType.hasMany(models.CalendarEvent, {
        foreignKey: 'typeId',
        as: 'calendarEvents',
        onDelete: 'SET NULL', // Se o tipo de evento for excluído, seta typeId para NULL nos eventos
      });
    }
  }
  CalendarEventType.init({
     // userId: { // Removido se o tipo for global
     //   type: DataTypes.INTEGER,
     //   allowNull: true, // Ou false se for global e pré-definido
     //   references: {
     //     model: 'Users',
     //     key: 'id',
     //   },
     // },
    name: { // Ex: 'Reunião', 'Projeto', 'Recorrência', 'Receita', etc.
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Único globalmente se não tiver userId
      validate: {
        notEmpty: true,
      }
    },
     // Cor associada ao tipo para visualização (opcional)
    color: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    icon: { // Nome do ícone associado (opcional)
        type: DataTypes.STRING,
        allowNull: true,
    }
  }, {
    sequelize,
    modelName: 'CalendarEventType',
    tableName: 'CalendarEventTypes',
    timestamps: true,
     // Se tiver userId, adicione um índice composto para nome único por usuário
     // indexes: [
     //    {
     //        unique: true,
     //        fields: ['userId', 'name'],
     //    },
     // ]
  });
  return CalendarEventType;
};