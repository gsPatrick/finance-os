// src/server.js
require('dotenv').config(); // Carrega variáveis de ambiente do .env
const app = require('./app'); // Importa a aplicação Express configurada (src/app.js)
const db = require('./src/models'); // Importa a instância do Sequelize e modelos (src/models/index.js)
const scheduler = require('./src/jobs/scheduler'); // Importa o nosso agendador de tarefas (src/jobs/scheduler.js)


// 3. Lê a porta da aplicação a partir das variáveis de ambiente
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
    scheduler.start();
    console.log(`Agendador de tarefas iniciado com ${scheduler.getJobs().length} job(s).`); // Opcional: logar quantos jobs foram iniciados

    // 4. Inicia o servidor Express para aceitar requisições HTTP
    const server = app.listen(PORT, () => {
      console.log(`[SERVER] Servidor rodando na porta ${PORT} em ambiente '${process.env.NODE_ENV || 'development'}'`);
    });

     // Adiciona lógica para desligamento gracioso se o agendador ou banco falharem após iniciar o server
     // Isso evita que o processo continue rodando em um estado inconsistente.
     scheduler.on('error', (err) => {
         console.error('[SERVER] Erro no agendador de tarefas:', err);
         shutdown('Scheduler Error'); // Desliga o servidor em caso de erro no scheduler
     });

  } catch (error) {
    console.error('[SERVER] Erro fatal ao iniciar o servidor:', error);
    process.exit(1); // Encerra o processo com código de erro
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
        if (scheduler.running) { // Verifica se o agendador está rodando antes de tentar parar
             scheduler.stop();
             console.log('[SERVER] Agendador de tarefas parado.');
        }


        // Feche a conexão com o banco de dados
        // Pode ser necessário fechar a conexão sequelize explicitamente para um desligamento limpo.
        // Seus jobs e requisições precisam de conexões. Verifique a documentação do Sequelize para fechar.
        // await db.sequelize.close(); // Exemplo, verifique a API do Sequelize


        // Feche o servidor HTTP (se você armazenou a referência na variável 'server')
        // server.close(() => {
        //     console.log('[SERVER] Servidor HTTP fechado.');
        //     process.exit(0); // Encerra o processo após fechar o servidor HTTP
        // });

         // Se não tiver um método de fechamento explícito para o servidor HTTP ou sequelize,
         // ou se a lógica de fechamento for síncrona ou lidar com suas próprias promises/callbacks,
         // você pode simplesmente logar e sair, confiando no gerenciador de processo (como Docker, PM2, etc.)
         // para fazer o desligamento forçado se necessário após um timeout.
         console.log('[SERVER] Desligamento gracioso concluído. Saindo do processo.');
         process.exit(0);


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