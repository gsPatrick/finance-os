// src/modules/helpers/password.helper.js

const bcrypt = require('bcryptjs');

console.log('[password.helper.js] File loaded');


/**
 * Hashes uma senha usando bcrypt.
 * @param {string} password - A senha a ser hashed.
 * @returns {Promise<string>} O hash da senha.
 */
const hashPassword = async (password) => {
  console.log('[password.helper.js] hashPassword called');
  const salt = await bcrypt.genSalt(10); // Gera um salt com custo 10
  console.log('[password.helper.js] Salt generated');
  const hashedPassword = await bcrypt.hash(password, salt);
  console.log('[password.helper.js] Password hashed');
  return hashedPassword;
};

/**
 * Compara uma senha em texto puro com um hash.
 * @param {string} password - A senha em texto puro.
 * @param {string} hashedPassword - O hash da senha armazenado.
 * @returns {Promise<boolean>} True se a senha corresponder ao hash, caso contrário False.
 */
const comparePassword = async (password, hashedPassword) => {
  console.log('[password.helper.js] comparePassword called');
  const match = await bcrypt.compare(password, hashedPassword);
  console.log('[password.helper.js] Password comparison result:', match);
  return match;
};

console.log('[password.helper.js] Exporting hashPassword and comparePassword');
module.exports = {
  hashPassword,
  comparePassword,
};