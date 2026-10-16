process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-only-jwt-secret-for-local-api-tests-32';
process.env.ADMIN_BOOTSTRAP_TOKEN = 'test-only-admin-bootstrap-token-for-tests';

const { after, before, beforeEach, test } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { getConfig, validateConfig } = require('../config/env');
const { initializeDatabase, getPool, disconnectDatabase } = require('../config/db');
const { createApp } = require('../app');
const { validateEmail, validateObjectId, validatePrice } = require('../utils/validation');
const { getSafeNext } = require('../public/js/safe-redirect.mjs');

const config = getConfig();
const integrationRequested = process.env.RUN_MYSQL_INTEGRATION_TESTS === '1';
const integrationEnabled = integrationRequested && /_test$/i.test(config.dbName);
let app;

before(async () => {
    if (integrationRequested && !integrationEnabled) {
        throw new Error('MySQL integration tests require DB_NAME to end with "_test".');
    }
    if (integrationEnabled) await initializeDatabase();
    app = createApp();
});

beforeEach(async () => {
    if (!integrationEnabled) return;
    const pool = getPool();
    await pool.execute('DELETE FROM admin_bootstrap');
    await pool.execute('DELETE FROM orders');
    await pool.execute('DELETE FROM users');
    await pool.execute('DELETE FROM products');
});

after(async () => {
    if (integrationEnabled) await disconnectDatabase();
});

function bearer(token) {
    return { Authorization: `Bearer ${token}` };
}

async function register(email = 'buyer@example.com') {
    const response = await request(app).post('/api/auth/register').send({
        name: 'Test Buyer',
        email,
        password: 'Correct-Horse-42'
    });
    return { response, token: response.body.data?.token, user: response.body.data?.user };
}

async function createAdmin(email = 'admin@example.com') {
    await register(email);
    const response = await request(app).post('/api/auth/bootstrap-admin').send({
        email,
        token: process.env.ADMIN_BOOTSTRAP_TOKEN
    });
    assert.equal(response.status, 200);
    return { token: response.body.data.token, user: response.body.data.user };
}

async function createProduct(token, overrides = {}) {
    return request(app)
        .post('/api/products')
        .set(bearer(token))
        .send({
            name: 'Studio Headphones',
            description: 'Comfortable over-ear headphones for everyday listening.',
            price: 89.99,
            category: 'Audio',
            imageUrl: '',
            stock: 10,
            ...overrides
        });
}

test('validates email, UUIDs, and monetary precision', () => {
    assert.equal(validateEmail(' Person@Example.com '), 'person@example.com');
    assert.throws(() => validateEmail('invalid'));
    assert.match(validateObjectId('42db293f-d9f8-4c8d-99c4-d5b496788de3'), /42db293f/);
    assert.throws(() => validateObjectId('not-a-uuid'));
    assert.equal(validatePrice(12.34), 12.34);
    assert.throws(() => validatePrice(12.345));
});

test('validates login return destinations and role fallbacks', () => {
    assert.equal(getSafeNext('?next=%2Fcart.html'), '/cart.html');
    assert.equal(getSafeNext('?next=%2Forder.html%3Fid%3Dabc'), '/order.html?id=abc');
    assert.equal(getSafeNext('?next=%2Fadmin%2Fproducts.html%3Fsort%3Dnewest'), '/admin/products.html?sort=newest');
    assert.equal(getSafeNext('?next=%252Fcart.html'), '/index.html');
    for (const unsafe of [
        '//evil.com',
        'https://evil.com',
        'javascript:alert(1)',
        '/login',
        '/login.html',
        '/register.html',
        '/%2flogin.html',
        '/%2f%2fevil.com',
        '/\\\\evil.com',
        '/folder/../login.html?from=checkout'
    ]) {
        assert.equal(getSafeNext(`?next=${encodeURIComponent(unsafe)}`), '/index.html', unsafe);
    }
    assert.equal(getSafeNext('', { role: 'admin' }), '/admin/dashboard.html');
    assert.equal(getSafeNext(''), '/index.html');
});

