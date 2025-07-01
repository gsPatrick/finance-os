// src/features/dashboard/dashboard.service.js (AJUSTADO: Selecionando todos os campos relevantes do cartão)

const db = require('../../models');
const { Op, fn, col, literal } = require('sequelize');
const { startOfMonth, endOfMonth, addDays, subDays, format, startOfDay, parseISO } = require('date-fns');

class DashboardService {

  /**
   * 1. Saldo Líquido Atual
   * Calcula a soma de todos os 'currentBalance' das contas do tipo 'cash'.
   * @param {number} userId - O ID do usuário.
   * @returns {Promise<number>} O saldo líquido total.
   */
  async getNetBalance(userId) {
    const result = await db.Account.sum('currentBalance', {
      where: {
        userId: userId,
        type: 'cash',
      },
    });
    return result || 0;
  }

  /**
   * 2. Receita e Despesas do Mês
   * Calcula a soma de receitas e despesas com status 'cleared' no mês atual.
   * @param {number} userId - O ID do usuário.
   * @returns {Promise<{income: number, expense: number}>} Objeto com receita e despesa do mês.
   */
  async getMonthlySummary(userId) {
    const today = new Date();
    const startDate = startOfMonth(today);
    const endDate = endOfMonth(today);

    const result = await db.Transaction.findAll({
      where: {
        userId: userId,
        status: 'cleared',
        date: {
          [Op.between]: [startDate, endDate],
        },
      },
      attributes: [
        'type',
        [fn('SUM', col('amount')), 'total'],
      ],
      group: ['type'],
      raw: true,
    });

    const summary = { income: 0, expense: 0 };
    result.forEach(item => {
      if (item.type === 'income') {
        summary.income = parseFloat(item.total);
      } else if (item.type === 'expense') {
        summary.expense = parseFloat(item.total);
      }
    });

    return summary;
  }

  /**
   * 3. A Receber (Próximos 30 dias)
   * Calcula a soma de todas as transações de receita com status 'pending' ou 'scheduled' nos próximos 30 dias.
   * @param {number} userId - O ID do usuário.
   * @returns {Promise<number>} O total a receber.
   */
  async getReceivablesNext30Days(userId) {
    const today = startOfDay(new Date());
    const endDate = addDays(today, 30);

    const result = await db.Transaction.sum('amount', {
      where: {
        userId: userId,
        type: 'income',
        status: { [Op.in]: ['pending', 'scheduled'] },
        date: {
          [Op.between]: [today, endDate],
        },
      },
    });
    return result || 0;
  }

  /**
   * 4. Contas a Pagar (Mês)
   * Calcula a soma de todas as transações de despesa com status 'pending' ou 'scheduled' neste mês,
   * e também conta quantas vencem nos próximos 7 dias.
   * @param {number} userId - O ID do usuário.
   * @returns {Promise<{totalDue: number, billsDueIn7Days: number}>} Objeto com o total a pagar e o número de contas a vencer.
   */
  async getBillsToPaySummary(userId) {
    const today = new Date();
    const startDate = startOfMonth(today);
    const endDate = endOfMonth(today);
    const next7Days = addDays(startOfDay(today), 7);

    const totalDue = await db.Transaction.sum('amount', {
      where: {
        userId: userId,
        type: 'expense',
        status: { [Op.in]: ['pending', 'scheduled'] },
        date: { [Op.between]: [startDate, endDate] },
      },
    });

    const billsDueIn7Days = await db.Transaction.count({
      where: {
        userId: userId,
        type: 'expense',
        status: { [Op.in]: ['pending', 'scheduled'] },
        date: {
          [Op.between]: [startOfDay(today), next7Days],
        },
      },
    });

    return {
      totalDue: totalDue || 0,
      billsDueIn7Days: billsDueIn7Days || 0,
    };
  }

