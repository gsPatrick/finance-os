// src/services/index.js (CORRIGIDO: Ordem de instanciação e injeção)

console.log('[services/index.js] File loaded. Starting service instantiation...');

// Importe as classes de serviço dos seus respectivos módulos/features
// Certifique-se de que CADA UM DESTES ARQUIVOS EXPORTA A CLASSE, NÃO A INSTÂNCIA
console.log('[services/index.js] Importing UserService class');
const UserService = require('../features/user/user.service'); // Caminho corrigido
console.log('[services/index.js] Importing AccountService class');
const AccountService = require('../features/account/account.service'); // Caminho corrigido
console.log('[services/index.js] Importing TransactionService class');
const TransactionService = require('../features/transaction/transaction.service'); // Caminho corrigido
console.log('[services/index.js] Importing InvoiceService class');
const InvoiceService = require('../features/invoice/invoice.service'); // Caminho corrigido
console.log('[services/index.js] Importing CategoryService class');
const CategoryService = require('../features/category/category.service'); // Caminho corrigido
console.log('[services/index.js] Importing CalendarEventTypeService class');
const CalendarEventTypeService = require('../features/calendarEventType/calendarEventType.service'); // Caminho corrigido
console.log('[services/index.js] Importing CalendarEventService class');
const CalendarEventService = require('../features/calendarEvent/calendarEvent.service'); // Caminho corrigido
console.log('[services/index.js] Importing InvestmentService class');
const InvestmentService = require('../features/investment/investment.service'); // Caminho corrigido
console.log('[services/index.js] Importing AuthService class');
const AuthService = require('../features/auth/auth.service'); // Caminho corrigido
// Importa a instância já exportada do DashboardService
const DashboardServiceInstance = require('../features/dashboard/dashboard.service'); // <-- Importa a instância


// Crie instâncias dos serviços a partir das classes importadas
// IMPORTANTE: Crie dependências ANTES dos serviços que dependem delas
console.log('[services/index.js] Instantiating UserService');
const userServiceInstance = new UserService();

console.log('[services/index.js] Instantiating AccountService');
const accountServiceInstance = new AccountService(); // <-- Crie ANTES do AuthService

// INSTANCIE AuthService PASSANDO AS DEPENDÊNCIAS NECESSÁRIAS (userService, accountService)
console.log('[services/index.js] Instantiating AuthService, injecting userService and accountService');
const authServiceInstance = new AuthService(userServiceInstance, accountServiceInstance); // <-- PASSA AMBAS AS INSTÂNCIAS

console.log('[services/index.js] Instantiating other services...');
const transactionServiceInstance = new TransactionService();
const invoiceServiceInstance = new InvoiceService();
const categoryServiceInstance = new CategoryService();
const calendarEventTypeServiceInstance = new CalendarEventTypeService();
const calendarEventServiceInstance = new CalendarEventService();
const investmentServiceInstance = new InvestmentService();
console.log('[services/index.js] All services instantiated.');


console.log('[services/index.js] Exporting service instances');
module.exports = {
    userService: userServiceInstance,
    authService: authServiceInstance, // <-- Instância criada com dependências
    accountService: accountServiceInstance,
    transactionService: transactionServiceInstance,
    invoiceService: invoiceServiceInstance,
    categoryService: categoryServiceInstance,
    calendarEventTypeService: calendarEventTypeServiceInstance,
    calendarEventService: calendarEventServiceInstance,
    investmentService: investmentServiceInstance,
    dashboardService: DashboardServiceInstance, // Exporta a instância importada
};
console.log('[services/index.js] Export complete.');