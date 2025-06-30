// src/category/category.routes.js

const express = require('express');
const categoryController = require('./category.controller');
const authMiddleware = require('../../modules/auth/auth.middleware'); // Middleware de autenticação
const validate = require('../../modules/validation/validate.middleware'); // Middleware de validação Joi
const categoryValidation = require('../../modules/validation/schemas/category.validation'); // Esquemas de validação para Category

const router = express.Router();

// Aplica o middleware de autenticação a todas as rotas definidas ABAIXO
router.use(authMiddleware);

// --- Rotas que requerem autenticação a partir daqui ---

// POST /api/v1/categories
// Cria uma nova categoria para o usuário autenticado.
router.post(
  '/',
  validate({ body: categoryValidation.createCategory }),
  categoryController.createCategory
);

// GET /api/v1/categories
// Busca todas as categorias do usuário autenticado com filtros, paginação e ordenação.
router.get(
  '/',
  validate({ query: categoryValidation.getCategoriesQuery }),
  categoryController.getCategories
);

// GET /api/v1/categories/:categoryId
// Busca uma categoria específica do usuário autenticado pelo ID.
router.get(
  '/:categoryId',
  validate({ params: categoryValidation.categoryIdParam }),
  categoryController.getCategory
);

// PUT /api/v1/categories/:categoryId
// Atualiza uma categoria específica do usuário autenticado pelo ID.
router.put(
  '/:categoryId',
  validate({ params: categoryValidation.categoryIdParam, body: categoryValidation.updateCategory }),
  categoryController.updateCategory
);

// DELETE /api/v1/categories/:categoryId
// Deleta uma categoria específica do usuário autenticado pelo ID.
router.delete(
  '/:categoryId',
  validate({ params: categoryValidation.categoryIdParam }),
  categoryController.deleteCategory
);

module.exports = router;