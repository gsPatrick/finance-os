// src/transaction/transaction.service.js (AJUSTADO: Importando financialImpact.helper)

const db = require('../../models');
const { Op } = require('sequelize');
const ApiError = require('../../modules/errors/apiError');
const { startOfDay, endOfDay, addDays, addWeeks, addMonths, addYears, isAfter, getDaysInMonth } = require('date-fns');
// IMPORTAÇÃO CORRETA DO HELPER DE IMPACTO FINANCEIRO
const { applyTransactionImpact, revertTransactionImpact } = require('../../modules/financialImpact/financialImpact.helper');


// Helper para calcular a próxima data com base na frequência
const calculateNextDate = (currentDate, frequency) => {
    let nextDate = new Date(currentDate); // Copia a data atual (já é um objeto Date)
    switch (frequency) {
        case 'Diária': return addDays(nextDate, 1);
        case 'Semanal': return addWeeks(nextDate, 1);
        case 'Quinzenal': return addDays(nextDate, 15);
        case 'Mensal': return addMonths(nextDate, 1);
        case 'Bimestral': return addMonths(nextDate, 2);
        case 'Trimestral': return addMonths(nextDate, 3);
        case 'Anual': return addYears(nextDate, 1);
        default: return null; // Frequência desconhecida
    }
};

// Número de ocorrências futuras a gerar para recorrências (além da primeira)
const DEFAULT_RECURRING_FUTURE_OCCURRENCES_LIMIT = 24; // Ex: Gerar para os próximos 24 meses/ocorrências
// Limite máximo de parcelas a gerar, para evitar transações infinitas por erro (ex: 10 anos)
const MAX_INSTALLMENT_OCCURRENCES_LIMIT = 120; // 120 parcelas = 10 anos mensais


class TransactionService {
  constructor() {
    this.TransactionModel = db.Transaction;
    this.AccountModel = db.Account;
    this.CategoryModel = db.Category;
    this.InvoiceModel = db.Invoice;
  }

