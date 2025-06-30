// src/invoice/invoice.service.js

const db = require('../../models');
const { Op } = require('sequelize');
const ApiError = require('../../modules/errors/apiError');
const { startOfDay, endOfDay, parseISO, addMonths, getDaysInMonth, addDays, format } = require('date-fns');
const { applyTransactionImpact } = require('../../modules/financialImpact/financialImpact.helper');

const DEFAULT_FUTURE_INVOICES_LIMIT = 2; // Gerar 2 faturas futuras no fechamento


class InvoiceService {
  constructor() {
    this.InvoiceModel = db.Invoice;
    this.AccountModel = db.Account;
    this.TransactionModel = db.Transaction;
  }

   /**
    * Cria uma nova fatura para um usuário (manual ou automática).
    * @param {number} userId - O ID do usuário.
    * @param {object} invoiceData - Dados da fatura.
    * @param {object} [t] - Objeto de transação Sequelize (opcional).
    * @returns {Promise<object>} A fatura criada (JSON).
    * @throws {ApiError} Se cartão não encontrado ou fatura para este mês/ano já existir.
    */
   async createInvoice(userId, invoiceData, t = null) {
       const { accountId, month, year, dueDate, closingDate, ...otherData } = invoiceData;

       const findOptions = { where: { id: accountId, userId: userId, type: 'credit_card' } };
       if (t) findOptions.transaction = t;
       const account = await this.AccountModel.findOne(findOptions);
       if (!account) throw new ApiError(404, 'Cartão de crédito associado não encontrado.');

       const existingFindOptions = { where: { accountId: accountId, year: year, month: month, userId: userId } };
       if (t) existingFindOptions.transaction = t;
       const existingInvoice = await this.InvoiceModel.findOne(existingFindOptions);
       if (existingInvoice) throw new ApiError(409, `Já existe uma fatura para este cartão em ${month}/${year}.`);

       let finalDueDate = dueDate ? parseISO(dueDate) : null;
       let finalClosingDate = closingDate ? parseISO(closingDate) : null;

       const currentMonthMaxDay = getDaysInMonth(new Date(year, month - 1));

       if (!finalDueDate && account.dueDay) {
            finalDueDate = new Date(year, month - 1, Math.min(account.dueDay, currentMonthMaxDay));
       }
        if (!finalClosingDate && account.closingDay) {
             finalClosingDate = new Date(year, month - 1, Math.min(account.closingDay, currentMonthMaxDay));
        }

        if (!finalDueDate || !finalClosingDate) {
            throw new ApiError(400, 'Datas de vencimento e fechamento são obrigatórias ou configure os dias no cartão.');
        }

       const createOptions = {
           userId: userId, accountId: accountId, month: month, year: year,
           dueDate: finalDueDate, closingDate: finalClosingDate,
           ...otherData,
       };
       if (t) createOptions.transaction = t;

       const invoice = await this.InvoiceModel.create(createOptions);
       return invoice.toJSON();
   }

  /**
   * Busca faturas de um usuário com opções de filtro, paginação e ordenação.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} options - Opções de busca.
   * @returns {Promise<{rows: object[], count: number}>} Lista de faturas e total.
   */
  async getInvoices(userId, options = {}) {
    const findOptions = {
      ...options,
      where: { userId: userId, ...options.where },
      include: [
        { model: db.Account, as: 'creditCard', attributes: ['id', 'name', 'brand', 'finalDigits', 'color', 'icon', 'limit', 'closingDay', 'dueDay'], where: { type: 'credit_card' }, required: true },
      ],
       order: options.order || [['year', 'DESC'], ['month', 'DESC']],
    };

    if (findOptions.where.startDate || findOptions.where.endDate) {
        const { startDate, endDate } = findOptions.where;
        delete findOptions.where.startDate; delete findOptions.where.endDate;
        findOptions.where.dueDate = {
            ...(startDate && { [Op.gte]: parseISO(startDate) }),
            ...(endDate && { [Op.lte]: parseISO(endDate) }),
        };
        if (Object.keys(findOptions.where.dueDate).length === 0) delete findOptions.where.dueDate;
    }
    const result = await this.InvoiceModel.findAndCountAll(findOptions);
    return { rows: result.rows.map(invoice => invoice.toJSON()), count: result.count };
  }

