# Shopdesk E-Commerce

Shopdesk is a full-stack e-commerce application built from the existing Express API and Shopdesk dashboard. It uses MySQL 8.0 for persistent account, catalog, cart, and order data.

Checkout is a **simulated order workflow**. It reserves stock and records an order, but does not take payment or claim that payment has been processed.

## Technology

- Node.js 20+ and Express 5
- MySQL 8.0 with `mysql2` and InnoDB transactions
- Existing HTML, CSS, and vanilla JavaScript storefront and admin dashboard
- JWT authentication and bcrypt password hashing
- dotenv, Helmet, CORS, and express-rate-limit
- Node.js built-in test runner and Supertest

## Requirements

- Node.js 20 or newer, with npm
- MySQL Server 8.0
- A MySQL account permitted to create tables in the application database

## Run locally on Windows

1. Open PowerShell in the `Ecomm` project folder and install dependencies:

   ```powershell
   npm install
   ```

2. Create a database and an application user in MySQL. Start a MySQL shell (for example, `mysql -u root -p`) and run the following, replacing the password placeholder with a private password:

   ```sql
   CREATE DATABASE shopdesk CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   CREATE USER 'shopdesk_app'@'localhost' IDENTIFIED BY '<choose-a-private-password>';
   GRANT ALL PRIVILEGES ON shopdesk.* TO 'shopdesk_app'@'localhost';
   ```

   Do not put the password in source control. The server creates the tables and indexes on startup. If your MySQL account does not have permission to create the database, create it as shown above; the account still needs privileges on that database to initialize the schema.

