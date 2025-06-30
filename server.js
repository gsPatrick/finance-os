// src/server.js
require('dotenv').config();
const app = require('./app'); // Importa a aplicação Express configurada
const db = require('./src/models'); // Importa a instância do Sequelize e modelos
const scheduler = require('./src/jobs/scheduler'); // Importa o nosso agendador de tarefas

// 3. Lê a porta da aplicação a partir das variáveis de ambiente
const PORT = process.env.PORT || 3000;

/**
 * Função principal assíncrona para iniciar o servidor e serviços associados.
 */
const startServer = async () => {
  try {
    // 1. Autentica a conexão com o banco de dados
    await db.sequelize.authenticate();
    console.log('[DATABASE] Conexão com o banco de dados estabelecida com sucesso.');

    // 2. Sincroniza os modelos com o banco de dados (apenas para DEV)
    // Em produção, as migrações já devem ter sido executadas.
    if (process.env.NODE_ENV === 'development') {
        console.log('[SEQUELIZE] Sincronizando modelos com o banco (apenas DEV)...');
        // 'alter: true' tentará modificar as tabelas existentes para corresponder aos modelos.
        // Use com cuidado, pois pode causar perda de dados em alterações complexas.
        await db.sequelize.sync({ alter: true });
        console.log('[SEQUELIZE] Sincronização de modelos completa.');
    }

    // 3. Inicia o servidor Express para aceitar requisições HTTP
    app.listen(PORT, () => {
      console.log(`[SERVER] Servidor rodando na porta ${PORT} em ambiente '${process.env.NODE_ENV || 'development'}'`);
    });

    // 4. Inicia os jobs agendados (ex: efetivação de transações, fechamento de faturas)
    scheduler.start();

  } catch (error) {
    console.error('[SERVER] Erro fatal ao iniciar o servidor:', error);
    process.exit(1); // Encerra o processo com código de erro
  }
};

// Inicia a aplicação
startServer();

/**
 * Lógica para desligamento gracioso do servidor.
 * Intercepta sinais de término (ex: Ctrl+C) para fechar conexões e jobs.
 */
const shutdown = (signal) => {
    console.log(`[SERVER] Sinal ${signal} recebido. Desligando servidor...`);
    
    // Para todos os jobs agendados
    scheduler.stop();
    
    // Feche o servidor HTTP e a conexão com o banco de dados
    // A lógica de fechamento do servidor e do sequelize pode ser adicionada aqui
    // para garantir que nenhuma requisição ou query seja interrompida no meio.
    
    console.log('[SERVER] Servidor desligado.');
    process.exit(0);
};

// Captura os sinais de término do processo
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));