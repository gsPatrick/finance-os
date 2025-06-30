// src/modules/helpers/catchAsync.helper.js

/**
 * Helper para encapsular funções assíncronas de controllers.
 * Garante que qualquer exceção em uma função async seja passada para o próximo middleware
 * (geralmente o middleware de tratamento de erros).
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(err => next(err));
};

module.exports = catchAsync;