3. Copy the sample environment file and edit it locally:

   ```powershell
   Copy-Item .env.example .env
   notepad .env
   ```

   Set at least:

   ```dotenv
   NODE_ENV=development
   PORT=3000
   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=shopdesk_app
   DB_PASSWORD=<the-private-password-from-step-2>
   DB_NAME=shopdesk
   JWT_SECRET=<a-unique-random-secret-of-at-least-32-characters>
   JWT_EXPIRES_IN=1d
   CLIENT_ORIGIN=
   PUBLIC_API_BASE_URL=/api
   ADMIN_BOOTSTRAP_TOKEN=<a-temporary-random-token-of-at-least-32-characters>
   ```

   Generate random values locally using:

   ```powershell
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

   Use separate random values for `JWT_SECRET` and `ADMIN_BOOTSTRAP_TOKEN`. Never commit `.env` or share its values.

4. Start the server:

   ```powershell
   npm start
   ```

   During development, use `npm run dev` for Node's watch mode. The server connects to MySQL, applies the repeatable `CREATE TABLE IF NOT EXISTS` schema, then listens on the configured port.

5. Open the storefront at [http://localhost:3000](http://localhost:3000). The live database health check is [http://localhost:3000/api/health](http://localhost:3000/api/health).

The application creates its database automatically only if the configured MySQL account is allowed to do so. If it cannot create the database, startup reports the exact SQL statement needed. Once the database exists, the account must still have permission to create and use its tables.

## Set up an administrator

1. Keep a temporary high-entropy `ADMIN_BOOTSTRAP_TOKEN` in `.env` and start the server.
2. Create an account in the storefront using **Create account**.
3. While signed in to that account, open `/admin/setup.html`. Enter the registered email and bootstrap token.
4. The server allows only one initial bootstrap claim and promotes the account in a MySQL transaction. The endpoint requires an exact token match and cannot be used to register an account or set a role.
5. Remove `ADMIN_BOOTSTRAP_TOKEN` from `.env` and restart the server. The bootstrap endpoint and UI are disabled when it is unset.
6. Administrators can promote other accounts using User management. Keep at least one administrator: the API prevents demoting or deleting the final administrator.

## Storefront features

- Separate static pages for shopping, authentication, customer accounts, and administration.
- Product search, category filtering, sorting, and pagination.
- MySQL-persisted carts, transactional simulated checkout, immutable order snapshots, and administrator tools.
- JWT session token remains in `sessionStorage`; protected pages redirect to sign-in, while the API independently enforces authorization.

Products are deactivated rather than physically deleted so historical order snapshots remain intact. Accounts with order history cannot be deleted.

### Page map

| Page | Purpose | API calls |
| --- | --- | --- |
| `/` or `/index.html` | Landing page and latest featured products | `GET /api/health`, `GET /api/products?limit=3&sort=newest` |
| `/products.html` | Product search, category filter, sorting, pagination | `GET /api/products`, `GET /api/products/categories` |
| `/product.html?id=...` | Product details and add to cart | `GET /api/products/:id`, `POST /api/cart` |
| `/login.html` | Authenticate and redirect to `?next=` or home | `POST /api/auth/login` |
| `/register.html` | Create customer account | `POST /api/auth/register` |
| `/cart.html` | View cart, update quantities, remove items | `GET /api/cart`, `PUT /api/cart/:productId`, `DELETE /api/cart/:productId` |
| `/checkout.html` | Review cart and place simulated order | `GET /api/cart`, `POST /api/orders` |
| `/orders.html` | Current user's order history | `GET /api/orders/my-orders` |
| `/order.html?id=...` | Order detail with purchased price/name snapshots | `GET /api/orders/:id` |
| `/profile.html` | View and update own profile | `GET /api/users/:id`, `PUT /api/users/:id` |
| `/admin/dashboard.html` | Store statistics and API/database status | `GET /api/dashboard/stats`, `GET /api/health` |
| `/admin/products.html` | Product table and delete controls | `GET /api/products`, `DELETE /api/products/:id` |
| `/admin/product-form.html?id=...` | Create or edit a product | `GET /api/products/:id`, `POST /api/products`, `PUT /api/products/:id` |
| `/admin/users.html` | Manage accounts and roles | `GET /api/users`, `PATCH /api/users/:id/role`, `DELETE /api/users/:id` |
| `/admin/orders.html` | Review orders and update status | `GET /api/orders`, `PATCH /api/orders/:id/status` |
| `/admin/setup.html` | One-time initial administrator bootstrap; signed-in customer access | `POST /api/auth/bootstrap-admin` |
| `/404.html` | Friendly not-found page | None |

All listed pages use existing API endpoints; no page-specific backend endpoint was added for this frontend refactor.
The static HTML pages are also available without the `.html` suffix (for example, `/login` and `/admin/dashboard`). Redirect query strings are preserved.

## API

All routes are under `/api`. Successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "code": "...", "message": "..." } }`. Authenticated requests use `Authorization: Bearer <JWT>`.

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/api/health` | Public, live database check |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public, rate limited |
| `GET` | `/api/auth/me` | Signed-in user |
| `POST` | `/api/auth/bootstrap-admin` | Temporary bootstrap token; disabled unless configured |
| `GET` | `/api/users` | Administrator; `page`, `limit` |
| `POST` | `/api/users` | Administrator; creates a customer, never an administrator |
| `GET` | `/api/users/:id` | User or administrator |
| `PUT` | `/api/users/:id` | User or administrator; permitted profile fields only |
| `PATCH` | `/api/users/:id/role` | Administrator |
| `DELETE` | `/api/users/:id` | Administrator |
| `GET` | `/api/products` | Public; `q`, `category`, `page`, `limit`, `sort` |
| `GET` | `/api/products/categories` | Public |
| `GET` | `/api/products/:id` | Public |
| `POST` | `/api/products` | Administrator |
| `PUT` | `/api/products/:id` | Administrator |
| `DELETE` | `/api/products/:id` | Administrator; deactivates product |
| `GET` | `/api/cart` | Signed-in user |
| `POST` | `/api/cart` | Signed-in user; `{ "productId": "<UUID>", "quantity": 1 }` |
| `PUT` | `/api/cart/:productId` | Signed-in user; `{ "quantity": 2 }` |
| `DELETE` | `/api/cart/:productId` | Signed-in user |
| `DELETE` | `/api/cart` | Signed-in user; clears cart |
| `POST` | `/api/orders` | Signed-in user; creates an order from their cart |
| `GET` | `/api/orders/my-orders` | Signed-in user |
| `GET` | `/api/orders/:id` | Order owner or administrator |
| `GET` | `/api/orders` | Administrator |
| `PATCH` | `/api/orders/:id/status` | Administrator |
| `GET` | `/api/dashboard/stats` | Administrator |

Product sorting accepts `newest`, `oldest`, `price`, or `-price`, for example:

```text
GET /api/products?page=1&limit=10&category=Audio&sort=price&q=headphones
```

Register, log in, then test a protected cart endpoint from PowerShell:

```powershell
Invoke-RestMethod -Method Post http://localhost:3000/api/auth/register `
  -ContentType 'application/json' `
  -Body '{"name":"Demo Buyer","email":"buyer@example.com","password":"Correct-Horse-42"}'
$session = Invoke-RestMethod -Method Post http://localhost:3000/api/auth/login `
  -ContentType 'application/json' `
  -Body '{"email":"buyer@example.com","password":"Correct-Horse-42"}'
$headers = @{ Authorization = "Bearer $($session.data.token)" }
Invoke-RestMethod http://localhost:3000/api/cart -Headers $headers
Invoke-RestMethod 'http://localhost:3000/api/products?page=1&limit=10&sort=newest'
```

