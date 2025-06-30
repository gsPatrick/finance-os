// src/modules/financialImpact/financialImpact.helper.js

const db = require('../../models'); // Acessar os modelos aqui
const ApiError = require('../errors/apiError'); // Para lançar erros internos se as contas não forem encontradas

/**
 * Aplica o impacto financeiro de uma transação no saldo da conta e/ou total da fatura.
 * Deve ser chamada para transações com status 'cleared'.
 * @param {object} transactionData - Objeto simples contendo amount, type, accountId, invoiceId, e a relação 'account' (ou será buscada).
 * @param {object} [options] - Opções Sequelize (transaction, include).
 * @returns {Promise<void>}
 */
const applyTransactionImpact = async (transactionData, options = {}) => {
    const { amount, type, accountId, invoiceId } = transactionData;
    const t = options.transaction;

    // Tenta usar a relação 'account' já carregada, ou busca a conta
    const account = transactionData.account || await db.Account.findByPk(accountId, { transaction: t });
    if (!account) {
        console.error(`Erro financeiro: Conta ${accountId} não encontrada para aplicar impacto.`);
        throw new ApiError(500, 'Conta associada não encontrada ao aplicar impacto financeiro.');
    }

    const value = parseFloat(amount);

    if (account.type === 'cash') {
        const balanceChange = type === 'income' ? value : -value;
        await account.increment('currentBalance', { by: balanceChange, transaction: t });
        console.log(`[IMPACTO] Saldo da conta cash "${account.name}" (${account.id}) atualizado em ${balanceChange}.`);
    } else if (account.type === 'credit_card' && type === 'expense') {
        if (invoiceId) {
            // Tenta usar a relação 'invoice' já carregada, ou busca a fatura
            const invoice = transactionData.invoice || await db.Invoice.findByPk(invoiceId, { transaction: t });
            if (invoice) {
                await invoice.increment('total', { by: value, transaction: t });
                console.log(`[IMPACTO] Total da fatura "${invoice.month}/${invoice.year}" (${invoice.id}) do cartão "${account.name}" atualizado em +${value}.`);
            } else {
                console.warn(`[IMPACTO] Despesa de cartão (${transactionData.id}) 'cleared' mas fatura ${invoiceId} não encontrada. Total da fatura não atualizado.`);
            }
        }
    }
};

/**
 * Reverte o impacto financeiro de uma transação no saldo da conta e/ou total da fatura.
 * Deve ser chamada para transações que *eram* 'cleared' e estão sendo desefetivadas ou deletadas.
 * @param {object} transactionData - Objeto simples contendo amount, type, accountId, invoiceId, e a relação 'account' (ou será buscada).
 * @param {object} [options] - Opções Sequelize (transaction, include).
 * @returns {Promise<void>}
*/
const revertTransactionImpact = async (transactionData, options = {}) => {
    const { amount, type, accountId, invoiceId } = transactionData;
    const t = options.transaction;

    const account = transactionData.account || await db.Account.findByPk(accountId, { transaction: t });
    if (!account) {
        console.error(`Erro financeiro: Conta ${accountId} não encontrada para reverter impacto.`);
        throw new ApiError(500, 'Conta associada não encontrada ao reverter impacto financeiro.');
    }

    const value = parseFloat(amount);

    if (account.type === 'cash') {
        const balanceChange = type === 'income' ? -value : value; // Sinal invertido
        await account.increment('currentBalance', { by: balanceChange, transaction: t });
        console.log(`[REVERSÃO] Saldo da conta cash "${account.name}" (${account.id}) revertido em ${balanceChange}.`);
    } else if (account.type === 'credit_card' && type === 'expense') {
        if (invoiceId) {
            const invoice = transactionData.invoice || await db.Invoice.findByPk(invoiceId, { transaction: t });
            if (invoice) {
                await invoice.increment('total', { by: -value, transaction: t }); // Subtrai
                console.log(`[REVERSÃO] Total da fatura "${invoice.month}/${invoice.year}" (${invoice.id}) do cartão "${account.name}" revertido em -${value}.`);
            } else {
                console.warn(`[REVERSÃO] Despesa de cartão (${transactionData.id}) excluída/desefetivada mas fatura ${invoiceId} não encontrada. Total da fatura não revertido.`);
            }
        }
    }
};

module.exports = {
    applyTransactionImpact,
    revertTransactionImpact,
};