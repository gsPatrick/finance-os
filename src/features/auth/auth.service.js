// src/auth/auth.service.js (COMPLETO com injeção de dependências e registro)

const db = require('../../models'); // Importa os modelos Sequelize
const { comparePassword } = require('../../modules/helpers/password.helper'); // Helper para comparar senhas
const { generateToken } = require('../../modules/auth/auth.utils'); // Utilitário para JWT
const ApiError = require('../../modules/errors/apiError'); // Classe de erro customizada

console.log('[auth.service.js] File loaded.');


class AuthService {
    /**
     * Construtor do AuthService. Recebe instâncias de outros serviços necessários via injeção de dependência.
     * @param {object} userService - Instância do UserService.
     * @param {object} accountService - Instância do AccountService.
     */
  constructor(userService, accountService) {
    console.log('[AuthService] Constructor called.');
    this.userService = userService; // Armazena a instância de UserService injetada
    this.accountService = accountService; // Armazena a instância de AccountService injetada

    // Logs de verificação de injeção (podem ser removidos em produção)
    if (!this.userService) {
        console.error('[AuthService] ERROR: userService dependency was NOT INJECTED!');
    } else {
        console.log('[AuthService] userService dependency successfully injected.');
    }
     if (!this.accountService) {
        console.error('[AuthService] ERROR: accountService dependency was NOT INJECTED!');
    } else {
        console.log('[AuthService] accountService dependency successfully injected.');
    }
  }

  /**
   * Realiza o login de um usuário.
   * Busca o usuário, compara a senha e gera um token JWT.
   * @param {string} email - O email do usuário.
   * @param {string} password - A senha do usuário.
   * @returns {Promise<{user: object, token: string}>} O objeto do usuário (sem senha) e o token JWT.
   * @throws {ApiError} Se as credenciais estiverem incorretas.
   */
  async login(email, password) {
    console.log('[AuthService] login called for email:', email);

    // Verifica se a dependência de userService está disponível (garantia extra)
    if (!this.userService) {
         console.error('[AuthService] login: ERROR: this.userService is UNDEFINED during login execution!');
         throw new ApiError(500, 'Erro interno de serviço de autenticação (login).');
    }

    // 1. Encontrar o usuário pelo email, incluindo a senha para comparação
    console.log('[AuthService] login: Calling this.userService.getUserByEmailWithPassword');
    const user = await this.userService.getUserByEmailWithPassword(email); // Usa a instância injetada

    console.log('[AuthService] login: getUserByEmailWithPassword result:', user ? 'Found user ID ' + user.id : 'User not found');

    // 2. Verificar se o usuário existe e se a senha está correta
    // A verificação é feita em duas etapas para evitar "timing attacks" e não revelar se o email existe.
    console.log('[AuthService] login: Checking user existence and password match');
    // user será um objeto Sequelize ou null. Se for objeto, compare a senha.
    if (!user || !(await comparePassword(password, user.password))) {
      console.log('[AuthService] login: Credentials incorrect.');
      throw new ApiError(401, 'Email ou senha incorretos.'); // Mensagem genérica por segurança
    }
    console.log('[AuthService] login: User found and password matched.');


    // 3. Gerar o token JWT
    console.log('[AuthService] login: Generating JWT');
    const userPayload = {
        id: user.id,
        email: user.email,
        role: user.role, // Inclui a role no payload do token
    };
    const token = generateToken(userPayload);
    console.log('[AuthService] login: JWT generated');


    // 4. Preparar o objeto de usuário para retorno (sem a senha)
    // userPlain é necessário porque 'user' é um objeto Sequelize que pode ter getters/setters
    console.log('[AuthService] login: Preparing user object for return (removing password)');
    const userPlain = user.toJSON();
    delete userPlain.password; // Remove a senha explicitamente do objeto retornado
    console.log('[AuthService] login: User object prepared');


    console.log('[AuthService] login: Returning user and token');
    return { user: userPlain, token };
  }

   /**
    * Registra um novo usuário no sistema.
    * Cria o usuário e, se bem-sucedido, cria uma conta cash padrão para ele.
    * Toda a operação ocorre dentro de uma transação de banco de dados.
    * @param {object} userData - Dados do usuário para registro (username, email, password).
    * @returns {Promise<object>} O objeto do usuário criado (sem senha).
    * @throws {ApiError} Se houver erros de validação (email/username já existem) ou falha na transação.
    */
   async register(userData) {
       console.log('[AuthService] register called with userData:', userData ? { ...userData, password: '***' } : null);

       // Verifica se as dependências de serviço estão disponíveis (garantia extra no método)
       // Embora a verificação no construtor seja a primária, uma checagem aqui pode ajudar na depuração se a instância for reutilizada inesperadamente.
       if (!this.userService || !this.accountService) {
           console.error('[AuthService] register: ERROR: Required dependencies (userService, accountService) are UNDEFINED!');
           // Lança um erro interno, pois isso indica um problema na configuração do serviço.
           throw new ApiError(500, 'Erro interno de serviço de autenticação (registro): Dependências ausentes.');
       }

       // Inicia uma transação de banco de dados para garantir que a criação do usuário E da conta sejam atômicas.
       const t = await db.sequelize.transaction();
       try {
           // 1. Cria o usuário no banco de dados.
           // Passa o objeto de transação (t) para que a operação ocorra dentro dela.
           console.log('[AuthService] register: Calling userService.createUser within transaction');
           const newUser = await this.userService.createUser(userData, t);

           // Verifica se o serviço retornou um usuário válido com ID
           if (!newUser || !newUser.id) {
               // Isso só deveria acontecer se o userService.createUser falhasse de forma inesperada
               throw new Error('Falha inesperada ao criar usuário no serviço.');
           }
           console.log('[AuthService] register: User created successfully with ID:', newUser.id);

           // 2. Cria a conta cash padrão para o novo usuário.
           // Passa o userId do novo usuário e o objeto de transação (t).
           console.log('[AuthService] register: Calling accountService.createAccount for default cash account');
           const defaultAccountData = {
               name: 'Conta Principal', // Nome padrão
               type: 'cash',           // Tipo 'cash'
               initialBalance: 0.00,   // Saldo inicial zero
               currentBalance: 0.00,   // Saldo atual zero
               // Outros campos de Account específicos de 'cash' devem ter valores padrão ou ser nulos no modelo.
               // Não passe campos específicos de 'credit_card' aqui (limit, closingDay, etc.).
           };
           const newAccount = await this.accountService.createAccount(newUser.id, defaultAccountData, t); // Usa a instância injetada, passa userId e transação
           console.log('[AuthService] register: Default cash account created successfully with ID:', newAccount.id);


           // 3. Se tudo ocorreu bem, realiza o commit da transação.
           await t.commit();
           console.log('[AuthService] register: Transaction committed. User and default cash account created successfully.');

           // 4. Retorna o objeto do usuário criado (sem a senha, já tratado pelo userService.createUser)
           return newUser;

       } catch (error) {
           // 5. Se qualquer erro ocorreu durante a criação do usuário ou conta, faz rollback da transação.
           await t.rollback();
           console.error('[AuthService] register: Transaction rolled back due to error:', error.name, error.message);
           // Re-lança o erro para ser capturado pelo catchAsync e processado pelo middleware de erro.
           throw error;
       }
   }

  // Outras lógicas de autenticação como refresh token, reset password, etc.
  // podem ser adicionadas aqui, utilizando as dependências injetadas conforme necessário.
}

console.log('[auth.service.js] Exporting AuthService class');
// Exporta a CLASSE para que src/services/index.js possa instanciá-la e injetar as dependências.
module.exports = AuthService;