test('rejects example secrets and production configuration without a database password', () => {
    const validConfig = { ...config, jwtSecret: 's'.repeat(48), adminBootstrapToken: undefined };
    assert.equal(validateConfig(validConfig), validConfig);
    assert.throws(() => validateConfig({ ...validConfig, jwtSecret: 'replace-with-a-random-secret-at-least-32-characters-long' }));
    assert.throws(() => validateConfig({ ...validConfig, nodeEnv: 'production', dbPassword: '' }));
});

test('serves the Shopdesk frontend and deployment-configured API base', async () => {
    const page = await request(app).get('/');
    const configResponse = await request(app).get('/config.js');
    assert.equal(page.status, 200);
    assert.match(page.text, /Home — Shopdesk/);
    assert.match(page.text, /\/js\/pages\/home.js/);
    assert.match(page.headers['content-security-policy'], /img-src[^;]*https:[^;]*http:/);
    assert.equal(configResponse.status, 200);
    assert.match(configResponse.text, /"apiBaseUrl":"\/api"/);
});

test('serves every standalone page as HTML and returns a friendly HTML 404 for unknown paths', async () => {
    const pages = [
        '/', '/index.html', '/products.html', '/product.html?id=example',
        '/login.html', '/register.html', '/cart.html', '/checkout.html',
        '/orders.html', '/order.html?id=example', '/profile.html',
        '/admin/dashboard.html', '/admin/products.html', '/admin/product-form.html?id=example',
        '/admin/users.html', '/admin/orders.html', '/admin/setup.html', '/404.html'
    ];
    for (const pagePath of pages) {
        const response = await request(app).get(pagePath);
        assert.equal(response.status, 200, `${pagePath} should return HTTP 200`);
        assert.match(response.headers['content-type'], /text\/html/);
        assert.match(response.text, /<!doctype html>/i);
    }
    for (const alias of [
        '/index', '/404', '/login?next=%2Fcart.html', '/register', '/products', '/product?id=example',
        '/cart', '/checkout', '/orders', '/order?id=example', '/profile',
        '/admin/dashboard', '/admin/products', '/admin/product-form?id=example', '/admin/users',
        '/admin/orders', '/admin/setup'
    ]) {
        const response = await request(app).get(alias);
        assert.equal(response.status, 200, `${alias} should resolve to its HTML page`);
        assert.match(response.headers['content-type'], /text\/html/);
    }
    const stylesheet = await request(app).get('/css/styles.css');
    const moduleScript = await request(app).get('/js/api.js');
    assert.equal(stylesheet.status, 200);
    assert.match(stylesheet.headers['content-type'], /text\/css/);
    assert.equal(moduleScript.status, 200);
    assert.match(moduleScript.headers['content-type'], /javascript/);
    const missing = await request(app).get('/not-a-real-page');
    assert.equal(missing.status, 404);
    assert.match(missing.headers['content-type'], /text\/html/);
    assert.match(missing.text, /Page not found/);
});

test('returns an unavailable health status before MySQL is initialized', { skip: integrationEnabled }, async () => {
    const response = await request(app).get('/api/health');
    assert.equal(response.status, 503);
    assert.deepEqual(response.body.data, { status: 'unavailable', database: 'disconnected' });
});

test('returns a JSON 404 for unknown API routes', { skip: !integrationEnabled }, async () => {
    const response = await request(app).get('/api/unknown-route');
    assert.equal(response.status, 404);
    assert.equal(response.body.success, false);
    assert.equal(response.body.error.code, 'NOT_FOUND');
});

const integration = (name, fn) => test(name, { skip: !integrationEnabled }, fn);

integration('reports health, serves the Shopdesk frontend, and returns API configuration', async () => {
    const health = await request(app).get('/api/health');
    const page = await request(app).get('/');
    const configResponse = await request(app).get('/config.js');
    assert.equal(health.status, 200);
    assert.deepEqual(health.body.data, { status: 'ok', database: 'connected' });
    assert.equal(page.status, 200);
    assert.match(page.text, /Home — Shopdesk/);
    assert.match(page.text, /\/js\/pages\/home.js/);
    assert.match(configResponse.text, /"apiBaseUrl":"\/api"/);
});

