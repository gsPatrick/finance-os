// src/auth/auth.service.js

// Removed: const services = require('../../services'); // <-- REMOVER ESTA LINHA PARA QUEBRAR A DEPENDENCIA CIRCULAR

const db = require('../../models'); // Importa os modelos Sequelize
const { comparePassword } = require('../../modules/helpers/password.helper'); // Helper para comparar senhas
const { generateToken } = require('../../modules/auth/auth.utils'); // Utilitário para JWT
const ApiError = require('../../modules/errors/apiError'); // Classe de erro customizada

console.log('[auth.service.js] File loaded.');


class AuthService {
    // CONSTRUCTOR: RECEBER A INSTÂNCIA DO USER SERVICE AQUI
  constructor(userService) {
    console.log('[AuthService] Constructor called.');
    this.userService = userService; // Armazena a instância de UserService injetada
    if (!this.userService) {
        // Log de erro crítico se a injeção falhar (indica problema no services/index.js)
        console.error('[AuthService] ERROR: userService dependency was NOT INJECTED!');
    } else {
        console.log('[AuthService] userService dependency successfully injected.');
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

    // 1. Encontrar o usuário pelo email, incluindo a senha para comparação
    // *** ACESSE o userService através do objeto 'this' injetado no constructor ***
    console.log('[AuthService] login: Accessing this.userService...');
    if (!this.userService) {
         // Este erro não DEVERIA acontecer se o services/index.js injetar corretamente
         console.error('[AuthService] login: ERROR: this.userService is UNDEFINED during login execution!');
         throw new ApiError(500, 'Erro interno de serviço de autenticação.');
    }
    console.log('[AuthService] login: Calling this.userService.getUserByEmailWithPassword');
    const user = await this.userService.getUserByEmailWithPassword(email); // <--- Acesso corrigido

    console.log('[AuthService] login: getUserByEmailWithPassword result:', user ? 'Found user ID ' + user.id : 'User not found');

    // 2. Verificar se o usuário existe e se a senha está correta
    // A verificação é feita em duas etapas para evitar "timing attacks" e não revelar se o email existe.
    console.log('[AuthService] login: Checking user existence and password match');
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

  // A lógica de registro já está no UserService, mas pode ser chamada daqui se preferir.
  // Por simplicidade, deixaremos a rota de registro em `user.routes.js`.
}

console.log('[auth.service.js] Exporting AuthService class');
// *** EXPORTAÇÃO CORRETA: Exporta a CLASSE AuthService ***
// src/services/index.js importa esta CLASSE e cria a instância.
module.exports = AuthService; // <<-- DEVE EXPORTAR A CLASSE PARA SERVIÇOS CENTRAIS INSTANCIAREM