  /**
   * Cria uma nova transação ou uma série de transações (recorrentes/parceladas).
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} transactionData - Dados da transação. Contém 'date', 'recurringStartDate' como objetos Date (se validados pelo Joi).
   * @returns {Promise<object[]>} Um array com todas as transações criadas (incluindo futuras).
   * @throws {ApiError} Se conta/categoria/fatura não forem encontradas ou não pertencerem ao usuário.
   */
  async createTransaction(userId, transactionData) {
    // 'date' e 'recurringStartDate' já devem ser objetos Date aqui se vieram do Joi.
    const { accountId, categoryId, invoiceId, amount, type, date, recurring, installment, installmentCount, installmentUnit, frequency, recurringStartDate, ...otherData } = transactionData;

    // 1. Verificar e buscar Conta
    const account = await this.AccountModel.findOne({ where: { id: accountId, userId: userId } });
    if (!account) throw new ApiError(404, 'Conta ou cartão associado não encontrado.');

    // 2. Verificar e buscar Categoria (se fornecida)
    if (categoryId) {
        const category = await this.CategoryModel.findOne({ where: { id: categoryId, userId: userId } });
        if (!category) throw new ApiError(404, 'Categoria associada não encontrada.');
    }

    // 3. Validações de flags recorrente/parcelado (esta lógica está correta)
    if (recurring && installment) throw new ApiError(400, 'Uma transação não pode ser parcelada E recorrente.');
    if (!recurring && (frequency || recurringStartDate)) throw new ApiError(400, 'Campos de recorrência (frequency, recurringStartDate) só são permitidos se `recurring` for true.');
    // installmentCurrent não é validado aqui, pois ele só é setado nas ocorrências filhas ou na primeira parcela (se count > 1)
    if (!installment && (installmentCount || installmentUnit)) throw new ApiError(400, 'Campos de parcelamento (installmentCount, installmentUnit) só são permitidos se `installment` for true.');


    // Usar uma transação Sequelize para garantir atomicidade de toda a série
    const resultTransactions = [];
    await db.sequelize.transaction(async (t) => {
        // --- 4. Obter/Validar Fatura para Despesas de Cartão ---
        let invoice = null;
        if (account.type === 'credit_card' && type === 'expense') {
            // 'date' já é um objeto Date aqui
            invoice = await this._findOrCreateInvoiceForTransaction(userId, accountId, date, t, invoiceId);
            if (!invoice) throw new ApiError(400, `Nenhuma fatura válida encontrada ou criada para o cartão ${account.name} na data da transação.`);
        } else if (invoiceId && account.type !== 'credit_card') {
            throw new ApiError(400, 'Uma transação em conta tipo "cash" não pode ser associada a uma fatura.');
        }

        // --- 5. Criar a transação MESTRA (ou a primeira transação para séries) ---
        // 'date' já é um objeto Date aqui
        // 'recurringStartDate' já é um objeto Date aqui se presente
        const masterTransaction = await this.TransactionModel.create({
            userId: userId,
            accountId: accountId,
            categoryId: categoryId,
            invoiceId: invoice?.id || null, // ID da fatura (se aplicável)
            description: otherData.description,
            amount: amount,
            type: type,
            date: date, // Use o objeto Date diretamente
            // Status inicial baseado na data e no flag forecast
            status: (startOfDay(date) <= startOfDay(new Date()) && !transactionData.forecast) ? 'cleared' : (recurring || installment ? 'scheduled' : 'pending'),
            recurring: recurring,
            frequency: recurring ? frequency : null,
            recurringStartDate: recurring ? (recurringStartDate || date) : null, // Use recurringStartDate (Date) ou date (Date)
            installment: installment,
            installmentCount: installment ? installmentCount : null,
            // installmentCurrent só é setado para 1 se for a primeira parcela E installmentCount > 1
            installmentCurrent: installment ? (installmentCount > 1 ? 1 : null) : null,
            installmentUnit: installment ? installmentUnit : null,
            observation: otherData.observation,
            parentId: null, // A mestra não tem pai
        }, { transaction: t });

        resultTransactions.push(masterTransaction.toJSON());

        // --- 6. Aplicar impacto financeiro para a transação mestra se 'cleared' ---
        if (masterTransaction.status === 'cleared') {
            // Use o helper importado
            await applyTransactionImpact(masterTransaction, { transaction: t, account: account, invoice: invoice });
        }

        // --- 7. Gerar ocorrências futuras IMEDIATAMENTE (se recorrente ou parcelado) ---
        if (recurring || installment) {
            let currentDate = date; // Começa com a data da transação mestra (já é Date)
            const limit = installment ? installmentCount - 1 : DEFAULT_RECURRING_FUTURE_OCCURRENCES_LIMIT;
            let currentOccurrenceNumber = installment ? 1 : 0; // Para numeração de parcelas

            for (let i = 0; i < limit; i++) {
                currentDate = recurring ? calculateNextDate(currentDate, frequency) : calculateNextDate(currentDate, installmentUnit);
                if (!currentDate) break;

                // Limite de ocorrências para evitar loops infinitos ou sobrecarga de dados
                if (installment && currentOccurrenceNumber >= MAX_INSTALLMENT_OCCURRENCES_LIMIT) break;
                // Comparar objetos Date diretamente
                if (recurring && isAfter(currentDate, addYears(date, 2))) break; // Limite de 2 anos a partir da data MESTRA

                // Ajustar descrição e número de parcela para parcelamento
                let childDescription = otherData.description;
                if (installment) {
                    currentOccurrenceNumber++;
                    if (currentOccurrenceNumber > installmentCount) break; // Já gerou todas as parcelas
                    childDescription = `${otherData.description} (${currentOccurrenceNumber}/${installmentCount})`;
                }

                // Status da ocorrência futura: 'cleared' se a data já passou, 'scheduled' caso contrário
                const futureStatus = (startOfDay(currentDate) <= startOfDay(new Date())) ? 'cleared' : 'scheduled';

                // Obter/criar fatura para a transação filha de cartão (se aplicável)
                let childInvoiceId = null;
                if (account.type === 'credit_card' && type === 'expense') {
                    const childInvoice = await this._findOrCreateInvoiceForTransaction(userId, accountId, currentDate, t); // currentDate já é Date
                    childInvoiceId = childInvoice?.id || null;
                }

                const futureTransaction = await this.TransactionModel.create({
                    userId: userId,
                    accountId: accountId,
                    categoryId: categoryId,
                    invoiceId: childInvoiceId,
                    parentId: masterTransaction.id, // Linka à transação mestra
                    description: childDescription, // Descrição (com numeração para parcelas)
                    amount: installment ? parseFloat(amount) / parseInt(installmentCount, 10) : amount, // Valor da parcela para installment, total para recurring
                    type: type,
                    date: currentDate, // Use o objeto Date diretamente
                    status: futureStatus,
                    recurring: false, // Ocorrências filhas não são regras recorrentes
                    frequency: null, recurringStartDate: null,
                    installment: false, // Ocorrências filhas não são a primeira parcela
                    installmentCount: installment ? installmentCount : null,
                    installmentCurrent: installment ? currentOccurrenceNumber : null,
                    installmentUnit: null,
                    observation: otherData.observation,
                }, { transaction: t });

                // Se a transação filha for 'cleared' (porque a data já passou), aplicar impacto
                if (futureTransaction.status === 'cleared') {
                     // Precisa buscar a conta e fatura associadas para o helper applyTransactionImpact
                     const childAccount = await futureTransaction.getAccount({transaction: t});
                     const childInvoice = await futureTransaction.getInvoice({transaction: t});
                    await applyTransactionImpact(futureTransaction, { transaction: t, account: childAccount, invoice: childInvoice });
                }
            } // Fim do for
        }
    }); // Fim da transação Sequelize

    // Retornar todas as transações criadas (a mestra e as futuras)
    // Pode ser necessário buscar novamente com includes se quiser retornar relações
    // ou ajustar a lógica de criação para incluir as relações no objeto retornado.
    // Por simplicidade, vamos buscar a mestra com relações para retornar.
    const masterTransactionWithRelations = await this.TransactionModel.findByPk(resultTransactions[0].id, {
         include: [
             { model: db.Account, as: 'account', attributes: ['id', 'name', 'type', 'brand', 'finalDigits'] },
             { model: db.Category, as: 'category', attributes: ['id', 'name', 'color', 'icon'], required: false },
             { model: db.Transaction, as: 'children', attributes: ['id', 'description', 'amount', 'date', 'status', 'installmentCurrent'], required: false, order: [['date', 'ASC']] },
         ],
    });


    return masterTransactionWithRelations.toJSON(); // Retorna a mestra com suas filhas (opcional, ajuste conforme a necessidade do frontend)
  }

