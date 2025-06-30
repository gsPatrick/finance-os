// src/models/category.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Category extends Model {
    static associate(models) {
      Category.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      });
      Category.hasMany(models.Transaction, {
        foreignKey: 'categoryId',
        as: 'transactions',
        onDelete: 'SET NULL', // Se a categoria for excluída, não exclui as transações, apenas seta categoryId para NULL
      });
    }
  }
  Category.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      }
      // Nota: Para garantir que o nome seja único por usuário, você pode adicionar um índice composto
      // unique: 'userCategoryUnique' // Exemplo de nome para o índice composto
    },
    // Cor e Ícone podem ser strings (Ex: '#3b82f6' ou nome de ícone)
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
    modelName: 'Category',
    tableName: 'Categories',
    timestamps: true,
     indexes: [
        {
            // Índice composto para garantir nome único por usuário
            unique: true,
            fields: ['userId', 'name'],
        },
    ]
  });
  return Category;
};