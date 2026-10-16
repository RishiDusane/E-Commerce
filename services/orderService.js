const { randomUUID } = require('crypto');
const { getPool } = require('../config/db');
const { AppError } = require('../utils/errors');

const ORDER_COLUMNS = 'o.id, o.user_id AS userId, o.status, o.total, o.created_at AS createdAt, o.updated_at AS updatedAt';

async function loadOrder(executor, orderId, withUser = false) {
    const userColumns = withUser ? ', u.name AS userName, u.email AS userEmail' : '';
    const userJoin = withUser ? ' JOIN users u ON u.id = o.user_id' : '';
    const [orders] = await executor.execute(
        `SELECT ${ORDER_COLUMNS}${userColumns}
         FROM orders o${userJoin} WHERE o.id = ? LIMIT 1`,
        [orderId]
    );
    if (!orders.length) return null;
    const order = orders[0];
    order.total = Number(order.total);
    if (withUser) {
        order.user = { id: order.userId, name: order.userName, email: order.userEmail };
        delete order.userId;
        delete order.userName;
        delete order.userEmail;
    }
    const [items] = await executor.execute(
        `SELECT id, product_id AS productId, product_name AS name, product_image_url AS imageUrl,
                quantity, unit_price AS unitPrice, subtotal
         FROM order_items WHERE order_id = ? ORDER BY created_at, id`,
        [orderId]
    );
    order.items = items.map((item) => ({
        ...item,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        subtotal: Number(item.subtotal),
        product: item.productId ? { id: item.productId } : null
    }));
    return order;
}

async function createOrder(userId) {
    const pool = getPool();
    const connection = await pool.getConnection();
    let orderId;
    try {
        await connection.beginTransaction();
        const [carts] = await connection.execute('SELECT id FROM carts WHERE user_id = ? FOR UPDATE', [userId]);
        if (!carts.length) throw new AppError(400, 'Your cart is empty.', 'EMPTY_CART');
        const cartId = carts[0].id;
        const [cartItems] = await connection.execute(
            'SELECT product_id AS productId FROM cart_items WHERE cart_id = ? ORDER BY product_id',
            [cartId]
        );
        if (!cartItems.length) throw new AppError(400, 'Your cart is empty.', 'EMPTY_CART');

        const productIds = cartItems.map((item) => item.productId);
        const placeholders = productIds.map(() => '?').join(', ');
        const [products] = await connection.execute(
            `SELECT id, name, image_url AS imageUrl, price, stock FROM products
             WHERE is_active = TRUE AND id IN (${placeholders}) ORDER BY id FOR UPDATE`,
            productIds
        );
        const productsById = new Map(products.map((product) => [product.id, product]));
        const [items] = await connection.execute(
            'SELECT product_id AS productId, quantity FROM cart_items WHERE cart_id = ? ORDER BY product_id FOR UPDATE',
            [cartId]
        );
        if (items.length !== cartItems.length) {
            throw new AppError(409, 'A product in your cart is no longer available.', 'PRODUCT_UNAVAILABLE');
        }
        let totalCents = 0;
        const purchasedItems = items.map((item) => {
            const product = productsById.get(item.productId);
            if (!product) throw new AppError(409, 'A product in your cart is no longer available.', 'PRODUCT_UNAVAILABLE');
            const quantity = Number(item.quantity);
            const priceCents = Math.round(Number(product.price) * 100);
            const stock = Number(product.stock);
            if (stock < quantity) {
                throw new AppError(409, `${product.name} does not have enough stock.`, 'INSUFFICIENT_STOCK');
            }
            totalCents += priceCents * quantity;
            return { ...item, quantity, product, priceCents };
        });
        orderId = randomUUID();
        await connection.execute(
            'INSERT INTO orders (id, user_id, status, total) VALUES (?, ?, ?, ?)',
            [orderId, userId, 'pending', (totalCents / 100).toFixed(2)]
        );
        for (const item of purchasedItems) {
            const [inventory] = await connection.execute(
                'UPDATE products SET stock = stock - ? WHERE id = ? AND is_active = TRUE AND stock >= ?',
                [item.quantity, item.product.id, item.quantity]
            );
            if (inventory.affectedRows !== 1) {
                throw new AppError(409, `${item.product.name} does not have enough stock.`, 'INSUFFICIENT_STOCK');
            }
            await connection.execute(
                `INSERT INTO order_items
                 (id, order_id, product_id, product_name, product_image_url, quantity, unit_price, subtotal)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    randomUUID(), orderId, item.product.id, item.product.name, item.product.imageUrl,
                    item.quantity, (item.priceCents / 100).toFixed(2), (item.priceCents * item.quantity / 100).toFixed(2)
                ]
            );
        }
        await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    return loadOrder(pool, orderId);
}

async function updateOrderStatus(orderId, status) {
    const pool = getPool();
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [orders] = await connection.execute('SELECT status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
        if (!orders.length) throw new AppError(404, 'Order not found.', 'NOT_FOUND');
        const currentStatus = orders[0].status;
        const allowedTransitions = {
            pending: ['processing', 'cancelled'],
            processing: ['shipped', 'cancelled'],
            shipped: ['delivered'],
            delivered: [],
            cancelled: []
        };
        if (!allowedTransitions[currentStatus].includes(status)) {
            throw new AppError(409, `An order cannot move from ${currentStatus} to ${status}.`, 'INVALID_ORDER_TRANSITION');
        }
        if (status === 'cancelled') {
            const [items] = await connection.execute(
                'SELECT product_id AS productId, quantity FROM order_items WHERE order_id = ? AND product_id IS NOT NULL ORDER BY product_id FOR UPDATE',
                [orderId]
            );
            for (const item of items) {
                await connection.execute(
                    'UPDATE products SET stock = stock + ? WHERE id = ?',
                    [Number(item.quantity), item.productId]
                );
            }
        }
        await connection.execute('UPDATE orders SET status = ? WHERE id = ?', [status, orderId]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    return loadOrder(pool, orderId);
}

module.exports = { createOrder, loadOrder, updateOrderStatus, ORDER_COLUMNS };
