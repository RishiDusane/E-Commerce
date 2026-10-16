const path = require('path');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const { isDatabaseConnected } = require('./config/db');
const { getConfig } = require('./config/env');
const { errorHandler, notFound } = require('./middleware/errorHandler');
const { AppError } = require('./utils/errors');
const authRoutes = require('./routes/authRoutes');
const cartRoutes = require('./routes/cartRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const orderRoutes = require('./routes/orderRoutes');
const productRoutes = require('./routes/productRoutes');
const userRoutes = require('./routes/userRoutes');
const { getHealth } = require('./controllers/systemController');

function createApp() {
    const app = express();
    const config = getConfig();
    const apiOrigin = config.publicApiBaseUrl.startsWith('/')
        ? null
        : new URL(config.publicApiBaseUrl).origin;
    app.disable('x-powered-by');
    app.use(helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                baseUri: ["'self'"],
                connectSrc: apiOrigin ? ["'self'", apiOrigin] : ["'self'"],
                fontSrc: ["'self'"],
                formAction: ["'self'"],
                frameAncestors: ["'none'"],
                imgSrc: ["'self'", 'data:', 'https:', 'http:'],
                objectSrc: ["'none'"],
                scriptSrc: ["'self'"],
                styleSrc: ["'self'"]
            }
        }
    }));

    if (config.clientOrigins.length) {
        app.use(cors({
            credentials: false,
            origin(origin, callback) {
                if (!origin || config.clientOrigins.includes(origin)) return callback(null, true);
                callback(new AppError(403, 'This origin is not allowed.', 'CORS_REJECTED'));
            },
            methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
    }

    app.use((req, res, next) => {
        const startedAt = process.hrtime.bigint();
        res.on('finish', () => {
            const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
            console.info(`${req.method} ${req.path} ${res.statusCode} ${durationMs.toFixed(1)}ms`);
        });
        next();
    });
    app.use(express.json({ limit: '100kb', strict: true }));
    app.get('/config.js', (req, res) => {
        res.type('application/javascript')
            .set('Cache-Control', 'no-store')
            .send(`window.SHOPDESK_CONFIG = ${JSON.stringify({
                apiBaseUrl: config.publicApiBaseUrl,
                adminBootstrapEnabled: Boolean(config.adminBootstrapToken)
            })};`);
    });
    const pageAliases = {
        '/index': '/index.html',
        '/404': '/404.html',
        '/login': '/login.html',
        '/register': '/register.html',
        '/products': '/products.html',
        '/product': '/product.html',
        '/cart': '/cart.html',
        '/checkout': '/checkout.html',
        '/orders': '/orders.html',
        '/order': '/order.html',
        '/profile': '/profile.html',
        '/admin/dashboard': '/admin/dashboard.html',
        '/admin/products': '/admin/products.html',
        '/admin/product-form': '/admin/product-form.html',
        '/admin/users': '/admin/users.html',
        '/admin/orders': '/admin/orders.html',
        '/admin/setup': '/admin/setup.html'
    };
    app.get(Object.keys(pageAliases), (req, res, next) => {
        const pagePath = pageAliases[req.path.replace(/\/+$/, '').toLowerCase()];
        if (!pagePath) return next();
        res.sendFile(path.join(__dirname, 'public', pagePath.slice(1)), (error) => {
            if (error) next(error);
        });
    });
    app.use(express.static(path.join(__dirname, 'public'), { index: 'index.html', fallthrough: true }));

    app.get('/api/health', getHealth);
    app.use('/api', (req, res, next) => {
        if (!isDatabaseConnected()) {
            return next(new AppError(503, 'The database is not available. Please try again shortly.', 'DATABASE_UNAVAILABLE'));
        }
        next();
    });
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/cart', cartRoutes);
    app.use('/api/orders', orderRoutes);
    app.use('/api/dashboard', dashboardRoutes);
    app.use('/api', notFound);
    app.use((req, res, next) => {
        if (req.path === '/api' || req.path.startsWith('/api/')) return next();
        res.status(404).sendFile(path.join(__dirname, 'public', '404.html'), (error) => {
            if (error) next(error);
        });
    });
    app.use(errorHandler);
    return app;
}

module.exports = { createApp };
