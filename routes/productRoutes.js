const express = require('express');

function createProductRoutes(controller) {
  const router = express.Router();
  router.get('/products', controller.listAll);
  router.get('/category/:slug', controller.listCategory);
  router.get('/api/cards', controller.cards);
  return router;
}

module.exports = createProductRoutes;