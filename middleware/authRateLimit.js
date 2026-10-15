const rateLimit = require('express-rate-limit');
const { AppError } = require('../utils/errors');

const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: process.env.NODE_ENV === 'test' ? 1000 : 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler(req, res, next) {
        next(new AppError(429, 'Too many authentication attempts. Please try again later.', 'RATE_LIMITED'));
    }
});

module.exports = authRateLimit;
