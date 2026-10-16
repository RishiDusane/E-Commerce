const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { randomUUID, timingSafeEqual } = require('crypto');
const { getPool } = require('../config/db');
const { getConfig } = require('../config/env');
const { AppError } = require('../utils/errors');
const { allowFields, requiredString, validateEmail, validatePassword } = require('../utils/validation');

function issueToken(user) {
    const config = getConfig();
    return jwt.sign({ sub: String(user.id) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

function publicUser(row) {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}

async function register(req, res) {
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
    const [rows] = await getPool().execute(
        'SELECT id, name, email, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ?',
        [id]
    );
    const user = publicUser(rows[0]);
    res.status(201).json({ success: true, data: { user, token: issueToken(user) } });
}

async function login(req, res) {
    allowFields(req.body, ['email', 'password']);
    const email = validateEmail(req.body.email);
    if (typeof req.body.password !== 'string' || req.body.password.length > 128) {
        throw new AppError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
    }

    const [rows] = await getPool().execute(
        'SELECT id, name, email, password_hash AS passwordHash, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE email = ? LIMIT 1',
        [email]
    );
    const row = rows[0];
    if (!row || !await bcrypt.compare(req.body.password, row.passwordHash)) {
        throw new AppError(401, 'Email or password is incorrect.', 'INVALID_CREDENTIALS');
    }
    const user = publicUser(row);
    res.json({ success: true, data: { user, token: issueToken(user) } });
}

function me(req, res) {
    res.json({ success: true, data: { user: req.user } });
}

async function bootstrapAdmin(req, res) {
    const { adminBootstrapToken } = getConfig();
    if (!adminBootstrapToken) {
        throw new AppError(404, 'Admin bootstrap is not enabled.', 'NOT_FOUND');
    }
    allowFields(req.body, ['email', 'token']);
    const token = requiredString(req.body.token, 'Bootstrap token', { max: 512 });
    const expected = Buffer.from(adminBootstrapToken);
    const supplied = Buffer.from(token);
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
        throw new AppError(401, 'Bootstrap token is invalid.', 'INVALID_BOOTSTRAP_TOKEN');
    }

    const email = validateEmail(req.body.email);
    const connection = await getPool().getConnection();
    let user;
    try {
        await connection.beginTransaction();
        const [users] = await connection.execute(
            'SELECT id, name, email, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE email = ? FOR UPDATE',
            [email]
        );
        if (!users.length) throw new AppError(404, 'Register this account before bootstrapping it as an administrator.', 'NOT_FOUND');
        if (users[0].role === 'admin') throw new AppError(409, 'This account is already an administrator.', 'ADMIN_ALREADY_CONFIGURED');
        await connection.execute(
            'INSERT IGNORE INTO admin_bootstrap (id, user_id) VALUES (1, ?)',
            [users[0].id]
        );
        const [claims] = await connection.execute(
            'SELECT user_id AS userId FROM admin_bootstrap WHERE id = 1 FOR UPDATE'
        );
        if (claims[0].userId !== users[0].id) {
            throw new AppError(409, 'Initial administrator setup has already been completed.', 'ADMIN_ALREADY_CONFIGURED');
        }
        const [admins] = await connection.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1 FOR UPDATE");
        if (admins.length) throw new AppError(409, 'An administrator is already configured.', 'ADMIN_ALREADY_CONFIGURED');
        await connection.execute("UPDATE users SET role = 'admin' WHERE id = ?", [users[0].id]);
        user = { ...users[0], role: 'admin' };
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
    res.json({ success: true, data: { user, token: issueToken(user) } });
}

module.exports = { bootstrapAdmin, login, me, register };
