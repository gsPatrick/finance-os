// src/models/index.js

'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
// Corrija o caminho para o config.js para ser relativo ao arquivo atual
const config = require(path.join(__dirname, '..', 'config', 'config.js'))[env];

const db = {};

let sequelize;
if (config.use_env_variable) {
  sequelize = new Sequelize(process.env[config.use_env_variable], config);
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, config);
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== path.basename(__filename) &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    try {
      // Log para depuração
      console.log(`[MODELS] Tentando carregar modelo: ${file}`);
      
      const modelDefinition = require(path.join(__dirname, file));
      
      // Verifica se o que foi importado é realmente uma função
      if (typeof modelDefinition !== 'function') {
        // Se não for, lança um erro claro
        throw new TypeError(`O arquivo de modelo '${file}' não exporta uma função.`);
      }

      const model = modelDefinition(sequelize, Sequelize.DataTypes);
      db[model.name] = model;

    } catch (e) {
      console.error(`[MODELS] Erro ao carregar o modelo '${file}':`, e.message);
      // Re-lança o erro para parar a aplicação, já que é um erro crítico
      throw e;
    }
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;