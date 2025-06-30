// src/services/index.js

// Importe as classes de serviço
const UserService = require('../../src/features/user/user.service');
const AccountService = require('../../src/features/account/account.service');
const TransactionService = require('../../src/features/transaction/transaction.service');
const InvoiceService = require('../../src/features/invoice/invoice.service');
const CategoryService = require('../../src/features/category/category.service');
const CalendarEventTypeService = require('../../src/features/calendarEventType/calendarEventType.service');
const CalendarEventService = require('../../src/features/calendarEvent/calendarEvent.service');
const InvestmentService = require('../../src/features/investment/investment.service');
const AuthService = require('../../src/features/auth/auth.service'); // Importa o AuthService


// Crie instâncias dos serviços
// Exportamos diretamente o objeto com as instâncias.
module.exports = {
    userService: new UserService(),
    accountService: new AccountService(),
    transactionService: new TransactionService(),
    invoiceService: new InvoiceService(),
    categoryService: new CategoryService(),
    calendarEventTypeService: new CalendarEventTypeService(),
    calendarEventService: new CalendarEventService(),
    investmentService: new InvestmentService(),
    authService: new AuthService(),
};