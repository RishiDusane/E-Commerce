const dotenv = require('dotenv');

dotenv.config();

function getConfig() {
    return {
        nodeEnv: process.env.NODE_ENV || 'development',
        port: Number(process.env.PORT || 3000),
        dbHost: process.env.DB_HOST || 'localhost',
        dbPort: Number(process.env.DB_PORT || 3306),
        dbUser: process.env.DB_USER || 'root',
        dbPassword: process.env.DB_PASSWORD || '',
        dbName: process.env.DB_NAME || 'shopdesk',
        dbConnectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
        jwtSecret: process.env.JWT_SECRET,
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1d',
        clientOrigins: (process.env.CLIENT_ORIGIN || '')
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean),
        publicApiBaseUrl: process.env.PUBLIC_API_BASE_URL || '/api',
        adminBootstrapToken: process.env.ADMIN_BOOTSTRAP_TOKEN
    };
}

function validateConfig(config = getConfig()) {
    if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
        throw new Error('PORT must be an integer between 1 and 65535.');
    }
    if (!Number.isInteger(config.dbPort) || config.dbPort < 1 || config.dbPort > 65535) {
        throw new Error('DB_PORT must be an integer between 1 and 65535.');
    }
    if (typeof config.dbHost !== 'string' || !config.dbHost.trim()) {
        throw new Error('DB_HOST must be a non-empty hostname or IP address.');
    }
    if (typeof config.dbUser !== 'string' || !config.dbUser.trim()) {
        throw new Error('DB_USER must be a non-empty MySQL username.');
    }
    if (!Number.isInteger(config.dbConnectionLimit) || config.dbConnectionLimit < 1 || config.dbConnectionLimit > 100) {
        throw new Error('DB_CONNECTION_LIMIT must be an integer between 1 and 100.');
    }
    if (!/^[A-Za-z0-9_]{1,64}$/.test(config.dbName)) {
        throw new Error('DB_NAME must contain 1-64 letters, digits, or underscores.');
    }
    if (typeof config.jwtSecret !== 'string' || config.jwtSecret.length < 32) {
        throw new Error('JWT_SECRET is required and must contain at least 32 characters.');
    }
    if (/^(replace-with-|change-me-|your-)/i.test(config.jwtSecret)) {
        throw new Error('Replace the JWT_SECRET example value with a cryptographically random secret.');
    }
    if (config.nodeEnv === 'production' && !config.dbPassword) {
        throw new Error('DB_PASSWORD is required in production.');
    }
    if (!/^\d+(?:s|m|h|d|w|y)$/.test(config.jwtExpiresIn)) {
        throw new Error('JWT_EXPIRES_IN must be a duration such as 30m, 1h, or 1d.');
    }
    if (config.adminBootstrapToken && config.adminBootstrapToken.length < 32) {
        throw new Error('ADMIN_BOOTSTRAP_TOKEN must contain at least 32 characters when configured.');
    }
    if (config.adminBootstrapToken && /^(replace-with-|change-me-|your-)/i.test(config.adminBootstrapToken)) {
        throw new Error('Replace the ADMIN_BOOTSTRAP_TOKEN example value with a temporary random token.');
    }
    for (const origin of config.clientOrigins) {
        let parsed;
        try {
            parsed = new URL(origin);
        } catch {
            throw new Error('CLIENT_ORIGIN must contain one or more valid origin URLs.');
        }
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
            throw new Error('CLIENT_ORIGIN entries must be HTTP or HTTPS origins without a path.');
        }
    }
    if (config.publicApiBaseUrl.startsWith('//')) {
        throw new Error('PUBLIC_API_BASE_URL must be a same-origin path or an HTTP(S) URL.');
    }
    if (config.publicApiBaseUrl.startsWith('/')) {
        if (config.publicApiBaseUrl.split('/').includes('..')) {
            throw new Error('PUBLIC_API_BASE_URL must not contain parent path segments.');
        }
    } else {
        let parsedApiBase;
        try {
            parsedApiBase = new URL(config.publicApiBaseUrl);
        } catch {
            throw new Error('PUBLIC_API_BASE_URL must be a same-origin path or an HTTP(S) URL.');
        }
        if (!['http:', 'https:'].includes(parsedApiBase.protocol) || parsedApiBase.search || parsedApiBase.hash) {
            throw new Error('PUBLIC_API_BASE_URL must be an HTTP(S) URL without a query or fragment.');
        }
    }
    return config;
}

module.exports = { getConfig, validateConfig };
