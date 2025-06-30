// src/modules/validation/schemas/investment.validation.js

const Joi = require('joi');

// Esquema base para o ID do investimento nos parâmetros
const investmentIdParam = Joi.object({
  investmentId: Joi.number().integer().positive().required(),
});

// Esquema para os query parameters na busca de investimentos
const getInvestmentsQuery = Joi.object({
  type: Joi.string().trim().optional(), // Filtrar por tipo de ativo ('Stock', 'Crypto', etc.)
  search: Joi.string().trim().optional(), // Buscar por asset (ticker), name

  // Parâmetros de busca por valor ou quantidade? (menos comum em query, mais em filtros)
  // minQuantity: Joi.number().precision(8).min(0).optional(),
  // maxQuantity: Joi.number().precision(8).min(0).optional(),
  // minValue: Joi.number().precision(2).min(0).optional(), // Valor total da posição

  // Parâmetros de paginação e ordenação
  limit: Joi.number().integer().positive().default(20).optional(), // Ajuste o default se necessário
  page: Joi.number().integer().positive().default(1).optional(),
  sortBy: Joi.string().optional(), // Formato esperado: 'campo:direcao' (ex: 'currentPrice:desc', 'asset:asc', 'quantity:desc')
   // Ordenar por valor total ('quantity' * 'currentPrice') seria complexo no ORM query, talvez calculado no service/frontend.

});


// Esquema para criação de investimento
const createInvestment = Joi.object({
  asset: Joi.string().trim().min(1).max(50).required(), // Ticker ou identificador
  name: Joi.string().trim().min(1).max(100).required(), // Nome completo
  type: Joi.string().trim().min(1).max(50).required(), // Tipo ('Stock', 'Crypto', 'Real Estate', etc.)
  quantity: Joi.number().precision(8).min(0).required(), // Quantidade (pode ser fracionada)
  avgPrice: Joi.number().precision(4).min(0).required(), // Preço médio de compra por unidade
  currentPrice: Joi.number().precision(4).min(0).optional().allow(null), // Preço atual (opcional na criação)
  dailyChange: Joi.number().precision(2).optional().allow(null), // Variação diária (opcional)
  history: Joi.array().items(Joi.number()).optional().allow(null), // Histórico de preços (array de números) - JSONB

  // TODO: Adicionar validação para currency, exchange, broker, etc.
});

// Esquema para atualização de investimento
const updateInvestment = Joi.object({
  // Campos que podem ser atualizados
  asset: Joi.string().trim().min(1).max(50).optional(),
  name: Joi.string().trim().min(1).max(100).optional(),
  type: Joi.string().trim().min(1).max(50).optional(),
   // Atualizar quantidade ou preço médio é complexo na vida real (implica em novos aportes/vendas).
   // Permitir aqui simplifica, mas a lógica de negócio pode querer endpoints específicos (ex: POST /investments/:id/buy, POST /investments/:id/sell)
  quantity: Joi.number().precision(8).min(0).optional(),
  avgPrice: Joi.number().precision(4).min(0).optional(),
   // Preço atual e variação geralmente vêm de atualizações externas, mas podem ser atualizados manualmente.
  currentPrice: Joi.number().precision(4).min(0).optional().allow(null),
  dailyChange: Joi.number().precision(2).optional().allow(null),
   // Atualizar histórico pode ser arriscado via PUT, talvez endpoint específico ou apenas via job de atualização.
   // history: Joi.array().items(Joi.number()).optional().allow(null),

  // TODO: Adicionar atualização para currency, exchange, broker, etc.
}).min(1); // Garante que pelo menos um campo esteja presente

module.exports = {
  investmentIdParam,
  getInvestmentsQuery,
  createInvestment,
  updateInvestment,
};