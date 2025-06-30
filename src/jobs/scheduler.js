// src/jobs/scheduler.js

const cron = require('node-cron');
const services = require('../services'); // Importa todas as instâncias de serviço

/**
 * Módulo para agendar e executar tarefas recorrentes (jobs).
 */
class JobScheduler {
  constructor() {
    this.jobs = []; // Armazena as tarefas agendadas para referência
  }

  /**
   * Inicia todos os jobs agendados.
   * Este método deve ser chamado na inicialização do servidor.
   */
  start() {
    console.log('Iniciando agendador de tarefas...');

    // --- Tarefa 1: Efetivar Transações Vencidas (clearDueTransactions) ---
    // Agendado para rodar a cada hora, no minuto 5. (ex: 01:05, 02:05, etc.)
    // Ajuste o cron schedule conforme a necessidade. '0 * * * *' = todo início de hora.
    const clearDueJob = cron.schedule('5 * * * *', async () => {
      console.log(`[JOB - ${new Date().toISOString()}] Executando: Efetivar Transações Vencidas...`);
      try {
        const clearedCount = await services.transactionService.clearDueTransactions();
        console.log(`[JOB] Resultado: ${clearedCount} transações foram efetivadas.`);
      } catch (error) {
        console.error('[JOB] Erro ao executar "clearDueTransactions":', error);
      }
    }, {
      scheduled: true,
      timezone: "America/Sao_Paulo" // Defina o fuso horário correto
    });
    this.jobs.push({ name: 'clearDueTransactions', job: clearDueJob });


    // --- Tarefa 2: Fechar Faturas do Cartão de Crédito ---
    // Agendado para rodar uma vez por dia, às 02:00 da manhã.
    const closeInvoicesJob = cron.schedule('0 2 * * *', async () => {
        console.log(`[JOB - ${new Date().toISOString()}] Executando: Fechar Faturas de Cartão...`);
        try {
            const closedCount = await services.invoiceService.closeInvoices();
            console.log(`[JOB] Resultado: ${closedCount} faturas foram fechadas.`);
        } catch (error) {
            console.error('[JOB] Erro ao executar "closeInvoices":', error);
        }
    }, {
        scheduled: true,
        timezone: "America/Sao_Paulo"
    });
    this.jobs.push({ name: 'closeInvoices', job: closeInvoicesJob });


    // --- Tarefa 3: Atualizar Preços de Investimentos (se implementado) ---
    // Agendado para rodar, por exemplo, a cada 4 horas.
    // const updatePricesJob = cron.schedule('0 */4 * * *', async () => {
    //     console.log(`[JOB - ${new Date().toISOString()}] Executando: Atualizar Preços de Investimentos...`);
    //     try {
    //         await services.investmentService.updateAssetPrices();
    //         console.log('[JOB] Resultado: Atualização de preços de ativos concluída.');
    //     } catch (error) {
    //          console.error('[JOB] Erro ao executar "updateAssetPrices":', error);
    //     }
    // }, {
    //      scheduled: true,
    //      timezone: "America/Sao_Paulo"
    // });
    // this.jobs.push({ name: 'updateAssetPrices', job: updatePricesJob });


    console.log(`Agendador de tarefas iniciado com ${this.jobs.length} job(s).`);
  }

  /**
   * Para todas as tarefas agendadas.
   * Pode ser útil para um desligamento gracioso do servidor.
   */
  stop() {
    console.log('Parando todas as tarefas agendadas...');
    this.jobs.forEach(jobItem => {
      jobItem.job.stop();
    });
    console.log('Tarefas paradas.');
  }
}

// Exporta uma única instância do agendador
module.exports = new JobScheduler();