  /**
   * 5. Dados do Fluxo de Caixa Mensal (CashFlowChart.js)
   * Gera dados agregados de receita e despesa para os últimos 6 meses.
   * @param {number} userId - O ID do usuário.
   * @returns {Promise<object[]>} Array de objetos, um para cada mês.
   */
  async getMonthlyCashFlow(userId) {
    const today = new Date();
    const startDate = startOfMonth(subDays(today, 150));

    const transactions = await db.Transaction.findAll({
      where: {
        userId: userId,
        status: 'cleared',
        date: {
          [Op.gte]: startDate,
        },
      },
      attributes: [
        [fn('to_char', col('date'), 'YYYY-MM'), 'month'],
        'type',
        [fn('SUM', col('amount')), 'total'],
      ],
      group: ['month', 'type'],
      order: [['month', 'ASC']],
      raw: true,
    });
    return transactions;
  }

  /**
   * 6. Atividade Recente (RecentActivity.js)
   * Busca as últimas N transações com status 'cleared'.
   * @param {number} userId - O ID do usuário.
   * @param {number} limit - O número de atividades a retornar.
   * @returns {Promise<object[]>} Array de transações recentes.
   */
  async getRecentActivity(userId, limit = 5) {
    const transactions = await db.Transaction.findAll({
      where: {
        userId: userId,
        status: 'cleared',
      },
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: limit,
      attributes: ['id', 'description', 'amount', 'type', 'date'],
    });

    return transactions.map(tx => tx.toJSON());
  }

  /**
   * 7. Dados do Cartão de Crédito (CreditCardBill.js)
   * Busca o cartão principal (ou o primeiro encontrado) e sua fatura atual (fechada ou em aberto).
   * @param {number} userId - O ID do usuário.
   * @returns {Promise<object | null>} Objeto com dados do cartão e da fatura, ou null se não houver cartão.
   */
  async getPrimaryCreditCardBill(userId) {
    // Encontrar o primeiro cartão de crédito do usuário
    const card = await db.Account.findOne({
        where: { userId: userId, type: 'credit_card' },
        // CORRIGIDO: Selecionar todos os campos necessários para o widget do cartão
        attributes: [
            'id',
            'name',
            'finalDigits',
            'brand',
            'color',
            'icon',
            'limit',
            'closingDay',
            'dueDay'
        ],
        order: [['createdAt', 'ASC']],
    });

    if (!card) {
        return null; // Usuário não tem cartão de crédito
    }

    // Encontrar a fatura mais recente (seja 'open' ou 'closed')
    const invoice = await db.Invoice.findOne({
        where: { accountId: card.id },
        order: [['year', 'DESC'], ['month', 'DESC']],
    });

    // Retornar o objeto formatado para o frontend.
    return {
        card: card.toJSON(), // card.toJSON() já conterá todos os campos selecionados
        invoice: {
            total: invoice ? invoice.total : 0,
            dueDate: invoice ? invoice.dueDate : null,
        }
    };
  }

  /**
   * Compila todos os dados do dashboard em uma única chamada.
   * @param {number} userId
   * @returns {Promise<object>} Um objeto contendo todos os dados do dashboard.
   */
  async getDashboardData(userId) {
    // Executa todas as queries em paralelo para otimizar
    const [
      netBalance,
      monthlySummary,
      receivables,
      billsToPay,
      cashFlow,
      recentActivity,
      creditCardBill
    ] = await Promise.all([
      this.getNetBalance(userId),
      this.getMonthlySummary(userId),
      this.getReceivablesNext30Days(userId),
      this.getBillsToPaySummary(userId),
      this.getMonthlyCashFlow(userId),
      this.getRecentActivity(userId),
      this.getPrimaryCreditCardBill(userId)
    ]);

    return {
      netBalance,
      monthlySummary,
      receivables,
      billsToPay,
      cashFlow,
      recentActivity,
      creditCardBill
    };
  }
}

module.exports = new DashboardService();