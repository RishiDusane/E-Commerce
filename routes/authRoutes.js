const express = require('express');
const authRateLimit = require('../middleware/authRateLimit');
const { authenticate } = require('../middleware/auth');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/register', authRateLimit, authController.register);
router.post('/login', authRateLimit, authController.login);
router.get('/me', authenticate, authController.me);
router.post('/bootstrap-admin', authRateLimit, authController.bootstrapAdmin);

module.exports = router;
