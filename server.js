// src/server.js
require('dotenv').config(); // Carrega variáveis de ambiente do .env
const app = require('./app'); // Importa a aplicação Express configurada (src/app.js)
const db = require('./src/models'); // Importa a instância do Sequelize e modelos (src/models/index.js)
const scheduler = require('./src/jobs/scheduler'); // Importa o nosso agendador de tarefas (src/jobs/scheduler.js)
const PORT = process.env.PORT || 82; // Usei 82 conforme seu log anterior, ajuste se necessário

/**
 * Função principal assíncrona para iniciar o servidor e serviços associados.
 */
const startServer = async () => {
  try {
    // 1. Autentica a conexão com o banco de dados
    await db.sequelize.authenticate();
    console.log('[DATABASE] Conexão com o banco de dados estabelecida com sucesso.');

    // 2. Sincroniza os modelos com o banco de dados (apenas para DEV)
    // Em produção, as migrações já devem ter sido executadas (por exemplo, usando o comando 'sequelize db:migrate').
    // 'alter: true' tentará modificar as tabelas existentes para corresponder aos modelos.
    // Use com cuidado em ambientes que não sejam de desenvolvimento, pois pode causar perda de dados em alterações complexas.
    if (process.env.NODE_ENV === 'development') {
        console.log('[SEQUELIZE] Sincronizando modelos com o banco (apenas DEV)...');
        await db.sequelize.sync({ alter: true });
        console.log('[SEQUELIZE] Sincronização de modelos completa.');
    }

    // 3. Inicia os jobs agendados (ex: efetivação de transações, fechamento de faturas)
    // O agendador pode depender dos modelos estarem sincronizados.
    console.log('Iniciando agendador de tarefas...'); // Log antes de iniciar o scheduler
    scheduler.start();
    // *** LINHA QUE CAUSAVA O TypeError FOI REMOVIDA AQUI ***
    // console.log(`Agendador de tarefas iniciado com ${scheduler.getJobs().length} job(s).`);
    console.log('Agendador de tarefas iniciado.');


    // 4. Inicia o servidor Express para aceitar requisições HTTP
    const server = app.listen(PORT, () => {
      console.log(`[SERVER] Servidor rodando na porta ${PORT} em ambiente '${process.env.NODE_ENV || 'development'}'`);
    });

     // Adiciona lógica para desligamento gracioso se o agendador ou banco falharem após iniciar o server
     // Isso evita que o processo continue rodando em um estado inconsistente.
     // Verifique se o objeto scheduler emite eventos de 'error'.
     if (scheduler && typeof scheduler.on === 'function') { // Verifica se 'on' é uma função (se é um EventEmitter)
         scheduler.on('error', (err) => {
             console.error('[SERVER] Erro no agendador de tarefas:', err);
             // Considerar um atraso antes de desligar para permitir logs
             setTimeout(() => shutdown('Scheduler Error'), 1000);
         });
     } else {
         console.warn('[SERVER] Objeto agendador não parece ser um EventEmitter. Não será possível monitorar erros do agendador.');
     }


  } catch (error) {
    console.error('[SERVER] Erro fatal ao iniciar o servidor:', error);
    // Considerar um atraso antes de sair para permitir logs
    setTimeout(() => process.exit(1), 1000);
  }
};

// Inicia a aplicação
startServer();

/**
 * Lógica para desligamento gracioso do servidor.
 * Intercepta sinais de término (ex: Ctrl+C, SIGTERM) para fechar conexões e jobs.
 */
const shutdown = async (signal) => {
    console.log(`[SERVER] Sinal ${signal} recebido. Desligando servidor...`);

    try {
        // Para todos os jobs agendados
        // Verifique se o scheduler tem o método 'stop'.
        if (scheduler && typeof scheduler.stop === 'function') {
             scheduler.stop();
             console.log('[SERVER] Agendador de tarefas parado.');
        } else {
            console.warn('[SERVER] Agendador de tarefas não pôde ser parado gracefulmente.');
        }

        // TODO: Adicionar lógica para fechar a conexão com o banco de dados Sequelize aqui, se necessário.
        // Exemplo hipotético (verifique a API real do seu db):
        // if (db && db.sequelize && typeof db.sequelize.close === 'function') {
        //     await db.sequelize.close();
        //     console.log('[SERVER] Conexão com o banco de dados fechada.');
        // }

        // TODO: Adicionar lógica para fechar o servidor HTTP (variável 'server') aqui, se necessário.
        // Exemplo hipotético (verifique a API real do seu servidor http):
        // if (server && typeof server.close === 'function') {
        //     server.close(() => {
        //         console.log('[SERVER] Servidor HTTP fechado.');
        //         process.exit(0); // Encerra o processo após fechar o servidor HTTP
        //     });
        // } else {
           // Se não houver um método de fechamento explícito ou se for assíncrono e precisar de um await:
           console.log('[SERVER] Desligamento gracioso concluído. Saindo do processo.');
           process.exit(0);
        // }


    } catch (error) {
        console.error('[SERVER] Erro durante o desligamento gracioso:', error);
        process.exit(1); // Encerra com código de erro se houver problema no desligamento
    }
};

// Captura os sinais de término do processo
// SIGTERM é comumente usado por orquestradores (Docker, Kubernetes, PM2) para sinalizar que um processo deve parar.
// SIGINT é o sinal gerado por Ctrl+C no terminal.
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));