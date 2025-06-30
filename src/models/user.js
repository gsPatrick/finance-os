// src/models/user.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // Define as associações do usuário com os outros modelos
      User.hasMany(models.Account, {
        foreignKey: 'userId',
        as: 'accounts',
        onDelete: 'CASCADE', // Se um usuário for deletado, suas contas também serão.
      });
      User.hasMany(models.Category, {
        foreignKey: 'userId',
        as: 'categories',
        onDelete: 'CASCADE',
      });
      User.hasMany(models.Transaction, {
        foreignKey: 'userId',
        as: 'transactions',
        onDelete: 'CASCADE',
      });
      // Se você decidir que tipos de evento são por usuário, descomente esta associação
      // User.hasMany(models.CalendarEventType, {
      //   foreignKey: 'userId',
      //   as: 'calendarEventTypes',
      //   onDelete: 'CASCADE',
      // });
      User.hasMany(models.CalendarEvent, {
        foreignKey: 'userId',
        as: 'calendarEvents',
        onDelete: 'CASCADE',
      });
      User.hasMany(models.Investment, {
        foreignKey: 'userId',
        as: 'investments',
        onDelete: 'CASCADE',
      });
      User.hasMany(models.Invoice, {
        foreignKey: 'userId',
        as: 'invoices',
        onDelete: 'CASCADE',
      });
    }
  }
  User.init({
    // Atributos do modelo
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      }
    },
    role: {
        type: DataTypes.ENUM('user', 'admin'),
        allowNull: false,
        defaultValue: 'user',
    },
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    timestamps: true,
  });
  return User;
};