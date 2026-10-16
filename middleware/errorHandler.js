const { AppError } = require('../utils/errors');

function notFound(req, res, next) {
    next(new AppError(404, `Route ${req.method} ${req.originalUrl} was not found.`, 'NOT_FOUND'));
}

function errorHandler(error, req, res, next) {
    if (res.headersSent) return next(error);

    let statusCode = error.statusCode || 500;
    let code = error.code || 'INTERNAL_SERVER_ERROR';
    let message = error.message;
    let details;

    if (error.type === 'entity.parse.failed') {
        statusCode = 400;
        code = 'INVALID_JSON';
        message = 'Request body contains invalid JSON.';
    } else if (error.name === 'ValidationError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Request data is invalid.';
        details = Object.values(error.errors).map((item) => item.message);
    } else if (error.name === 'CastError') {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = `Invalid ${error.path}.`;
    } else if (error.code === 11000 || error.code === 'ER_DUP_ENTRY') {
        statusCode = 409;
        code = 'DUPLICATE_RESOURCE';
        message = 'A record with those details already exists.';
    } else if (['ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2'].includes(error.code)) {
        statusCode = 409;
        code = 'RESOURCE_CONFLICT';
        message = 'This operation conflicts with related records.';
    } else if (['ER_CHECK_CONSTRAINT_VIOLATED', 'ER_DATA_TOO_LONG'].includes(error.code)) {
        statusCode = 400;
        code = 'VALIDATION_ERROR';
        message = 'Request data is invalid.';
    }

    if (statusCode >= 500) {
        console.error(`${req.method} ${req.path} failed`, error);
        message = 'An unexpected server error occurred.';
        details = undefined;
    }

    const payload = { success: false, error: { code, message } };
    if (details) payload.error.details = details;
    res.status(statusCode).json(payload);
}

module.exports = { errorHandler, notFound };
