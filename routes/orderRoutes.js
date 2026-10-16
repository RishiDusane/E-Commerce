const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const orderController = require('../controllers/orderController');

const router = express.Router();
router.use(authenticate);

router.post('/', orderController.placeOrder);
router.get('/my-orders', orderController.listMyOrders);
router.get('/', requireAdmin, orderController.listAllOrders);
router.get('/:id', orderController.getOrder);
router.patch('/:id/status', requireAdmin, orderController.updateStatus);

module.exports = router;