    /**
     * Helper interno para encontrar ou criar fatura para transações de cartão futuras.
     * @param {number} userId
     * @param {number} accountId
     * @param {Date} transactionDate - Já é um objeto Date
     * @param {object} t - Sequelize transaction object
     * @param {number} [explicitInvoiceId] - ID de fatura fornecido explicitamente, para verificar se existe.
     * @returns {Promise<object>} Objeto da fatura (JSON) ou null.
     * @private
     */
     async _findOrCreateInvoiceForTransaction(userId, accountId, transactionDate, t, explicitInvoiceId = null) {
        // Se um invoiceId foi fornecido explicitamente, tenta encontrá-lo
        if (explicitInvoiceId) {
            const invoice = await db.Invoice.findOne({ where: { id: explicitInvoiceId, userId: userId, accountId: accountId }, transaction: t });
            if (invoice) return invoice.toJSON();
            // Se não encontrou, o ID explícito é inválido para este usuário/cartão
            throw new ApiError(404, 'Fatura explícita associada não encontrada para este cartão/usuário.');
        }

        // transactionDate já é um objeto Date aqui
        const year = transactionDate.getFullYear();
        const month = transactionDate.getMonth() + 1; // getMonth() é 0-indexado

        let invoice = await db.Invoice.findOne({
            where: { accountId, userId, year, month },
            transaction: t,
        });

        if (!invoice) {
            // Se não encontrou, precisa criar a fatura para o mês.
            const card = await db.Account.findByPk(accountId, { transaction: t });
            if (!card || !card.closingDay || !card.dueDay) {
                 console.warn(`Cartão ${accountId} não tem closingDay/dueDay ou não encontrado. Não é possível criar fatura para ${month}/${year}.`);
                 return null; // Não pode criar fatura sem dados do cartão
            }

            // Use o ano e mês da transação (transactionDate) para calcular dueDate e closingDate da NOVA fatura
            const invoiceYear = transactionDate.getFullYear();
            const invoiceMonth = transactionDate.getMonth(); // 0-indexed para new Date

            const currentMonthMaxDay = getDaysInMonth(new Date(invoiceYear, invoiceMonth, 1)); // Dias no mês da fatura
            const newInvoiceDueDate = new Date(invoiceYear, invoiceMonth, Math.min(card.dueDay, currentMonthMaxDay));
            const newInvoiceClosingDate = new Date(invoiceYear, invoiceMonth, Math.min(card.closingDay, currentMonthMaxDay));


            invoice = await db.Invoice.create({
                userId, accountId, month, year, // Use month/year da transactionDate
                dueDate: newInvoiceDueDate, // Use os objetos Date calculados
                closingDate: newInvoiceClosingDate, // Use os objetos Date calculados
                status: 'open', total: 0.00, paidAmount: 0.00, paymentStatus: 'unpaid',
            }, { transaction: t });
            console.log(`Fatura ${month}/${year} criada automaticamente para cartão ${accountId}.`);
        }
        return invoice.toJSON();
     }

