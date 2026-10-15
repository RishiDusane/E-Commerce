const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getPool } = require('../config/db');

const router = express.Router();

router.get('/stats', authenticate, requireAdmin, async (req, res) => {
    const [rows] = await getPool().execute(
        `SELECT
            (SELECT COUNT(*) FROM products WHERE is_active = TRUE) AS products,
            (SELECT COUNT(*) FROM users) AS users,
            (SELECT COUNT(*) FROM orders) AS orders,
            (SELECT COALESCE(SUM(total), 0) FROM orders WHERE status <> 'cancelled') AS orderValue`
    );
    res.json({
        success: true,
        data: {
            products: Number(rows[0].products),
            users: Number(rows[0].users),
            orders: Number(rows[0].orders),
            orderValue: Number(rows[0].orderValue)
        }
    });
});

module.exports = router;