## Tests

Run the safe default checks:

```powershell
npm test
```

The integration tests run only when explicitly enabled against a database whose name ends in `_test`. They clear rows in that dedicated test database, so **never point them at a database containing data you need**.

1. Create a separate MySQL database and grant the app user access:

   ```sql
   CREATE DATABASE shopdesk_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   GRANT ALL PRIVILEGES ON shopdesk_test.* TO 'shopdesk_app'@'localhost';
   ```

2. In PowerShell, enable integration testing for that database and run the suite:

   ```powershell
   $env:DB_NAME = 'shopdesk_test'
   $env:RUN_MYSQL_INTEGRATION_TESTS = '1'
   npm test
   Remove-Item Env:DB_NAME
   Remove-Item Env:RUN_MYSQL_INTEGRATION_TESTS
   ```

MySQL credentials continue to come from `.env`. If no dedicated database is configured, the database-dependent tests are skipped; the ordinary validation tests still run. The suite covers registration, duplicate accounts, authentication, product CRUD/search/validation, cart isolation and stock limits, checkout consistency, inventory restoration, and administrator authorization.

## Deployment preparation

The app serves its HTML/CSS/JavaScript frontend and API from a single Node.js origin; no frontend build step is required. It can be deployed to a Node.js host with a managed MySQL 8.0 database. No hosting provider, cloud database, or production environment has been provisioned or verified as part of this project change.

For a deployment you configure yourself:

1. Provision a managed MySQL 8.0 database and a least-privilege database user. Restrict network access to the hosting service.
2. Configure `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, and `DB_NAME` in the hosting dashboard. Ensure the database exists and the user can create/use the application tables.
3. Set `JWT_SECRET` to a new random value of at least 32 characters, `NODE_ENV=production`, and `ADMIN_BOOTSTRAP_TOKEN` only while initializing the first administrator.
4. Deploy the repository's `Ecomm` application folder with `npm install` and `npm start`. Use the hosting provider's assigned `PORT`.
5. Keep `PUBLIC_API_BASE_URL=/api` for a same-origin deployment. If a separate frontend origin is used, set `CLIENT_ORIGIN` to the exact allowed origin and `PUBLIC_API_BASE_URL` to the API's HTTP(S) base URL.
6. Configure the host's health check as `GET /api/health`, finish administrator bootstrap, remove the bootstrap token, and verify the deployed site and API yourself.

The server fails clearly when required configuration or database access is missing, returns no connection credentials to clients, and closes the HTTP server and MySQL pool on graceful shutdown.