  /**
   * Busca transações de um usuário com opções de filtro, paginação e ordenação.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {object} options - Opções de busca. Contém 'date', 'startDate', 'endDate' como objetos Date se validados pelo Joi.
   * @returns {Promise<{rows: object[], count: number}>} Lista de transações e total.
   */
  async getTransactions(userId, options = {}) {
    const { includeParent, includeChildren, ...otherOptions } = options;

    const findOptions = {
      ...otherOptions,
      where: {
        userId: userId,
        ...otherOptions.where,
      },
      include: [
        { model: db.Account, as: 'account', attributes: ['id', 'name', 'type', 'brand', 'finalDigits'] },
        { model: db.Category, as: 'category', attributes: ['id', 'name', 'color', 'icon'], required: false },
        { model: db.Transaction, as: 'parent', attributes: ['id', 'description', 'amount', 'date', 'recurring', 'installment', 'installmentCount', 'installmentCurrent'], required: false },
        { model: db.Transaction, as: 'children', attributes: ['id', 'description', 'amount', 'date', 'status', 'installmentCurrent'], required: false, order: [['date', 'ASC']] },
      ],
       order: otherOptions.order || [['date', 'DESC'], ['createdAt', 'DESC']],
       attributes: { exclude: ['password'] }
    };

    // Lógica de filtro por data nos query params (startDate, endDate)
    // Assumindo que startDate e endDate em findOptions.where já são objetos Date do Joi
    if (findOptions.where.date && findOptions.where.date[Op.between]) {
        // As datas no Op.between já são objetos Date, não precisa de parseISO
        // Ex: { date: { [Op.between]: [Date object, Date object] } }
    } else if (findOptions.where.date && findOptions.where.date[Op.gte]) {
         // A data no Op.gte já é um objeto Date
    } // ... e assim por diante para outros operadores de data


    if (findOptions.where.search) {
        const searchTerm = findOptions.where.search;
        delete findOptions.where.search;
        findOptions.where[Op.or] = [
            { description: { [Op.iLike]: `%${searchTerm}%` } },
            { observation: { [Op.iLike]: `%${searchTerm}%` } },
            { '$category.name$': { [Op.iLike]: `%${searchTerm}%` } },
            { '$account.name$': { [Op.iLike]: `%${searchTerm}%` } },
            { '$account.brand$': { [Op.iLike]: `%${searchTerm}%` } },
        ];
    }
    const result = await this.TransactionModel.findAndCountAll(findOptions);
    return {
      rows: result.rows.map(transaction => transaction.toJSON()),
      count: result.count
    };
  }

