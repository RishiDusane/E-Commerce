const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

const router = express.Router();

router.get('/stats', authenticate, requireAdmin, dashboardController.getStats);

module.exports = router;
