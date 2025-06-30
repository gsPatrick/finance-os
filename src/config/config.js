// src/config/config.js

// Carrega dotenv aqui também para garantir que as variáveis estejam disponíveis
// caso este arquivo seja usado isoladamente pelo Sequelize CLI
require('dotenv').config();

module.exports = {
  /**
   * Configuração para o ambiente de Desenvolvimento.
   * Lê as variáveis diretamente do seu arquivo .env.
   */
  development: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false, // Defina como console.log para ver as queries SQL geradas pelo Sequelize
    jwt: {
      secret: process.env.JWT_SECRET,
    },
  },
  
  /**
   * Configuração para o ambiente de Teste.
   * Geralmente usa um banco de dados separado.
   */
  test: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: `${process.env.DB_NAME}_test`, // Ex: finance_os_dev_test
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    jwt: {
      secret: process.env.JWT_SECRET,
    },
  },

  /**
   * Configuração para o ambiente de Produção.
   * As variáveis de ambiente devem ser configuradas diretamente no servidor de produção.
   * Inclui configuração de SSL, que geralmente é necessária em produção.
   */
  production: {
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'postgres',
    logging: false,
    // Opções específicas do dialeto para produção
    dialectOptions: {
      // SSL é geralmente requerido por provedores de banco de dados em nuvem
      ssl: {
        require: true,
        // Em alguns provedores (como Heroku), você pode precisar disto:
        rejectUnauthorized: false
      }
    },
    jwt: {
      secret: process.env.JWT_SECRET, // Essencial que seja forte e venha do ambiente
    },
  },
};