const express = require('express');
const { randomUUID } = require('crypto');
const { authenticate } = require('../middleware/auth');
const { getPool } = require('../config/db');
const { AppError } = require('../utils/errors');
const { allowFields, parsePositiveInteger, validateObjectId } = require('../utils/validation');

const router = express.Router();
router.use(authenticate);

async function ensureCart(executor, userId) {
    await executor.execute('INSERT IGNORE INTO carts (id, user_id) VALUES (?, ?)', [randomUUID(), userId]);
    const [carts] = await executor.execute('SELECT id FROM carts WHERE user_id = ? LIMIT 1', [userId]);
    return carts[0].id;
}

async function readCart(userId) {
    const pool = getPool();
    const cartId = await ensureCart(pool, userId);
    const [rows] = await pool.execute(
        `SELECT ci.product_id AS id, p.name, p.description, p.price, p.category,
                p.image_url AS imageUrl, p.stock, ci.quantity
         FROM cart_items ci
         JOIN products p ON p.id = ci.product_id AND p.is_active = TRUE
         WHERE ci.cart_id = ? ORDER BY ci.created_at`,
        [cartId]
    );
    const items = rows.map((row) => {
        const product = { ...row };
        const quantity = Number(product.quantity);
        delete product.quantity;
        product.price = Number(product.price);
        product.stock = Number(product.stock);
        return {
            product,
            quantity,
            subtotal: Math.round(product.price * quantity * 100) / 100
        };
    });
    const total = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
    return { id: cartId, items, total };
}

router.get('/', async (req, res) => {
    res.json({ success: true, data: { cart: await readCart(req.user.id) } });
});

router.post('/', async (req, res) => {
    allowFields(req.body, ['productId', 'quantity']);
    const productId = validateObjectId(req.body.productId, 'Product ID');
    const quantity = parsePositiveInteger(
        req.body.quantity === undefined ? '1' : String(req.body.quantity),
        'Quantity',
        { max: 10000 }
    );
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const cartId = await ensureCart(connection, req.user.id);
        await connection.execute('SELECT id FROM carts WHERE id = ? FOR UPDATE', [cartId]);
        const [products] = await connection.execute(
            'SELECT id, stock FROM products WHERE id = ? AND is_active = TRUE FOR UPDATE',
            [productId]
        );
        if (!products.length) throw new AppError(404, 'Product not found.', 'NOT_FOUND');
        const [items] = await connection.execute(
            'SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ? FOR UPDATE',
            [cartId, productId]
        );
        const updatedQuantity = quantity + (items.length ? Number(items[0].quantity) : 0);
        if (updatedQuantity > 10000) {
            throw new AppError(400, 'A cart line may contain at most 10000 items.', 'VALIDATION_ERROR');
        }
        const stock = Number(products[0].stock);
        if (updatedQuantity > stock) {
            throw new AppError(409, `Only ${stock} item(s) are currently in stock.`, 'INSUFFICIENT_STOCK');
        }
        if (!items.length) {
            const [countRows] = await connection.execute('SELECT COUNT(*) AS count FROM cart_items WHERE cart_id = ?', [cartId]);
            if (Number(countRows[0].count) >= 100) {
                throw new AppError(400, 'A cart may contain at most 100 different products.', 'CART_LIMIT_REACHED');
            }
            await connection.execute(
                'INSERT INTO cart_items (id, cart_id, product_id, quantity) VALUES (?, ?, ?, ?)',
                [randomUUID(), cartId, productId, quantity]
            );
        } else {
            await connection.execute(
                'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?',
                [updatedQuantity, cartId, productId]
            );
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    res.status(201).json({ success: true, data: { cart: await readCart(req.user.id) } });
});

router.put('/:productId', async (req, res) => {
    allowFields(req.body, ['quantity']);
    const productId = validateObjectId(req.params.productId, 'Product ID');
    const quantity = parsePositiveInteger(
        typeof req.body.quantity === 'number' ? String(req.body.quantity) : req.body.quantity,
        'Quantity',
        { max: 10000 }
    );
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const [carts] = await connection.execute('SELECT id FROM carts WHERE user_id = ? FOR UPDATE', [req.user.id]);
        if (!carts.length) throw new AppError(404, 'Cart item not found.', 'NOT_FOUND');
        const [products] = await connection.execute(
            'SELECT stock FROM products WHERE id = ? AND is_active = TRUE FOR UPDATE',
            [productId]
        );
        if (!products.length) throw new AppError(404, 'Product not found.', 'NOT_FOUND');
        const [items] = await connection.execute(
            'SELECT quantity FROM cart_items WHERE cart_id = ? AND product_id = ? FOR UPDATE',
            [carts[0].id, productId]
        );
        if (!items.length) throw new AppError(404, 'Cart item not found.', 'NOT_FOUND');
        const stock = Number(products[0].stock);
        if (stock < quantity) throw new AppError(409, `Only ${stock} item(s) are currently in stock.`, 'INSUFFICIENT_STOCK');
        await connection.execute(
            'UPDATE cart_items SET quantity = ? WHERE cart_id = ? AND product_id = ?',
            [quantity, carts[0].id, productId]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    res.json({ success: true, data: { cart: await readCart(req.user.id) } });
});

router.delete('/:productId', async (req, res) => {
    const productId = validateObjectId(req.params.productId, 'Product ID');
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const [carts] = await connection.execute('SELECT id FROM carts WHERE user_id = ? FOR UPDATE', [req.user.id]);
        if (!carts.length) throw new AppError(404, 'Cart item not found.', 'NOT_FOUND');
        const [result] = await connection.execute(
            'DELETE FROM cart_items WHERE cart_id = ? AND product_id = ?',
            [carts[0].id, productId]
        );
        if (!result.affectedRows) throw new AppError(404, 'Cart item not found.', 'NOT_FOUND');
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    res.json({ success: true, data: { cart: await readCart(req.user.id) } });
});

router.delete('/', async (req, res) => {
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const [carts] = await connection.execute('SELECT id FROM carts WHERE user_id = ? FOR UPDATE', [req.user.id]);
        if (carts.length) await connection.execute('DELETE FROM cart_items WHERE cart_id = ?', [carts[0].id]);
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    res.json({ success: true, data: { cart: await readCart(req.user.id) } });
});

module.exports = router;