  /**
   * Busca uma fatura específica pelo ID para um usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} invoiceId - O ID da fatura.
   * @param {object} options - Opções de busca adicionais.
   * @returns {Promise<object>} A fatura encontrada (JSON).
   * @throws {ApiError} Se não for encontrada/pertencer ao usuário.
   */
  async getInvoiceById(userId, invoiceId, options = {}) {
       const defaultIncludes = [
           { model: db.Account, as: 'creditCard', attributes: ['id', 'name', 'brand', 'finalDigits', 'color', 'icon', 'limit', 'closingDay', 'dueDay'], where: { type: 'credit_card' }, required: true }
       ];
    const invoice = await this.InvoiceModel.findOne({ where: { id: invoiceId, userId: userId }, include: defaultIncludes, ...options });
    if (!invoice) throw new ApiError(404, 'Fatura não encontrada.');
    return invoice.toJSON();
  }

  /**
   * Busca as transações associadas a uma fatura específica.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} invoiceId - O ID da fatura.
   * @param {object} options - Opções de busca para as transações.
   * @returns {Promise<{rows: object[], count: number}>} Lista de transações da fatura e total.
   * @throws {ApiError} Se a fatura não for encontrada ou não pertencer ao usuário.
   */
  async getTransactionsByInvoiceId(userId, invoiceId, options = {}) {
        const invoice = await this.getInvoiceById(userId, invoiceId, { include: [] }); // Verifica propriedade
        const findOptions = {
            ...options,
            where: { invoiceId: invoiceId, userId: userId, ...options.where },
            include: [
                { model: db.Account, as: 'account', attributes: ['id', 'name', 'type', 'brand', 'finalDigits'] },
                { model: db.Category, as: 'category', attributes: ['id', 'name', 'color', 'icon'], required: false }
            ],
             order: options.order || [['date', 'ASC'], ['createdAt', 'ASC']],
        };
        if (findOptions.where.search) {
            const searchTerm = findOptions.where.search; delete findOptions.where.search;
            findOptions.where[Op.or] = [{ description: { [Op.iLike]: `%${searchTerm}%` } }, { observation: { [Op.iLike]: `%${searchTerm}%` } }, { '$category.name$': { [Op.iLike]: `%${searchTerm}%` } }, { '$account.name$': { [Op.iLike]: `%${searchTerm}%` } }];
        }
        const result = await this.TransactionModel.findAndCountAll(findOptions);
        return { rows: result.rows.map(tx => tx.toJSON()), count: result.count };
    }

  /**
   * Atualiza uma fatura existente para um usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} invoiceId - O ID da fatura.
   * @param {object} updateData - Dados para atualização.
   * @returns {Promise<object>} A fatura atualizada (JSON).
   * @throws {ApiError} Se não for encontrada/pertencer ao usuário, ou tentar mudar campos proibidos.
   */
  async updateInvoice(userId, invoiceId, updateData) {
    const invoice = await this.InvoiceModel.findOne({ where: { id: invoiceId, userId: userId } });
    if (!invoice) throw new ApiError(404, 'Fatura não encontrada.');

    const forbiddenUpdateFields = ['accountId', 'month', 'year', 'total'];
    forbiddenUpdateFields.forEach(field => { if (updateData[field] !== undefined) throw new ApiError(400, `Campo "${field}" não pode ser atualizado diretamente.`); });

    // Lógica de atualização de `paidAmount` e `paymentStatus`
    if (updateData.paidAmount !== undefined) {
        const newPaidAmount = parseFloat(updateData.paidAmount);
        const total = parseFloat(invoice.total);
        if (newPaidAmount < 0) throw new ApiError(400, 'Valor pago não pode ser negativo.');
        if (newPaidAmount >= total) updateData.paymentStatus = 'paid';
        else if (newPaidAmount > 0) updateData.paymentStatus = 'partial';
        else updateData.paymentStatus = 'unpaid';
    }
    // Se updateData.status foi fornecido, ele pode influenciar paymentStatus
    if (updateData.status !== undefined) {
        if (updateData.status === 'paid') {
            updateData.paymentStatus = 'paid';
        } else {
             if (invoice.status === 'paid') { // Se estava pago e está mudando para não pago
                 updateData.paymentStatus = updateData.paidAmount > 0 ? 'partial' : 'unpaid';
             }
        }
    }

    await invoice.update(updateData);
    return invoice.toJSON();
  }

  /**
   * Deleta uma fatura existente para um usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} invoiceId - O ID da fatura a ser deletada.
   * @returns {Promise<void>}
   * @throws {ApiError} Se não for encontrada/pertencer ao usuário, ou se a fatura tiver status que proíbe exclusão.
   */
  async deleteInvoice(userId, invoiceId) {
    const invoice = await this.InvoiceModel.findOne({ where: { id: invoiceId, userId: userId } });
    if (!invoice) throw new ApiError(404, 'Fatura não encontrada.');
    if (invoice.status === 'paid') throw new ApiError(400, 'Não é possível excluir uma fatura paga.'); // Regra de negócio: não deletar faturas pagas
    await invoice.destroy();
  }

