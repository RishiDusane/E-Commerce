const { AppError } = require('./errors');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function requireObject(value, name = 'Request body') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new AppError(400, `${name} must be a JSON object.`, 'VALIDATION_ERROR');
    }
    return value;
}

function allowFields(body, allowedFields) {
    requireObject(body);
    const unknown = Object.keys(body).filter((field) => !allowedFields.includes(field));
    if (unknown.length) {
        throw new AppError(400, `Unexpected field: ${unknown[0]}.`, 'VALIDATION_ERROR');
    }
}

function requiredString(value, field, { min = 1, max = 200 } = {}) {
    if (typeof value !== 'string') {
        throw new AppError(400, `${field} must be a string.`, 'VALIDATION_ERROR');
    }
    const normalized = value.trim();
    if (normalized.length < min || normalized.length > max) {
        throw new AppError(400, `${field} must be between ${min} and ${max} characters.`, 'VALIDATION_ERROR');
    }
    return normalized;
}

function validateEmail(value) {
    const email = requiredString(value, 'Email', { max: 254 }).toLowerCase();
    if (!EMAIL_PATTERN.test(email)) {
        throw new AppError(400, 'Enter a valid email address.', 'VALIDATION_ERROR');
    }
    return email;
}

function validatePassword(value) {
    if (typeof value !== 'string' || value.length < 8 || value.length > 128) {
        throw new AppError(400, 'Password must be between 8 and 128 characters.', 'VALIDATION_ERROR');
    }
    return value;
}

function validateObjectId(value, field = 'ID') {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
        throw new AppError(400, `${field} is invalid.`, 'VALIDATION_ERROR');
    }
    return value;
}

function parsePositiveInteger(value, field, { fallback, max = Number.MAX_SAFE_INTEGER } = {}) {
    if (value === undefined && fallback !== undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
        throw new AppError(400, `${field} must be a positive integer.`, 'VALIDATION_ERROR');
    }
    const parsed = Number(value);
    if (!Number.isSafeInteger(parsed) || parsed > max) {
        throw new AppError(400, `${field} must not exceed ${max}.`, 'VALIDATION_ERROR');
    }
    return parsed;
}

function validatePrice(value) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0.01 || value > 1000000 ||
        Math.abs(Math.round(value * 100) - value * 100) > Number.EPSILON * Math.max(1, value * 100) * 4) {
        throw new AppError(400, 'Price must be a number between 0.01 and 1000000 with at most two decimal places.', 'VALIDATION_ERROR');
    }
    return value;
}

function validateStock(value) {
    if (!Number.isSafeInteger(value) || value < 0 || value > 10000000) {
        throw new AppError(400, 'Stock must be a whole number between 0 and 10000000.', 'VALIDATION_ERROR');
    }
    return value;
}

function validateImageUrl(value) {
    if (value === undefined || value === '') return '';
    const imageUrl = requiredString(value, 'Image URL', { max: 2048 });
    let parsed;
    try {
        parsed = new URL(imageUrl);
    } catch {
        throw new AppError(400, 'Image URL must be a valid HTTP or HTTPS URL.', 'VALIDATION_ERROR');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new AppError(400, 'Image URL must use HTTP or HTTPS.', 'VALIDATION_ERROR');
    }
    return imageUrl;
}

module.exports = {
    allowFields,
    parsePositiveInteger,
    requiredString,
    requireObject,
    validateEmail,
    validateImageUrl,
    validateObjectId,
    validatePassword,
    validatePrice,
    validateStock
};