  /**
   * Busca uma transação específica pelo ID para um usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} transactionId - O ID da transação.
   * @param {object} options - Opções de busca adicionais.
   * @returns {Promise<object>} A transação encontrada.
   * @throws {ApiError} Se não for encontrada/pertencer ao usuário.
   */
  async getTransactionById(userId, transactionId, options = {}) {
    const transaction = await this.TransactionModel.findOne({
      where: { id: transactionId, userId: userId },
      include: [
        { model: db.Account, as: 'account', attributes: ['id', 'name', 'type', 'brand', 'finalDigits'] },
        { model: db.Category, as: 'category', attributes: ['id', 'name', 'color', 'icon'], required: false },
        { model: db.Transaction, as: 'parent', attributes: ['id', 'description', 'amount', 'date', 'recurring', 'installment', 'installmentCount', 'installmentUnit', 'frequency', 'recurringStartDate'], required: false },
        { model: db.Transaction, as: 'children', attributes: ['id', 'description', 'amount', 'date', 'status', 'installmentCurrent'], required: false, order: [['date', 'ASC']] },
      ],
      ...options,
    });
    if (!transaction) throw new ApiError(404, 'Transação não encontrada.');
    return transaction.toJSON();
  }

  /**
   * Atualiza uma transação existente para um usuário.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} transactionId - O ID da transação a ser atualizada.
   * @param {object} updateData - Dados para atualização. Contém campos de data como objetos Date se validados pelo Joi.
   * @returns {Promise<object>} A transação atualizada.
   * @throws {ApiError} Se não for encontrada/pertencer ao usuário, ou se tentar mudar campos de série em transações filhas.
   */
  async updateTransaction(userId, transactionId, updateData) {
    // updateData pode conter campos de data como objetos Date
    const transaction = await this.TransactionModel.findOne({ where: { id: transactionId, userId: userId }, include: [{ model: db.Account, as: 'account' }, { model: db.Invoice, as: 'invoice' }] }); // Incluir fatura para ter acesso aos dados
    if (!transaction) throw new ApiError(404, 'Transação não encontrada.');

    // 1. Capturar estados antigos para lógica de impacto e validação
    const oldStatus = transaction.status;
    const newStatus = updateData.status !== undefined ? updateData.status : oldStatus;
    const oldAmount = parseFloat(transaction.amount);
    const newAmount = updateData.amount !== undefined ? parseFloat(updateData.amount) : oldAmount;
    const oldType = transaction.type;
    const newType = updateData.type !== undefined ? updateData.type : oldType;
    const oldAccountId = transaction.accountId;
    const newAccountId = updateData.accountId !== undefined ? updateData.accountId : oldAccountId;
    const oldInvoiceId = transaction.invoiceId;
    const newInvoiceId = updateData.invoiceId !== undefined ? updateData.invoiceId : oldInvoiceId;


    await db.sequelize.transaction(async (t) => {
        // 2. Reverter impacto financeiro anterior (se status era 'cleared' e dados financeiros mudaram)
        if (oldStatus === 'cleared' && (newStatus !== 'cleared' || newAmount !== oldAmount || newType !== oldType || newAccountId !== oldAccountId || newInvoiceId !== oldInvoiceId)) {
            // Use o helper importado
            await revertTransactionImpact(transaction, { transaction: t, account: transaction.account, invoice: transaction.invoice });
        }

        // 3. Validar e filtrar campos de série para transações filhas (esta lógica está correta)
        if (transaction.parentId !== null) {
            const serieFields = ['recurring', 'installment', 'frequency', 'recurringStartDate', 'installmentCount', 'installmentUnit', 'installmentCurrent']; // Incluir installmentCurrent aqui
            const forbiddenUpdates = serieFields.filter(field => updateData[field] !== undefined);
            if (forbiddenUpdates.length > 0) throw new ApiError(400, `Não é permitido alterar campos de série (${forbiddenUpdates.join(', ')}) em transações filhas.`);
            forbiddenUpdates.forEach(field => delete updateData[field]); // Remove os campos de série explicitamente para evitar que sejam atualizados
        }
        // Garante que campos de recorrência/parcelamento não sejam setados em não-mestras
        if (!transaction.installment && (updateData.installmentCount !== undefined || updateData.installmentUnit !== undefined || updateData.installmentCurrent !== undefined)) { // Incluir installmentCurrent
            delete updateData.installmentCount; delete updateData.installmentUnit; delete updateData.installmentCurrent;
        }
         // Garante que campos de recorrência não sejam setados em não-mestras
         if (!transaction.recurring && (updateData.frequency !== undefined || updateData.recurringStartDate !== undefined)) {
             delete updateData.frequency; delete updateData.recurringStartDate;
         }


        // 4. Se accountId ou invoiceId mudaram, verificar validade do novo ID
        let targetAccount = transaction.account;
        if (newAccountId !== oldAccountId) {
            targetAccount = await db.Account.findByPk(newAccountId, { transaction: t });
            if (!targetAccount) throw new ApiError(404, 'Nova conta associada não encontrada.');
        }

        let targetInvoice = transaction.invoice;
        if (newInvoiceId !== oldInvoiceId) {
            // Se o novo invoiceId é null, apenas seta para null.
            if (newInvoiceId === null) {
                 targetInvoice = null;
            } else {
                 targetInvoice = await db.Invoice.findByPk(newInvoiceId, { transaction: t });
                 if (!targetInvoice) throw new ApiError(404, 'Nova fatura associada não encontrada.');
                 // Validar se a fatura pertence ao novo cartão (se o cartão mudou)
                 if (targetInvoice.accountId !== (targetAccount?.id || oldAccountId)) {
                     throw new ApiError(400, 'A nova fatura não pertence ao cartão associado a esta transação.');
                 }
            }
        }


        // 5. Atualizar a transação no banco
        await transaction.update(updateData, { transaction: t });

        // 6. Aplicar novo impacto financeiro (se o NOVO status for 'cleared')
        if (newStatus === 'cleared') {
            const updatedTransactionForImpact = {
                ...transaction.toJSON(), // Pega os dados antigos como base
                ...updateData,          // Sobrescreve com as atualizações
                account: targetAccount, // A conta correta (nova ou antiga)
                invoice: targetInvoice, // A fatura correta (nova ou antiga)
                amount: newAmount,      // Garante que o valor é o novo
                type: newType,          // Garante que o tipo é o novo
            };
            if (!updatedTransactionForImpact.account) throw new ApiError(500, 'Conta destino para atualização não encontrada.');
            // Use o helper importado
            await applyTransactionImpact(updatedTransactionForImpact, { transaction: t, account: targetAccount, invoice: targetInvoice });
        }
    }); // Fim da transação Sequelize

    // 7. Retornar a transação atualizada COM as relações (fora da transação para garantir que esteja committed)
    const updatedTransactionWithRelations = await this.TransactionModel.findByPk(transaction.id, {
        include: [
            { model: db.Account, as: 'account', attributes: ['id', 'name', 'type', 'brand', 'finalDigits'] },
            { model: db.Category, as: 'category', attributes: ['id', 'name', 'color', 'icon'], required: false },
            { model: db.Transaction, as: 'parent', attributes: ['id', 'description', 'amount', 'date', 'recurring', 'installment', 'installmentCount', 'installmentUnit', 'frequency', 'recurringStartDate'], required: false },
            { model: db.Transaction, as: 'children', attributes: ['id', 'description', 'amount', 'date', 'status', 'installmentCurrent'], required: false, order: [['date', 'ASC']] },
        ],
    });
    return updatedTransactionWithRelations.toJSON();
  }

