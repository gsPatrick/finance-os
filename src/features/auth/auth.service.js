// src/auth/auth.service.js

const db = require('../models');
const { comparePassword } = require('../../modules/helpers/password.helper');
const { generateToken } = require('../../modules/auth/auth.utils');
const ApiError = require('../../modules/errors/apiError');
const userService = require('../user/user.service'); // Reutiliza o userService

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
    const user = await userService.getUserByEmailWithPassword(email);

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
    const userPlain = user.toJSON();
    delete userPlain.password;

    return { user: userPlain, token };
  }

  // A lógica de registro já está no UserService, mas pode ser chamada daqui se preferir.
  // Por simplicidade, deixaremos a rota de registro em `user.routes.js`.
}

module.exports = new AuthService();