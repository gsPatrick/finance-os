// src/auth/auth.service.js (MODIFICADO para incluir registro e criação de conta padrão)

const db = require('../../models');
const { comparePassword } = require('../../modules/helpers/password.helper');
const { generateToken } = require('../../modules/auth/auth.utils');
const ApiError = require('../../modules/errors/apiError');

console.log('[auth.service.js] File loaded.');

class AuthService {
    // CONSTRUCTOR: RECEBER AS INSTÂNCIAS DE SERVIÇO INJETADAS
  constructor(userService, accountService) { // <-- RECEBE accountService AQUI
    console.log('[AuthService] Constructor called.');
    this.userService = userService;
    this.accountService = accountService; // <-- ARMAZENA accountService
    if (!this.userService) {
        console.error('[AuthService] ERROR: userService dependency was NOT INJECTED!');
    } else {
        console.log('[AuthService] userService dependency successfully injected.');
    }
     if (!this.accountService) { // <-- Verifica accountService
        console.error('[AuthService] ERROR: accountService dependency was NOT INJECTED!');
    } else {
        console.log('[AuthService] accountService dependency successfully injected.');
    }
  }

  /**
   * Realiza o login de um usuário.
   * @param {string} email - O email do usuário.
   * @param {string} password - A senha do usuário.
   * @returns {Promise<{user: object, token: string}>} O objeto do usuário (sem senha) e o token JWT.
   * @throws {ApiError} Se as credenciais estiverem incorretas.
   */
  async login(email, password) {
    console.log('[AuthService] login called for email:', email);

    if (!this.userService) {
         console.error('[AuthService] login: ERROR: this.userService is UNDEFINED during login execution!');
         throw new ApiError(500, 'Erro interno de serviço de autenticação (login).');
    }
    const user = await this.userService.getUserByEmailWithPassword(email);

    console.log('[AuthService] login: getUserByEmailWithPassword result:', user ? 'Found user ID ' + user.id : 'User not found');

    console.log('[AuthService] login: Checking user existence and password match');
    if (!user || !(await comparePassword(password, user.password))) {
      console.log('[AuthService] login: Credentials incorrect.');
      throw new ApiError(401, 'Email ou senha incorretos.');
    }
    console.log('[AuthService] login: User found and password matched.');

    console.log('[AuthService] login: Generating JWT');
    const userPayload = {
        id: user.id,
        email: user.email,
        role: user.role,
    };
    const token = generateToken(userPayload);
    console.log('[AuthService] login: JWT generated');

    console.log('[AuthService] login: Preparing user object for return (removing password)');
    const userPlain = user.toJSON();
    delete userPlain.password;
    console.log('[AuthService] login: User object prepared');

    console.log('[AuthService] login: Returning user and token');
    return { user: userPlain, token };
  }

   /**
    * Registra um novo usuário e cria sua conta cash padrão.
    * @param {object} userData - Dados do usuário (username, email, password).
    * @returns {Promise<object>} O usuário criado (sem senha).
    * @throws {ApiError} Se a criação falhar.
    */
   async register(userData) {
       console.log('[AuthService] register called with userData:', userData ? { ...userData, password: '***' } : null);

       if (!this.userService || !this.accountService) { // <-- Verifica ambas as dependências
           console.error('[AuthService] register: ERROR: Dependencies are UNDEFINED!');
           throw new ApiError(500, 'Erro interno de serviço de autenticação (registro).');
       }

       // Usar uma transação para garantir que ou o usuário E a conta são criados, ou nada é.
       const t = await db.sequelize.transaction();
       try {
           // 1. Cria o usuário
           console.log('[AuthService] register: Calling userService.createUser within transaction');
           const newUser = await this.userService.createUser(userData, t); // Passa a transação
            // O userService.createUser já retorna o objeto sem senha.

           if (!newUser || !newUser.id) {
               throw new Error('Falha ao criar usuário.'); // Erro inesperado se o serviço não lançar antes
           }
           console.log('[AuthService] register: User created successfully with ID:', newUser.id);

           // 2. Cria a conta cash padrão para o novo usuário
           console.log('[AuthService] register: Calling accountService.createAccount for default cash account');
            // Dados para a conta padrão
           const defaultAccountData = {
               name: 'Conta Principal',
               type: 'cash',
               initialBalance: 0.00,
               currentBalance: 0.00,
               // Outros campos específicos de cash (se houver) devem ser nulos ou padrão
               // Não inclua campos de credit_card aqui (limit, closingDay, dueDay, brand, finalDigits, color, icon)
           };
           const newAccount = await this.accountService.createAccount(newUser.id, defaultAccountData, t); // Passa userId e transação
            console.log('[AuthService] register: Default cash account created successfully with ID:', newAccount.id);


           // 3. Commit da transação
           await t.commit();
           console.log('[AuthService] register: Transaction committed. User and account created.');

           // Retorna o objeto do usuário criado (já sem senha)
           return newUser;

       } catch (error) {
           // Se algo der errado, faz rollback da transação
           await t.rollback();
           console.error('[AuthService] register: Transaction rolled back due to error:', error.name, error.message);
           // Re-lança o erro para ser tratado pelo catchAsync e errorMiddleware
           throw error;
       }
   }

  // Outras lógicas de autenticação podem ser adicionadas aqui (refresh token, reset password, etc.)
}

console.log('[auth.service.js] Exporting AuthService class');
module.exports = AuthService;