  /**
   * Deleta uma transação existente para um usuário.
   * Lida com a reversão do impacto no saldo/fatura se a transação deletada estava 'cleared'.
   * @param {number} userId - O ID do usuário autenticado.
   * @param {number} transactionId - O ID da transação a ser deletada.
   * @param {boolean} deleteSeries - Se true, deleta todas as transações filhas (ocorrências/parcelas) se for a mestra.
   * @returns {Promise<void>}
   * @throws {ApiError} Se não for encontrada/pertencer ao usuário.
   */
  async deleteTransaction(userId, transactionId, deleteSeries = false) {
    const transaction = await this.TransactionModel.findOne({ where: { id: transactionId, userId: userId }, include: [{ model: db.Account, as: 'account' }, { model: db.Invoice, as: 'invoice' }, { model: db.Transaction, as: 'children' }] });
    if (!transaction) throw new ApiError(404, 'Transação não encontrada.');

    await db.sequelize.transaction(async (t) => {
        // 1. Reverter impacto financeiro (se 'cleared')
        if (transaction.status === 'cleared') {
            // Use o helper importado
            await revertTransactionImpact(transaction, { transaction: t, account: transaction.account, invoice: transaction.invoice });
        }

        // 2. Lógica para exclusão de séries (se for a transação mestra)
        if (transaction.recurring || transaction.installment) { // É uma transação mestra de série
            if (!deleteSeries) {
                 // Não permitir deletar a mestra sem deletar a série completa
                 throw new ApiError(400, 'Não é permitido deletar uma transação de série mestra sem deletar a série completa. Use `deleteSeries=true`.');
            }
            if (transaction.children && transaction.children.length > 0) {
                // Reverte impacto das filhas 'cleared' antes de deletar
                for (const child of transaction.children) {
                    if (child.status === 'cleared') {
                         // Precisa buscar a conta e fatura associadas para o helper revertTransactionImpact
                         const childAccount = await child.getAccount({transaction: t});
                         const childInvoice = await child.getInvoice({transaction: t});
                        // Use o helper importado
                        await revertTransactionImpact(child, { transaction: t, account: childAccount, invoice: childInvoice });
                    }
                }
                 const childIds = transaction.children.map(child => child.id);
                await this.TransactionModel.destroy({ where: { id: { [Op.in]: childIds } }, transaction: t });
                console.log(`Série da transação ${transaction.id} deletada: ${childIds.length} transações filhas removidas.`);
            }
        }

        // 3. Realiza a exclusão da transação principal
        await transaction.destroy({ transaction: t });
    }); // Fim da transação Sequelize
  }

