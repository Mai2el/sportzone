const express = require('express');

function createAuthRoutes(controller) {
  const router = express.Router();
  router.get('/login', controller.showLogin);
  router.post('/login', controller.login);
  router.get('/register', controller.showRegister);
  router.post('/register', controller.register);
  router.post('/logout', controller.logout);
  return router;
}

module.exports = createAuthRoutes;