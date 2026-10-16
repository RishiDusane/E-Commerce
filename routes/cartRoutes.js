const express = require('express');
const { authenticate } = require('../middleware/auth');
const cartController = require('../controllers/cartController');

const router = express.Router();
router.use(authenticate);

router.get('/', cartController.getCart);
router.post('/', cartController.addItem);
router.put('/:productId', cartController.updateItem);
router.delete('/:productId', cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
