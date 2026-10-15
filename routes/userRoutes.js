const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { authenticate, requireAdmin, requireSelfOrAdmin } = require('../middleware/auth');
const { getPool } = require('../config/db');
const { AppError } = require('../utils/errors');
const {
    allowFields,
    parsePositiveInteger,
    requiredString,
    validateEmail,
    validateObjectId,
    validatePassword
} = require('../utils/validation');

const router = express.Router();

router.use(authenticate);

router.get('/', requireAdmin, async (req, res) => {
    const page = parsePositiveInteger(req.query.page, 'Page', { fallback: 1, max: 100000 });
    const limit = parsePositiveInteger(req.query.limit, 'Limit', { fallback: 20, max: 100 });
    const [users, [countRows]] = await Promise.all([
        getPool().execute(
            'SELECT id, name, email, role, created_at AS createdAt, updated_at AS updatedAt FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?',
            [limit, (page - 1) * limit]
        ),
        getPool().execute('SELECT COUNT(*) AS total FROM users')
    ]);
    const total = Number(countRows[0].total);
    res.json({ success: true, data: users[0], meta: { page, limit, total, totalPages: Math.ceil(total / limit) } });
});

router.get('/:id', requireSelfOrAdmin(), async (req, res) => {
    const id = validateObjectId(req.params.id, 'User ID');
    const [users] = await getPool().execute(
        'SELECT id, name, email, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ? LIMIT 1',
        [id]
    );
    if (!users.length) throw new AppError(404, 'User not found.', 'NOT_FOUND');
    res.json({ success: true, data: { user: users[0] } });
});

router.post('/', requireAdmin, async (req, res) => {
    allowFields(req.body, ['name', 'email', 'password']);
    const name = requiredString(req.body.name, 'Name', { min: 2, max: 80 });
    const email = validateEmail(req.body.email);
    const password = validatePassword(req.body.password);
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 12);
    await getPool().execute(
        'INSERT INTO users (id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [id, name, email, passwordHash, 'customer']
    );
    const [users] = await getPool().execute(
        'SELECT id, name, email, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ?',
        [id]
    );
    res.status(201).json({ success: true, data: { user: users[0] } });
});

router.put('/:id', requireSelfOrAdmin(), async (req, res) => {
    const id = validateObjectId(req.params.id, 'User ID');
    allowFields(req.body, ['name', 'email', 'password']);
    if (!Object.keys(req.body).length) {
        throw new AppError(400, 'Provide at least one field to update.', 'VALIDATION_ERROR');
    }

    const updates = [];
    const values = [];
    if (Object.hasOwn(req.body, 'name')) {
        updates.push('name = ?');
        values.push(requiredString(req.body.name, 'Name', { min: 2, max: 80 }));
    }
    if (Object.hasOwn(req.body, 'email')) {
        updates.push('email = ?');
        values.push(validateEmail(req.body.email));
    }
    if (Object.hasOwn(req.body, 'password')) {
        updates.push('password_hash = ?');
        values.push(await bcrypt.hash(validatePassword(req.body.password), 12));
    }
    values.push(id);
    await getPool().execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    const [users] = await getPool().execute(
        'SELECT id, name, email, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ?',
        [id]
    );
    if (!users.length) throw new AppError(404, 'User not found.', 'NOT_FOUND');
    res.json({ success: true, data: { user: users[0] } });
});

router.patch('/:id/role', requireAdmin, async (req, res) => {
    const id = validateObjectId(req.params.id, 'User ID');
    allowFields(req.body, ['role']);
    if (!['customer', 'admin'].includes(req.body.role)) {
        throw new AppError(400, 'Role must be customer or admin.', 'VALIDATION_ERROR');
    }
    const connection = await getPool().getConnection();
    let user;
    try {
        await connection.beginTransaction();
        const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin' ORDER BY id FOR UPDATE");
        if (req.user.id === id && req.body.role === 'customer' && admins.length <= 1) {
            throw new AppError(409, 'Promote another administrator before demoting your own account.', 'LAST_ADMIN');
        }
        await connection.execute('UPDATE users SET role = ? WHERE id = ?', [req.body.role, id]);
        const [users] = await connection.execute(
            'SELECT id, name, email, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ?',
            [id]
        );
        if (!users.length) throw new AppError(404, 'User not found.', 'NOT_FOUND');
        user = users[0];
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    res.json({ success: true, data: { user } });
});

router.delete('/:id', requireAdmin, async (req, res) => {
    const id = validateObjectId(req.params.id, 'User ID');
    const connection = await getPool().getConnection();
    try {
        await connection.beginTransaction();
        const [users] = await connection.execute('SELECT role FROM users WHERE id = ? FOR UPDATE', [id]);
        if (!users.length) throw new AppError(404, 'User not found.', 'NOT_FOUND');
        if (users[0].role === 'admin') {
            const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin' ORDER BY id FOR UPDATE");
            if (admins.length <= 1) throw new AppError(409, 'Promote another administrator before deleting this account.', 'LAST_ADMIN');
        }
        await connection.execute('DELETE FROM admin_bootstrap WHERE user_id = ?', [id]);
        const [orders] = await connection.execute('SELECT id FROM orders WHERE user_id = ? LIMIT 1', [id]);
        if (orders.length) {
            throw new AppError(409, 'This account has order history and cannot be deleted.', 'USER_HAS_ORDERS');
        }
        const [result] = await connection.execute('DELETE FROM users WHERE id = ?', [id]);
        if (!result.affectedRows) throw new AppError(404, 'User not found.', 'NOT_FOUND');
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    res.json({ success: true, data: { message: 'User deleted.' } });
});

module.exports = router;