integration('registers and authenticates users without exposing password hashes', async () => {
    const { response, user } = await register();
    const login = await request(app).post('/api/auth/login').send({
        email: 'buyer@example.com',
        password: 'Correct-Horse-42'
    });
    const wrongPassword = await request(app).post('/api/auth/login').send({
        email: 'buyer@example.com',
        password: 'wrong-password'
    });
    const duplicate = await register();
    const profile = await request(app).get('/api/auth/me').set(bearer(login.body.data.token));
    const unauthorized = await request(app).get('/api/auth/me');
    const [stored] = await getPool().execute('SELECT password_hash AS passwordHash FROM users WHERE email = ?', ['buyer@example.com']);
    assert.equal(response.status, 201);
    assert.equal(user.role, 'customer');
    assert.equal(Object.hasOwn(user, 'passwordHash'), false);
    assert.ok(stored[0].passwordHash.startsWith('$2'));
    assert.equal(login.status, 200);
    assert.equal(wrongPassword.status, 401);
    assert.equal(duplicate.response.status, 409);
    assert.equal(profile.body.data.user.email, 'buyer@example.com');
    assert.equal(unauthorized.status, 401);
});

integration('restricts product administration and validates product CRUD/search', async () => {
    const buyer = await register();
    const forbidden = await createProduct(buyer.token);
    const admin = await createAdmin();
    const created = await createProduct(admin.token);
    const invalid = await createProduct(admin.token, { price: -1 });
    const listing = await request(app).get('/api/products?q=studio&category=Audio&sort=price');
    const categories = await request(app).get('/api/products/categories');
    const updated = await request(app).put(`/api/products/${created.body.data.product.id}`)
        .set(bearer(admin.token)).send({ price: 79.99 });
    const missing = await request(app).get('/api/products/42db293f-d9f8-4c8d-99c4-d5b496788de3');
    assert.equal(forbidden.status, 403);
    assert.equal(created.status, 201);
    assert.equal(invalid.status, 400);
    assert.equal(listing.body.meta.total, 1);
    assert.equal(listing.body.data[0].name, 'Studio Headphones');
    assert.deepEqual(categories.body.data, ['Audio']);
    assert.equal(updated.body.data.product.price, '79.99');
    assert.equal(missing.status, 404);
});

integration('protects user records, safely creates accounts, and updates roles', async () => {
    const admin = await createAdmin();
    const buyer = await register('buyer@example.com');
    const other = await register('other@example.com');
    const ownProfile = await request(app).get(`/api/users/${buyer.user.id}`).set(bearer(buyer.token));
    const otherProfile = await request(app).get(`/api/users/${other.user.id}`).set(bearer(buyer.token));
    const list = await request(app).get('/api/users').set(bearer(admin.token));
    const roleEscalation = await request(app).post('/api/users').set(bearer(admin.token)).send({
        name: 'Managed Customer', email: 'managed@example.com', password: 'Correct-Horse-42', role: 'admin'
    });
    const created = await request(app).post('/api/users').set(bearer(admin.token)).send({
        name: 'Managed Customer', email: 'managed@example.com', password: 'Correct-Horse-42'
    });
    const promoted = await request(app).patch(`/api/users/${created.body.data?.user?.id}/role`)
        .set(bearer(admin.token)).send({ role: 'admin' });
    const demoted = await request(app).patch(`/api/users/${created.body.data?.user?.id}/role`)
        .set(bearer(admin.token)).send({ role: 'customer' });
    const unchangedUpdate = await request(app).put(`/api/users/${buyer.user.id}`)
        .set(bearer(buyer.token)).send({ name: buyer.user.name });
    const deleted = await request(app).delete(`/api/users/${created.body.data?.user?.id}`).set(bearer(admin.token));
    assert.equal(ownProfile.status, 200);
    assert.equal(otherProfile.status, 403);
    assert.equal(list.status, 200);
    assert.equal(list.body.data.some((user) => Object.hasOwn(user, 'passwordHash')), false);
    assert.equal(roleEscalation.status, 400);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.user.role, 'customer');
    assert.equal(promoted.body.data.user.role, 'admin');
    assert.equal(demoted.body.data.user.role, 'customer');
    assert.equal(unchangedUpdate.status, 200);
    assert.equal(deleted.status, 200);
});

