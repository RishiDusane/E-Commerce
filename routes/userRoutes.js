const express = require('express');
const { authenticate, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

router.use(authenticate);

router.get('/', requireAdmin, userController.listUsers);
router.get('/:id', requireSelfOrAdmin(), userController.getUser);
router.post('/', requireAdmin, userController.createUser);
router.put('/:id', requireSelfOrAdmin(), userController.updateUser);
router.patch('/:id/role', requireAdmin, userController.updateUserRole);
router.delete('/:id', requireAdmin, userController.deleteUser);

module.exports = router;