    /**
     * Método para fechar faturas de cartão com base na data de fechamento.
     * Idealmente chamado por um job agendado.
     * Gerar `DEFAULT_FUTURE_INVOICES_LIMIT` faturas futuras no processo.
     * @returns {Promise<number>} Número de faturas fechadas.
     */
     async closeInvoices() {
         console.log('Iniciando fechamento de faturas e geração futura...');
         const today = startOfDay(new Date());
         let closedCount = 0;

         const creditCards = await this.AccountModel.findAll({
             where: { userId: { [Op.not]: null }, type: 'credit_card', closingDay: { [Op.not]: null } },
         });

         for (const card of creditCards) {
            await db.sequelize.transaction(async (t) => { // Transação por cartão para atomicidade
                try {
                     // Verificar se a data de fechamento do cartão é hoje
                    if (card.closingDay === today.getDate()) {
                         console.log(`Cartão ${card.name} (${card.id}) tem fechamento hoje (${card.closingDay}).`);

                         const currentOpenInvoice = await this.InvoiceModel.findOne({ where: { accountId: card.id, userId: card.userId, status: 'open' }, transaction: t });

                         if (!currentOpenInvoice) {
                              console.warn(`Nenhuma fatura 'open' encontrada para o cartão ${card.name}. Pulando fechamento para este cartão.`);
                              return; // Sai desta iteração do loop, continua para o próximo cartão
                         }

                         // 1. Calcular o período exato da fatura que está fechando
                         const invoiceMonth = currentOpenInvoice.month;
                         const invoiceYear = currentOpenInvoice.year;
                         const closingDay = card.closingDay;

                         // A data de fechamento atual é o final do período da fatura.
                         const periodEndDate = new Date(invoiceYear, invoiceMonth - 1, closingDay);
                         // O início do período é um dia após o closingDay do mês anterior
                         let prevClosingMonthDate = addMonths(new Date(invoiceYear, invoiceMonth - 1, closingDay), -1); // Volta 1 mês
                         const periodStartDate = addDays(prevClosingMonthDate, 1);


                          console.log(`Fatura ${invoiceMonth}/${invoiceYear} (${currentOpenInvoice.id}) cobre de ${format(periodStartDate, 'yyyy-MM-dd')} a ${format(periodEndDate, 'yyyy-MM-dd')}.`);

                         // 2. Associar transações ao período da fatura e recalcular o total
                         const transactionsToAssociate = await this.TransactionModel.findAll({
                             where: {
                                 userId: card.userId, accountId: card.id, type: 'expense', status: { [Op.in]: ['cleared'] },
                                 date: { [Op.between]: [periodStartDate, periodEndDate] },
                                 invoiceId: { [Op.or]: [null, currentOpenInvoice.id] } // Ainda não associadas OU já associadas a esta
                             },
                             transaction: t,
                         });

                         let calculatedTotal = 0;
                         for (const tx of transactionsToAssociate) {
                             if (tx.invoiceId !== currentOpenInvoice.id) {
                                 await tx.update({ invoiceId: currentOpenInvoice.id }, { transaction: t });
                             }
                             calculatedTotal += parseFloat(tx.amount);
                         }

                         // 3. Atualizar a fatura atual para 'closed' e setar o total calculado
                         await currentOpenInvoice.update({
                             status: 'closed', total: calculatedTotal,
                         }, { transaction: t });
                         closedCount++;
                         console.log(`Fatura ${currentOpenInvoice.month}/${currentOpenInvoice.year} (${currentOpenInvoice.id}) do cartão ${card.name} FECHADA com total R$ ${calculatedTotal.toFixed(2)}.`);


                         // 4. Gerar faturas futuras IMEDIATAMENTE (N + 1 a N + DEFAULT_FUTURE_INVOICES_LIMIT)
                          let nextInvoiceMonth = invoiceMonth;
                          let nextInvoiceYear = invoiceYear;
                          for (let i = 0; i < DEFAULT_FUTURE_INVOICES_LIMIT; i++) {
                              const nextDateForMonthCalc = addMonths(new Date(nextInvoiceYear, nextInvoiceMonth - 1, 1), 1); // Calcula o próximo mês
                              nextInvoiceMonth = nextDateForMonthCalc.getMonth() + 1;
                              nextInvoiceYear = nextDateForMonthCalc.getFullYear();

                              try {
                                  await this.createInvoice(card.userId, {
                                      accountId: card.id, month: nextInvoiceMonth, year: nextInvoiceYear,
                                      status: 'open', total: 0.00, paidAmount: 0.00, paymentStatus: 'unpaid',
                                  }, t); // Passa a transação Sequelize
                                  console.log(`Próxima fatura ${nextInvoiceMonth}/${nextInvoiceYear} CRIADA para o cartão ${card.name}.`);
                              } catch (error) {
                                  if (error.statusCode === 409) {
                                      console.log(`Próxima fatura ${nextInvoiceMonth}/${nextYear} JÁ EXISTE para o cartão ${card.name}.`);
                                  } else {
                                       throw error; // Relança outros erros
                                  }
                              }
                          } // Fim do for (geração futura)

                    } // Fim da verificação se é dia de fechamento
                } catch (error) {
                     console.error(`Erro durante o fechamento/geração de fatura para o cartão ${card.name} (${card.id}):`, error);
                     throw error; // Re-lança para forçar rollback da transação
                }
            }); // Fim da transação Sequelize para o cartão
         } // Fim do loop for (cartões)

         console.log(`Processo de fechamento e geração de faturas concluído. Total de faturas fechadas hoje: ${closedCount}.`);
         return closedCount;
     }

