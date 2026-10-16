const { getPool } = require('../config/db');
const { createOrder, loadOrder, updateOrderStatus } = require('../services/orderService');
const { AppError } = require('../utils/errors');
const { allowFields, parsePositiveInteger, requiredString, validateObjectId } = require('../utils/validation');

async function placeOrder(req, res) {
    const order = await createOrder(req.user.id);
    res.status(201).json({ success: true, data: { order }, message: 'Order placed. Payment has not been processed.' });
}

async function listOrders(req, res, adminOnly) {
    const page = parsePositiveInteger(req.query.page, 'Page', { fallback: 1, max: 100000 });
    const limit = parsePositiveInteger(req.query.limit, 'Limit', { fallback: 20, max: 100 });
    const where = adminOnly ? '' : ' WHERE user_id = ?';
    const params = adminOnly ? [] : [req.user.id];
    const [orders, [countRows]] = await Promise.all([
        getPool().execute(
            `SELECT id, user_id AS userId, status, total, created_at AS createdAt, updated_at AS updatedAt
             FROM orders${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        ),
        getPool().execute(`SELECT COUNT(*) AS total FROM orders${where}`, params)
    ]);
    const total = Number(countRows[0].total);
    const records = await Promise.all(orders[0].map((order) => loadOrder(getPool(), order.id, adminOnly)));
    res.json({ success: true, data: records, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
}

async function listMyOrders(req, res) {
    await listOrders(req, res, false);
}

async function listAllOrders(req, res) {
    await listOrders(req, res, true);
}

async function getOrder(req, res) {
    const id = validateObjectId(req.params.id, 'Order ID');
    const order = await loadOrder(getPool(), id, req.user.role === 'admin');
    if (!order || (req.user.role !== 'admin' && order.userId !== req.user.id)) {
        throw new AppError(404, 'Order not found.', 'NOT_FOUND');
    }
    res.json({ success: true, data: { order } });
}

async function updateStatus(req, res) {
    allowFields(req.body, ['status']);
    const id = validateObjectId(req.params.id, 'Order ID');
    const status = requiredString(req.body.status, 'Status', { max: 20 });
    if (!['processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
        throw new AppError(400, 'Status must be processing, shipped, delivered, or cancelled.', 'VALIDATION_ERROR');
    }
    const order = await updateOrderStatus(id, status);
    res.json({ success: true, data: { order } });
}

module.exports = { getOrder, listAllOrders, listMyOrders, placeOrder, updateStatus };
