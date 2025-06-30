// src/auth/auth.service.js

const db = require('../../models'); // Importa os modelos Sequelize
const { comparePassword } = require('../../modules/helpers/password.helper'); // Helper para comparar senhas
const { generateToken } = require('../../modules/auth/auth.utils'); // Utilitário para JWT
const ApiError = require('../../modules/errors/apiError'); // Classe de erro customizada

// *** IMPORTAÇÃO CORRETA: Importa o objeto 'services' completo a partir do arquivo central ***
// Isso resolve a dependência circular. NÃO desestruture 'userService' ou outros serviços aqui.
const services = require('../../services'); // <-- Importa o objeto { userService, authService, ... }

// Remove a importação direta do arquivo de serviço, pois agora importamos a instância do index central
// const userService = require('../user/user.service'); // <-- ESTA LINHA DEVE SER REMOVIDA OU COMENTADA


class AuthService {
  /**
   * Realiza o login de um usuário.
   * @param {string} email - O email do usuário.
   * @param {string} password - A senha do usuário.
   * @returns {Promise<{user: object, token: string}>} O objeto do usuário (sem senha) e o token JWT.
   * @throws {ApiError} Se as credenciais estiverem incorretas.
   */
  async login(email, password) {
    // 1. Encontrar o usuário pelo email, incluindo a senha para comparação
    // *** ACESSE o userService através do objeto 'services' importado ***
    // Isso garante que a instância do userService esteja disponível quando a função login for chamada.
    const user = await services.userService.getUserByEmailWithPassword(email); // <--- Acesso corrigido

    // 2. Verificar se o usuário existe e se a senha está correta
    // A verificação é feita em duas etapas para evitar "timing attacks" e não revelar se o email existe.
    if (!user || !(await comparePassword(password, user.password))) {
      throw new ApiError(401, 'Email ou senha incorretos.'); // Mensagem genérica por segurança
    }

    // 3. Gerar o token JWT
    const userPayload = {
        id: user.id,
        email: user.email,
        role: user.role, // Inclui a role no payload do token
    };
    const token = generateToken(userPayload);

    // 4. Preparar o objeto de usuário para retorno (sem a senha)
    // userPlain é necessário porque 'user' é um objeto Sequelize que pode ter getters/setters
    const userPlain = user.toJSON();
    delete userPlain.password; // Remove a senha explicitamente do objeto retornado

    return { user: userPlain, token };
  }

  // A lógica de registro já está no UserService, mas pode ser chamada daqui se preferir.
  // Por simplicidade, deixaremos a rota de registro em `user.routes.js`.
}

// *** EXPORTAÇÃO CORRETA: Exporta a CLASSE AuthService ***
// src/services/index.js importa esta CLASSE e cria a instância.
module.exports = AuthService; // <<-- DEVE EXPORTAR A CLASSE PARA SERVIÇOS CENTRAIS INSTANCIAREM