integration('isolates carts, validates stock, and checks out atomically', async () => {
    const admin = await createAdmin();
    const buyer = await register();
    const otherBuyer = await register('other@example.com');
    const product = await createProduct(admin.token, { stock: 3, price: 10 });
    const productId = product.body.data.product.id;
    const add = await request(app).post('/api/cart').set(bearer(buyer.token)).send({ productId, quantity: 2 });
    const update = await request(app).put(`/api/cart/${productId}`).set(bearer(buyer.token)).send({ quantity: 3 });
    const otherCart = await request(app).get('/api/cart').set(bearer(otherBuyer.token));
    const tooMany = await request(app).post('/api/cart').set(bearer(buyer.token)).send({ productId, quantity: 2 });
    const order = await request(app).post('/api/orders').set(bearer(buyer.token)).send({});
    const emptyCart = await request(app).get('/api/cart').set(bearer(buyer.token));
    const productAfterOrder = await request(app).get(`/api/products/${productId}`);
    const ownOrders = await request(app).get('/api/orders/my-orders').set(bearer(buyer.token));
    const otherAccess = await request(app).get(`/api/orders/${order.body.data?.order?.id}`).set(bearer(otherBuyer.token));
    assert.equal(add.status, 201);
    assert.equal(add.body.data.cart.items[0].quantity, 2);
    assert.equal(update.body.data.cart.items[0].quantity, 3);
    assert.deepEqual(otherCart.body.data.cart.items, []);
    assert.equal(tooMany.status, 409);
    assert.equal(order.status, 201);
    assert.equal(order.body.data.order.total, 30);
    assert.equal(order.body.data.order.items[0].name, 'Studio Headphones');
    assert.equal(emptyCart.body.data.cart.items.length, 0);
    assert.equal(Number(productAfterOrder.body.data.product.stock), 0);
    assert.equal(ownOrders.body.data.length, 1);
    assert.equal(otherAccess.status, 404);
});

integration('rejects checkout that exceeds stock without changing the cart or inventory', async () => {
    const admin = await createAdmin();
    const buyer = await register();
    const product = await createProduct(admin.token, { stock: 1, price: 5 });
    const productId = product.body.data.product.id;
    await request(app).post('/api/cart').set(bearer(buyer.token)).send({ productId, quantity: 1 });
    await getPool().execute('UPDATE products SET stock = 0 WHERE id = ?', [productId]);
    const checkout = await request(app).post('/api/orders').set(bearer(buyer.token)).send({});
    const cart = await request(app).get('/api/cart').set(bearer(buyer.token));
    const [orders] = await getPool().execute('SELECT COUNT(*) AS count FROM orders');
    assert.equal(checkout.status, 409);
    assert.equal(cart.body.data.cart.items.length, 1);
    assert.equal(Number(orders[0].count), 0);
});

integration('allows only administrators to transition orders and restores cancelled stock once', async () => {
    const admin = await createAdmin();
    const buyer = await register();
    const product = await createProduct(admin.token, { stock: 4 });
    const productId = product.body.data.product.id;
    await request(app).post('/api/cart').set(bearer(buyer.token)).send({ productId, quantity: 2 });
    const order = await request(app).post('/api/orders').set(bearer(buyer.token)).send({});
    const forbidden = await request(app).patch(`/api/orders/${order.body.data.order.id}/status`)
        .set(bearer(buyer.token)).send({ status: 'cancelled' });
    const cancelled = await request(app).patch(`/api/orders/${order.body.data.order.id}/status`)
        .set(bearer(admin.token)).send({ status: 'cancelled' });
    const invalidTransition = await request(app).patch(`/api/orders/${order.body.data.order.id}/status`)
        .set(bearer(admin.token)).send({ status: 'shipped' });
    const productAfterCancel = await request(app).get(`/api/products/${productId}`);
    assert.equal(forbidden.status, 403);
    assert.equal(cancelled.body.data.order.status, 'cancelled');
    assert.equal(invalidTransition.status, 409);
    assert.equal(Number(productAfterCancel.body.data.product.stock), 4);
});
