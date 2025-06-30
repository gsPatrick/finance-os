// src/services/index.js

console.log('[services/index.js] File loaded. Starting service instantiation...');

// Importe as classes de serviço dos seus respectivos módulos/features
// Certifique-se de que CADA UM DESTES ARQUIVOS EXPORTA A CLASSE, NÃO A INSTÂNCIA
console.log('[services/index.js] Importing UserService class');
const UserService = require('../../src/features/user/user.service');
console.log('[services/index.js] Importing AccountService class');
const AccountService = require('../../src/features/account/account.service');
console.log('[services/index.js] Importing TransactionService class');
const TransactionService = require('../../src/features/transaction/transaction.service');
console.log('[services/index.js] Importing InvoiceService class');
const InvoiceService = require('../../src/features/invoice/invoice.service');
console.log('[services/index.js] Importing CategoryService class');
const CategoryService = require('../../src/features/category/category.service');
console.log('[services/index.js] Importing CalendarEventTypeService class');
const CalendarEventTypeService = require('../../src/features/calendarEventType/calendarEventType.service');
console.log('[services/index.js] Importing CalendarEventService class');
const CalendarEventService = require('../../src/features/calendarEvent/calendarEvent.service');
console.log('[services/index.js] Importing InvestmentService class');
const InvestmentService = require('../../src/features/investment/investment.service');
console.log('[services/index.js] Importing AuthService class');
const AuthService = require('../../src/features/auth/auth.service'); // Importa a CLASSE AuthService


// Crie instâncias dos serviços a partir das classes importadas
// Exportamos diretamente um objeto com as instâncias para serem usadas em toda a aplicação.
// Ao fazer "require('../../services')", você receberá este objeto com as instâncias prontas.

console.log('[services/index.js] Instantiating UserService');
const userServiceInstance = new UserService();

// INSTANCIE AuthService PASSANDO AS DEPENDÊNCIAS NECESSÁRIAS (NO CASO, userService)
console.log('[services/index.js] Instantiating AuthService, injecting userService');
const authServiceInstance = new AuthService(userServiceInstance); // <-- PASSA A INSTÂNCIA DO USER SERVICE AQUI

console.log('[services/index.js] Instantiating other services...');
const accountServiceInstance = new AccountService();
const transactionServiceInstance = new TransactionService();
const invoiceServiceInstance = new InvoiceService();
const categoryServiceInstance = new CategoryService();
const calendarEventTypeServiceInstance = new CalendarEventTypeService();
const calendarEventServiceInstance = new CalendarEventService();
const investmentServiceInstance = new InvestmentService();
console.log('[services/index.js] All services instantiated.');


console.log('[services/index.js] Exporting service instances');
module.exports = {
    userService: userServiceInstance, // <-- Instância criada
    authService: authServiceInstance, // <-- Instância criada (com userService injetado)
    accountService: accountServiceInstance,
    transactionService: transactionServiceInstance,
    invoiceService: invoiceServiceInstance,
    categoryService: categoryServiceInstance,
    calendarEventTypeService: calendarEventTypeServiceInstance,
    calendarEventService: calendarEventServiceInstance,
    investmentService: investmentServiceInstance,
};
console.log('[services/index.js] Export complete.');