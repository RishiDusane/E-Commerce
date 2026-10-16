const jwt = require('jsonwebtoken');
const { getConfig } = require('../config/env');
const { getPool } = require('../config/db');
const { AppError } = require('../utils/errors');

async function authenticate(req, res, next) {
    const authorization = req.get('authorization') || '';
    const match = authorization.match(/^Bearer ([^\s]+)$/);
    if (!match) {
        return next(new AppError(401, 'Authentication is required.', 'UNAUTHENTICATED'));
    }

    let payload;
    try {
        payload = jwt.verify(match[1], getConfig().jwtSecret);
    } catch {
        next(new AppError(401, 'Your authentication token is invalid or expired.', 'UNAUTHENTICATED'));
        return;
    }

    if (typeof payload.sub !== 'string') {
        return next(new AppError(401, 'Your authentication token is invalid or expired.', 'UNAUTHENTICATED'));
    }
    const [users] = await getPool().execute(
        'SELECT id, name, email, role, created_at AS createdAt, updated_at AS updatedAt FROM users WHERE id = ? LIMIT 1',
        [payload.sub]
    );
    if (!users.length) {
        return next(new AppError(401, 'Your account is no longer available.', 'UNAUTHENTICATED'));
    }
    req.user = users[0];
    next();
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return next(new AppError(403, 'Administrator access is required.', 'FORBIDDEN'));
    }
    next();
}

function requireSelfOrAdmin(getTargetId = (req) => req.params.id) {
    return (req, res, next) => {
        if (req.user.role !== 'admin' && String(req.user.id) !== String(getTargetId(req))) {
            return next(new AppError(403, 'You may only access your own account.', 'FORBIDDEN'));
        }
        next();
    };
}

module.exports = { authenticate, requireAdmin, requireSelfOrAdmin };
