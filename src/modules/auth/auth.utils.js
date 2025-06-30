// src/modules/auth/auth.utils.js

const jwt = require('jsonwebtoken');
// Você precisará definir o JWT_SECRET nas suas variáveis de ambiente ou arquivo de config
const config = require('../../config/config')[process.env.NODE_ENV || 'development']; // Ajuste o caminho se necessário

/**
 * Gera um JWT para um usuário.
 * @param {object} user - O objeto usuário ou payload para o token.
 * @returns {string} O token JWT.
 */
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    // Inclua outras informações essenciais no payload, como roles (admin, etc.)
    // role: user.role,
  };
  // O token expira em 1 dia (ajuste conforme sua política de segurança)
  return jwt.sign(payload, config.jwt.secret || 'your_default_jwt_secret', { expiresIn: '1d' });
};

/**
 * Verifica e decodifica um JWT.
 * @param {string} token - O token JWT.
 * @returns {object | null} O payload decodificado se válido, ou null se inválido/expirado.
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, config.jwt.secret || 'your_default_jwt_secret');
  } catch (error) {
    //console.error('Erro ao verificar token:', error.message);
    return null; // Token inválido ou expirado
  }
};

module.exports = {
  generateToken,
  verifyToken,
};