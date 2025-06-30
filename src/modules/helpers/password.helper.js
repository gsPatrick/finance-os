// src/modules/helpers/password.helper.js

const bcrypt = require('bcryptjs');

/**
 * Hashes uma senha usando bcrypt.
 * @param {string} password - A senha a ser hashed.
 * @returns {Promise<string>} O hash da senha.
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10); // Gera um salt com custo 10
  return bcrypt.hash(password, salt);
};

/**
 * Compara uma senha em texto puro com um hash.
 * @param {string} password - A senha em texto puro.
 * @param {string} hashedPassword - O hash da senha armazenado.
 * @returns {Promise<boolean>} True se a senha corresponder ao hash, caso contrário False.
 */
const comparePassword = async (password, hashedPassword) => {
  return bcrypt.compare(password, hashedPassword);
};

module.exports = {
  hashPassword,
  comparePassword,
};