      /**
       * Método para registrar um pagamento em uma fatura.
       * @param {number} userId - O ID do usuário.
       * @param {number} invoiceId - O ID da fatura a ser paga.
       * @param {object} paymentData - Dados do pagamento ({ amount: number, accountId: number, date: date }).
       * @returns {Promise<object>} A fatura atualizada após o pagamento (JSON).
       * @throws {ApiError} Se fatura/conta pagadora não encontradas, fatura não estiver fechada/parcial, valor inválido.
       */
      async registerInvoicePayment(userId, invoiceId, paymentData) {
          const { amount: paymentAmount, accountId: payingAccountId, date: paymentDate } = paymentData;

          const invoice = await this.InvoiceModel.findOne({ where: { id: invoiceId, userId: userId, status: { [Op.in]: ['closed', 'partial'] } }, include: [{ model: db.Account, as: 'creditCard' }] });
          if (!invoice) throw new ApiError(404, 'Fatura não encontrada ou não está no estado correto para pagamento.');

          const payingAccount = await db.Account.findOne({ where: { id: payingAccountId, userId: userId, type: 'cash' } });
          if (!payingAccount) throw new ApiError(404, 'Conta pagadora não encontrada ou não é uma conta cash.');

          const amount = parseFloat(paymentAmount);
          if (isNaN(amount) || amount <= 0) throw new ApiError(400, 'Valor do pagamento inválido.');
          const remaining = parseFloat(invoice.total) - parseFloat(invoice.paidAmount);
          if (amount > remaining + 0.01 && invoice.status !== 'partial') { /* ... */ }

          return db.sequelize.transaction(async (t) => {
               // Cria a transação de pagamento (despesa na conta cash)
               const paymentTransaction = await db.Transaction.create({
                   userId: userId, accountId: payingAccountId, invoiceId: invoiceId, // Associa à fatura que está sendo paga
                   description: `Pagamento Fatura ${invoice.creditCard.name} (${invoice.month}/${invoice.year})`,
                   amount: amount, type: 'expense',
                   date: paymentDate ? parseISO(paymentDate) : startOfDay(new Date()),
                   status: 'cleared', recurring: false, installment: false, parentId: null,
                   observation: `Pagamento para fatura ${invoice.id}`,
               }, { transaction: t });

                // Aplica impacto na conta pagadora (diminui o saldo cash)
                // Passa a transação recém-criada e a conta pagadora para o helper
               await applyTransactionImpact(paymentTransaction, { transaction: t, account: payingAccount });

               // Atualiza paidAmount e paymentStatus da fatura
               const newPaidAmount = parseFloat(invoice.paidAmount) + amount;
               let newPaymentStatus = 'partial';
               if (newPaidAmount >= parseFloat(invoice.total)) { newPaymentStatus = 'paid'; }
               else if (newPaidAmount > 0) { newPaymentStatus = 'partial'; }
               else { newPaymentStatus = 'unpaid'; }

               await invoice.update({
                   paidAmount: newPaidAmount, paymentStatus: newPaymentStatus,
                   ...(newPaymentStatus === 'paid' && { status: 'paid' }), // Muda status da fatura para 'paid' se pago total
               }, { transaction: t });

               const updatedInvoice = await this.InvoiceModel.findByPk(invoice.id, {
                     include: [{ model: db.Account, as: 'creditCard', attributes: ['id', 'name', 'brand', 'finalDigits', 'color', 'icon', 'limit', 'closingDay', 'dueDay'] }],
                     transaction: t,
                });
               return updatedInvoice.toJSON();
           });
      }
}

module.exports = InvoiceService; // <<-- DEVE SER ASSIM
