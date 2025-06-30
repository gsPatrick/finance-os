// src/services/index.js

// Importe as classes de serviço dos seus respectivos módulos/features
// Certifique-se de que CADA UM DESTES ARQUIVOS EXPORTA A CLASSE, NÃO A INSTÂNCIA
const UserService = require('../../src/features/user/user.service');
const AccountService = require('../../src/features/account/account.service');
const TransactionService = require('../../src/features/transaction/transaction.service');
const InvoiceService = require('../../src/features/invoice/invoice.service');
const CategoryService = require('../../src/features/category/category.service');
const CalendarEventTypeService = require('../../src/features/calendarEventType/calendarEventType.service');
const CalendarEventService = require('../../src/features/calendarEvent/calendarEvent.service');
const InvestmentService = require('../../src/features/investment/investment.service');
const AuthService = require('../../src/features/auth/auth.service'); // Importa a CLASSE AuthService


// Crie instâncias dos serviços a partir das classes importadas
// Exportamos diretamente um objeto com as instâncias para serem usadas em toda a aplicação.
// Ao fazer "require('../../services')", você receberá este objeto com as instâncias prontas.
module.exports = {
    userService: new UserService(), // <-- Instancia a CLASSE UserService
    accountService: new AccountService(), // <-- Instancia a CLASSE AccountService
    transactionService: new TransactionService(), // <-- Instancia a CLASSE TransactionService
    invoiceService: new InvoiceService(), // <-- Instancia a CLASSE InvoiceService
    categoryService: new CategoryService(), // <-- Instancia a CLASSE CategoryService
    calendarEventTypeService: new CalendarEventTypeService(), // <-- Instancia a CLASSE CalendarEventTypeService
    calendarEventService: new CalendarEventService(), // <-- Instancia a CLASSE CalendarEventService
    investmentService: new InvestmentService(), // <-- Instancia a CLASSE InvestmentService
    authService: new AuthService(), // <-- Instancia a CLASSE AuthService
};