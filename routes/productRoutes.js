const express = require('express');
const { randomUUID } = require('crypto');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getPool } = require('../config/db');
const { AppError } = require('../utils/errors');
const {
    allowFields,
    parsePositiveInteger,
    requiredString,
    validateImageUrl,
    validateObjectId,
    validatePrice,
    validateStock
} = require('../utils/validation');

const router = express.Router();
const PRODUCT_FIELDS = ['name', 'description', 'price', 'category', 'imageUrl', 'stock'];
const SORTS = {
    newest: 'created_at DESC',
    oldest: 'created_at ASC',
    price: 'price ASC, created_at DESC',
    '-price': 'price DESC, created_at DESC'
};
const PRODUCT_COLUMNS = 'id, name, description, price, category, image_url AS imageUrl, stock, created_at AS createdAt, updated_at AS updatedAt';

function productInput(body, partial = false) {
    allowFields(body, PRODUCT_FIELDS);
    const values = {};
    if (!partial || Object.hasOwn(body, 'name')) values.name = requiredString(body.name, 'Name', { min: 2, max: 120 });
    if (!partial || Object.hasOwn(body, 'description')) values.description = requiredString(body.description, 'Description', { max: 3000 });
    if (!partial || Object.hasOwn(body, 'price')) values.price = validatePrice(body.price);
    if (!partial || Object.hasOwn(body, 'category')) values.category = requiredString(body.category, 'Category', { min: 2, max: 60 });
    if (!partial || Object.hasOwn(body, 'imageUrl')) values.image_url = validateImageUrl(body.imageUrl);
    if (!partial || Object.hasOwn(body, 'stock')) values.stock = validateStock(body.stock);
    if (partial && !Object.keys(values).length) {
        throw new AppError(400, 'Provide at least one product field to update.', 'VALIDATION_ERROR');
    }
    return values;
}

router.get('/categories', async (req, res) => {
    const [rows] = await getPool().execute(
        'SELECT DISTINCT category FROM products WHERE is_active = TRUE ORDER BY category'
    );
    res.json({ success: true, data: rows.map((row) => row.category) });
});

router.get('/', async (req, res) => {
    const page = parsePositiveInteger(req.query.page, 'Page', { fallback: 1, max: 100000 });
    const limit = parsePositiveInteger(req.query.limit, 'Limit', { fallback: 12, max: 50 });
    const sortName = req.query.sort || 'newest';
    if (typeof sortName !== 'string' || !Object.hasOwn(SORTS, sortName)) {
        throw new AppError(400, 'Sort must be one of newest, oldest, price, or -price.', 'VALIDATION_ERROR');
    }
    const clauses = ['is_active = TRUE'];
    const params = [];
    if (req.query.category !== undefined) {
        clauses.push('category = ?');
        params.push(requiredString(req.query.category, 'Category', { max: 60 }));
    }
    if (req.query.q !== undefined) {
        clauses.push('INSTR(LOWER(name), ?) > 0');
        const query = requiredString(req.query.q, 'Search query', { max: 100 }).toLowerCase();
        params.push(query);
    }
    const where = clauses.join(' AND ');
    const [products, [countRows]] = await Promise.all([
        getPool().execute(
            `SELECT ${PRODUCT_COLUMNS} FROM products WHERE ${where} ORDER BY ${SORTS[sortName]} LIMIT ? OFFSET ?`,
            [...params, limit, (page - 1) * limit]
        ),
        getPool().execute(`SELECT COUNT(*) AS total FROM products WHERE ${where}`, params)
    ]);
    const total = Number(countRows[0].total);
    res.json({ success: true, data: products[0], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

router.get('/:id', async (req, res) => {
    const id = validateObjectId(req.params.id, 'Product ID');
    const [products] = await getPool().execute(
        `SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ? AND is_active = TRUE LIMIT 1`,
        [id]
    );
    if (!products.length) throw new AppError(404, 'Product not found.', 'NOT_FOUND');
    res.json({ success: true, data: { product: products[0] } });
});

router.post('/', authenticate, requireAdmin, async (req, res) => {
    const product = productInput(req.body);
    const id = randomUUID();
    await getPool().execute(
        'INSERT INTO products (id, name, description, price, category, image_url, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, product.name, product.description, product.price, product.category, product.image_url, product.stock]
    );
    const [products] = await getPool().execute(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`, [id]);
    res.status(201).json({ success: true, data: { product: products[0] } });
});

router.put('/:id', authenticate, requireAdmin, async (req, res) => {
    const id = validateObjectId(req.params.id, 'Product ID');
    const updates = productInput(req.body, true);
    const entries = Object.entries(updates);
    const [result] = await getPool().execute(
        `UPDATE products SET ${entries.map(([field]) => `${field} = ?`).join(', ')} WHERE id = ? AND is_active = TRUE`,
        [...entries.map(([, value]) => value), id]
    );
    if (!result.affectedRows) {
        const [existing] = await getPool().execute('SELECT id FROM products WHERE id = ? AND is_active = TRUE', [id]);
        if (!existing.length) throw new AppError(404, 'Product not found.', 'NOT_FOUND');
    }
    const [products] = await getPool().execute(`SELECT ${PRODUCT_COLUMNS} FROM products WHERE id = ?`, [id]);
    res.json({ success: true, data: { product: products[0] } });
});

router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    const id = validateObjectId(req.params.id, 'Product ID');
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const [result] = await connection.execute('UPDATE products SET is_active = FALSE WHERE id = ? AND is_active = TRUE', [id]);
        if (!result.affectedRows) throw new AppError(404, 'Product not found.', 'NOT_FOUND');
        await connection.execute(
            'DELETE ci FROM cart_items ci JOIN carts c ON c.id = ci.cart_id WHERE ci.product_id = ?',
            [id]
        );
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    res.json({ success: true, data: { message: 'Product deleted.' } });
});

module.exports = router;