    /**
     * Método para efetivar transações agendadas/pendentes que atingiram a data.
     * Idealmente chamado por um job agendado.
     * @returns {Promise<number>} O número de transações efetivadas.
     */
    async clearDueTransactions() {
        console.log('Iniciando efetivação de transações vencidas...');
        const today = startOfDay(new Date());
        const dueTransactions = await this.TransactionModel.findAll({
            where: {
                userId: { [Op.not]: null },
                status: { [Op.in]: ['pending', 'scheduled'] },
                date: { [Op.lte]: today }, // Compara objetos Date diretamente
            },
            include: [{ model: db.Account, as: 'account' }, { model: db.Invoice, as: 'invoice' }],
        });
        let clearedCount = 0;
        await db.sequelize.transaction(async (t) => {
            for (const transaction of dueTransactions) {
                try {
                    await transaction.update({ status: 'cleared' }, { transaction: t });
                    // transaction.account e transaction.invoice já estão incluídos na busca acima
                    // Use o helper importado
                    await applyTransactionImpact(transaction, { transaction: t, account: transaction.account, invoice: transaction.invoice });
                    clearedCount++;
                } catch (error) {
                    console.error(`Erro ao efetivar transação ${transaction.id}:`, error);
                }
            }
        });
        console.log(`Efetivação de transações vencidas concluída. Total efetivado: ${clearedCount}.`);
        return clearedCount;
    }
}

module.exports = TransactionService; // <<-- DEVE SER ASSIM