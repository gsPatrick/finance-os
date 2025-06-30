// src/services/index.js

console.log('[services/index.js] File loaded. Starting service instantiation...');

// Importe as classes de serviço dos seus respectivos módulos/features
// Certifique-se de que CADA UM DESTES ARQUIVOS EXPORTA A CLASSE, NÃO A INSTÂNCIA
console.log('[services/index.js] Importing UserService class');
const UserService = require('../features/user/user.service'); // Caminho corrigido assumindo src/user
console.log('[services/index.js] Importing AccountService class');
const AccountService = require('./features/account/account.service'); // Caminho corrigido assumindo src/account
console.log('[services/index.js] Importing TransactionService class');
const TransactionService = require('./features/transaction/transaction.service'); // Caminho corrigido assumindo src/transaction
console.log('[services/index.js] Importing InvoiceService class');
const InvoiceService = require('./features/invoice/invoice.service'); // Caminho corrigido assumindo src/invoice
console.log('[services/index.js] Importing CategoryService class');
const CategoryService = require('./features/category/category.service'); // Caminho corrigido assumindo src/category
console.log('[services/index.js] Importing CalendarEventTypeService class');
const CalendarEventTypeService = require('./features/calendarEventType/calendarEventType.service'); // Caminho corrigido assumindo src/calendarEventType
console.log('[services/index.js] Importing CalendarEventService class');
const CalendarEventService = require('./features/calendarEvent/calendarEvent.service'); // Caminho corrigido assumindo src/calendarEvent
console.log('[services/index.js] Importing InvestmentService class');
const InvestmentService = require('./features/investment/investment.service'); // Caminho corrigido assumindo src/investment
console.log('[services/index.js] Importing AuthService class');
const AuthService = require('./features/auth/auth.service'); // Caminho corrigido assumindo src/auth

// Crie instâncias dos serviços a partir das classes importadas
// Exportamos diretamente um objeto com as instâncias para serem usadas em toda a aplicação.
// Ao fazer "require('./features/./features/services')", você receberá este objeto com as instâncias prontas.

console.log('[services/index.js] Instantiating UserService');
const userServiceInstance = new UserService();

console.log('[services/index.js] Instantiating AccountService');
const accountServiceInstance = new AccountService();

// INSTANCIE AuthService PASSANDO AS DEPENDÊNCIAS NECESSÁRIAS (userService, accountService)
console.log('[services/index.js] Instantiating AuthService, injecting userService and accountService');
const authServiceInstance = new AuthService(userServiceInstance, accountServiceInstance); // <-- PASSA A INSTÂNCIA DO ACCOUNT SERVICE AQUI TAMBÉM

console.log('[services/index.js] Instantiating other services...');
const transactionServiceInstance = new TransactionService();
const invoiceServiceInstance = new InvoiceService();
const categoryServiceInstance = new CategoryService();
const calendarEventTypeServiceInstance = new CalendarEventTypeService();
const calendarEventServiceInstance = new CalendarEventService();
const investmentServiceInstance = new InvestmentService();
// DashboardService JÁ exporta uma instância, mantém a importação direta dele.
const dashboardServiceInstance = require('../features/dashboard/dashboard.service');
console.log('[services/index.js] All services instantiated.');


console.log('[services/index.js] Exporting service instances');
module.exports = {
    userService: userServiceInstance, // <-- Instância criada
    authService: authServiceInstance, // <-- Instância criada (com userService e accountService injetados)
    accountService: accountServiceInstance,
    transactionService: transactionServiceInstance,
    invoiceService: invoiceServiceInstance,
    categoryService: categoryServiceInstance,
    calendarEventTypeService: calendarEventTypeServiceInstance,
    calendarEventService: calendarEventServiceInstance,
    investmentService: investmentServiceInstance,
    dashboardService: dashboardServiceInstance, // Exporta a instância já importada
};
console.log('[services/index.js] Export complete.');