// src/category/category.controller.js

const { categoryService } = require('../../services');
console.log('TYPEOF categoryService:', typeof categoryService); // Deve imprimir 'object'

const catchAsync = require('../../modules/helpers/catchAsync.helper');
const ApiError = require('../../modules/errors/apiError');
const { Op } = require('sequelize');


/**
 * Controlador para criar uma nova categoria.
 * Endpoint: POST /api/v1/categories
 * Requer autenticação.
 */
const createCategory = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.body já foi validado e limpo pelo middleware `validate` (createCategory schema)
  const categoryData = req.body;

   // O service garantirá a unicidade por usuário e associará ao usuário autenticado
  const newCategory = await categoryService.createCategory(userId, categoryData);

  res.status(201).json({ // 201 Created
    status: 'success',
    message: 'Categoria criada com sucesso.',
    data: newCategory,
  });
});

/**
 * Controlador para buscar categorias do usuário.
 * Endpoint: GET /api/v1/categories
 * Requer autenticação.
 */
const getCategories = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.query já foi validado e limpo pelo middleware `validate` (getCategoriesQuery schema)
  const queryParams = req.query;

  // Constrói as opções para o Service a partir dos query params
  const options = {
    limit: queryParams.limit,
    offset: (queryParams.page - 1) * queryParams.limit,
    where: {
        // Filtros específicos mapeados de query params para Sequelize where
        ...(queryParams.name && { name: queryParams.name }), // Busca exata por nome
        ...(queryParams.search && { search: queryParams.search }), // Termo para busca like no service

        // ... outros filtros
    },
    // Exemplo de ordenação
     order: queryParams.sortBy ? [[queryParams.sortBy.split(':')[0], queryParams.sortBy.split(':')[1] || 'ASC']] : [['name', 'ASC']], // Padrão por nome
    // Opcional: attributes, include
  };

  const categories = await categoryService.getCategories(userId, options);

  res.status(200).json({
    status: 'success',
    results: categories.rows.length,
    total: categories.count,
    data: categories.rows,
  });
});

/**
 * Controlador para buscar uma categoria específica pelo ID.
 * Endpoint: GET /api/v1/categories/:categoryId
 * Requer autenticação.
 */
const getCategory = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado pelo middleware `validate` (categoryIdParam schema)
  const categoryId = parseInt(req.params.categoryId, 10);

   // TODO: Adicionar opções de include se necessário (ex: incluir transações desta categoria)
   // const options = { include: [...] };

  const category = await categoryService.getCategoryById(userId, categoryId);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(200).json({
    status: 'success',
    data: category,
  });
});

/**
 * Controlador para atualizar uma categoria específica pelo ID.
 * Endpoint: PUT /api/v1/categories/:categoryId
 * Requer autenticação.
 */
const updateCategory = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params e req.body já foram validados e limpos pelo middleware `validate`
  const categoryId = parseInt(req.params.categoryId, 10);
  const updateData = req.body;

  // O service garantirá que a categoria pertence ao usuário e verificará unicidade do nome
  const updatedCategory = await categoryService.updateCategory(userId, categoryId, updateData);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(200).json({ // 200 OK
    status: 'success',
    message: 'Categoria atualizada com sucesso.',
    data: updatedCategory,
  });
});

/**
 * Controlador para deletar uma categoria específica pelo ID.
 * Endpoint: DELETE /api/v1/categories/:categoryId
 * Requer autenticação.
 */
const deleteCategory = catchAsync(async (req, res) => {
  const userId = req.user.id; // Obtém o ID do usuário autenticado
  // req.params já foi validado.
  const categoryId = parseInt(req.params.categoryId, 10);

  // O service garantirá que a categoria pertence ao usuário e cuidará da exclusão/quebra de links
  await categoryService.deleteCategory(userId, categoryId);
  // O service já lança 404, capturado pelo catchAsync.

  res.status(204).json({ // 204 No Content
    // status: 'success', // Não inclua status em 204
    // data: null,        // Não inclua corpo em 204
  });
});

module.exports = {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory,
};