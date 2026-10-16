const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const productController = require('../controllers/productController');

const router = express.Router();

router.get('/categories', productController.listCategories);
router.get('/', productController.listProducts);
router.get('/:id', productController.getProduct);
router.post('/', authenticate, requireAdmin, productController.createProduct);
router.put('/:id', authenticate, requireAdmin, productController.updateProduct);
router.delete('/:id', authenticate, requireAdmin, productController.deleteProduct);

module.exports = router;
