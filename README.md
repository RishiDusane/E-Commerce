<div align="center">

<img src="https://capsule-render.vercel.app/api?type=waving&color=F97316&height=200&section=header&text=Shopdesk&fontSize=70&fontColor=ffffff&fontAlignY=38&desc=Full-Stack%20E-Commerce%20%E2%80%94%20Express%20%2B%20MySQL&descAlignY=58&descSize=17&descColor=ffedd5" width="100%"/>

<br/>

<img src="https://readme-typing-svg.demolab.com?font=Georgia&size=22&duration=3000&pause=1000&color=F97316&center=true&vCenter=true&width=650&height=50&lines=Shop+Smarter.+Manage+Easier.+%F0%9F%9B%92;Express+5+%7C+MySQL+8+%7C+JWT+Auth;Browse+%C2%B7+Cart+%C2%B7+Checkout+%C2%B7+Administer" alt="Typing SVG"/>

<br/><br/>

[![Node.js](https://img.shields.io/badge/Node.js_20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express_5-000000?style=for-the-badge&logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL_8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![JavaScript](https://img.shields.io/badge/Vanilla_JS-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JWT](https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white)](https://jwt.io/)
[![bcrypt](https://img.shields.io/badge/bcrypt-003A70?style=for-the-badge&logoColor=white)](https://www.npmjs.com/package/bcrypt)
[![Helmet](https://img.shields.io/badge/Helmet-2B2B2B?style=for-the-badge&logoColor=white)](https://helmetjs.github.io/)
[![Supertest](https://img.shields.io/badge/Node_Test_Runner_+_Supertest-25A162?style=for-the-badge&logoColor=white)](https://github.com/ladjs/supertest)

</div>

---

## 📌 Table of Contents

- [✨ About](#-about)
- [🏗️ Architecture](#️-architecture)
- [🔹 Core Modules](#-core-modules)
- [🎨 Frontend](#-frontend)
- [🛠️ Tech Stack](#️-tech-stack)
- [📂 Routes & Structure](#-routes--structure)
- [✨ Features](#-features)
- [🔌 API Reference](#-api-reference)
- [🧪 Testing Approach](#-testing-approach)
- [⚙️ Getting Started](#️-getting-started)
- [🛡️ Administrator Setup](#️-administrator-setup)
- [🚀 Deployment Preparation](#-deployment-preparation)
- [🎯 Learning Outcomes](#-learning-outcomes)
- [🔮 Roadmap](#-roadmap)
- [👨‍💻 Author](#-author)

---

## ✨ About

**Shopdesk** is a full-stack e-commerce application built from an Express REST API and a Shopdesk admin dashboard. Customers can browse products, manage a persistent cart, and place orders, while administrators manage the catalog, users, and order statuses. All account, catalog, cart, and order data is stored in **MySQL 8.0**.

> 🎓 This project demonstrates real-world implementation of a **layered Express REST API**, **JWT-based authentication & RBAC**, **transactional MySQL operations**, and a lightweight **vanilla JavaScript** frontend served from a single origin.

> ⚠️ **Note:** Checkout is a **simulated order workflow**. It reserves stock and records an order, but it does **not** take payment or claim that a payment has been processed.

---

## 🏗️ Architecture

The frontend and API are served from a single Node.js origin — no frontend build step required.

```
                  ┌──────────────────────────────────┐
                  │   HTML + CSS + Vanilla JS         │
                  │  Storefront  |  Admin Dashboard   │
                  └────────────────┬─────────────────┘
                                   │  HTTP / REST  (/api)
                                   ▼
                  ┌──────────────────────────────────┐
                  │        Express 5 Server           │
                  │  Helmet · CORS · Rate Limiting    │
                  │  JWT Auth · Role Authorization    │
                  └──┬─────────┬─────────┬─────────┬─┘
                     │         │         │         │
              ┌──────┘         │         │         └───────┐
              ▼                ▼         ▼                 ▼
        ┌──────────┐   ┌────────────┐ ┌──────────┐  ┌────────────┐
        │   Auth   │   │  Products  │ │   Cart   │  │   Orders   │
        │  & Users │   │  Catalog   │ │          │  │ & Dashboard│
        └──────────┘   └────────────┘ └──────────┘  └────────────┘
                                   │
                                   ▼
                  ┌──────────────────────────────────┐
                  │   MySQL 8.0  (mysql2 · InnoDB     │
                  │   transactions · auto schema)     │
                  └──────────────────────────────────┘
```

---

## 🔹 Core Modules

<table>
<tr>
<td valign="top" width="50%">

### 🔹 Auth & Users
- Registration and login (login is rate limited)
- JWT authentication with bcrypt password hashing
- One-time admin bootstrap flow
- Admin user management & role promotion
- Protection against removing the last administrator

### 🔹 Product Catalog
- Public search, category filter, sorting & pagination
- Admin create / edit / deactivate
- Products are **deactivated, not deleted**, so historical orders stay intact

</td>
<td valign="top" width="50%">

### 🔹 Cart
- MySQL-persisted cart per user
- Add, update quantity, remove, and clear
- Cart isolation between users & stock limit checks

### 🔹 Orders & Dashboard
- Transactional simulated checkout
- Immutable order snapshots (name & price at purchase time)
- Inventory restoration support
- Admin order review & status updates
- Store statistics & API/database status

</td>
</tr>
</table>

---

## 🎨 Frontend

Existing **HTML, CSS, and vanilla JavaScript** — separate static pages for shopping, authentication, customer accounts, and administration.

| Technology | Purpose |
|:-----------|:--------|
| 📄 HTML5 | Separate pages for storefront & admin |
| 🎨 CSS3 | Styling & layouts |
| ⚡ Vanilla JS | API calls, cart and session handling |
| 🗝️ `sessionStorage` | JWT session token (protected pages redirect to sign-in) |

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Version |
|:------|:-----------|:--------|
| 🟢 **Runtime** | Node.js | 20+ |
| 🚂 **Framework** | Express | 5 |
| 🗄️ **Database** | MySQL (`mysql2`, InnoDB transactions) | 8.0 |
| 🛡️ **Security** | JWT + bcrypt + Helmet + CORS + express-rate-limit | — |
| ⚙️ **Config** | dotenv | — |
| 🎨 **Frontend** | HTML, CSS, Vanilla JavaScript | — |
| 🧪 **Testing** | Node.js built-in test runner + Supertest | — |

</div>

---

## 📂 Routes & Structure

### 🖥️ Frontend Pages

| Page | Purpose | API Calls |
|:-----|:--------|:----------|
| `/` · `/index.html` | 🏠 Landing page & latest featured products | `GET /api/health`, `GET /api/products?limit=3&sort=newest` |
| `/products.html` | 🔍 Search, filter, sort, paginate | `GET /api/products`, `GET /api/products/categories` |
| `/product.html?id=...` | 📦 Product details & add to cart | `GET /api/products/:id`, `POST /api/cart` |
| `/login.html` | 🔐 Sign in (redirects to `?next=` or home) | `POST /api/auth/login` |
| `/register.html` | 📝 Create customer account | `POST /api/auth/register` |
| `/cart.html` | 🛒 View, update & remove cart items | `GET /api/cart`, `PUT/DELETE /api/cart/:productId` |
| `/checkout.html` | 💳 Review cart & place simulated order | `GET /api/cart`, `POST /api/orders` |
| `/orders.html` | 📜 Current user's order history | `GET /api/orders/my-orders` |
| `/order.html?id=...` | 🧾 Order detail with purchase snapshots | `GET /api/orders/:id` |
| `/profile.html` | 👤 View & update own profile | `GET/PUT /api/users/:id` |
| `/404.html` | 🚫 Friendly not-found page | — |

### 🔒 Admin Pages

| Page | Purpose | API Calls |
|:-----|:--------|:----------|
| `/admin/dashboard.html` | 📊 Store stats & API/DB status | `GET /api/dashboard/stats`, `GET /api/health` |
| `/admin/products.html` | 📦 Product table & delete controls | `GET /api/products`, `DELETE /api/products/:id` |
| `/admin/product-form.html?id=...` | ✏️ Create or edit a product | `POST/PUT /api/products` |
| `/admin/users.html` | 👥 Manage accounts & roles | `GET /api/users`, `PATCH /api/users/:id/role`, `DELETE /api/users/:id` |
| `/admin/orders.html` | 🧾 Review orders & update status | `GET /api/orders`, `PATCH /api/orders/:id/status` |
| `/admin/setup.html` | 🔑 One-time initial admin bootstrap | `POST /api/auth/bootstrap-admin` |

> 💡 Pages are also available without the `.html` suffix (e.g. `/login`, `/admin/dashboard`). Redirect query strings are preserved.

---

## ✨ Features

- 🔐 **JWT Authentication** — Secure login, registration & session handling with bcrypt-hashed passwords
- 🛡️ **Role-Based Access Control** — Separate Customer & Administrator permissions, enforced independently by the API
- 🔎 **Product Discovery** — Search, category filtering, sorting & pagination
- 🛒 **Persistent Cart** — MySQL-backed carts, isolated per user, with stock limits
- 🧾 **Transactional Checkout** — Reserves stock and records orders inside a MySQL transaction
- 📸 **Immutable Order Snapshots** — Orders keep the purchased name & price even if the product changes
- 📦 **Safe Product Removal** — Products are deactivated, never physically deleted
- 👥 **Admin User Management** — Role promotion, with last-administrator safeguards
- 🔑 **One-Time Admin Bootstrap** — Token-protected, disabled when unset
- 🧱 **Hardened Server** — Helmet, CORS, and rate limiting on login
- 🗄️ **Auto Schema Setup** — Repeatable `CREATE TABLE IF NOT EXISTS` on startup

---

## 🔌 API Reference

All routes live under `/api`.

- ✅ Success: `{ "success": true, "data": ... }`
- ❌ Error: `{ "success": false, "error": { "code": "...", "message": "..." } }`
- 🔑 Auth header: `Authorization: Bearer <JWT>`

| Method | Endpoint | Access |
|:------:|:---------|:-------|
| `GET` | `/api/health` | Public, live database check |
| `POST` | `/api/auth/register` | Public |
| `POST` | `/api/auth/login` | Public, rate limited |
| `GET` | `/api/auth/me` | Signed-in user |
| `POST` | `/api/auth/bootstrap-admin` | Temporary bootstrap token; disabled unless configured |
| `GET` | `/api/users` | Admin; `page`, `limit` |
| `POST` | `/api/users` | Admin; creates a customer, never an admin |
| `GET` | `/api/users/:id` | User or admin |
| `PUT` | `/api/users/:id` | User or admin; permitted profile fields only |
| `PATCH` | `/api/users/:id/role` | Admin |
| `DELETE` | `/api/users/:id` | Admin |
| `GET` | `/api/products` | Public; `q`, `category`, `page`, `limit`, `sort` |
| `GET` | `/api/products/categories` | Public |
| `GET` | `/api/products/:id` | Public |
| `POST` | `/api/products` | Admin |
| `PUT` | `/api/products/:id` | Admin |
| `DELETE` | `/api/products/:id` | Admin; deactivates product |
| `GET` | `/api/cart` | Signed-in user |
| `POST` | `/api/cart` | Signed-in user; `{ "productId": "<UUID>", "quantity": 1 }` |
| `PUT` | `/api/cart/:productId` | Signed-in user; `{ "quantity": 2 }` |
| `DELETE` | `/api/cart/:productId` | Signed-in user |
| `DELETE` | `/api/cart` | Signed-in user; clears cart |
| `POST` | `/api/orders` | Signed-in user; creates order from cart |
| `GET` | `/api/orders/my-orders` | Signed-in user |
| `GET` | `/api/orders/:id` | Order owner or admin |
| `GET` | `/api/orders` | Admin |
| `PATCH` | `/api/orders/:id/status` | Admin |
| `GET` | `/api/dashboard/stats` | Admin |

**Product sorting** accepts `newest`, `oldest`, `price`, or `-price`:

```text
GET /api/products?page=1&limit=10&category=Audio&sort=price&q=headphones
```

**Quick test from PowerShell:**

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

---

## 🧪 Testing Approach

Tests use Node's **built-in test runner** and **Supertest**. Safe validation tests run by default; database-dependent integration tests run only when explicitly enabled against a dedicated `_test` database.

**What the suite covers:**
- Registration, duplicate accounts & authentication
- Product CRUD, search & validation
- Cart isolation & stock limits
- Checkout consistency & inventory restoration
- Administrator authorization

### 📊 Test Coverage Summary

| Layer | Tool | Scope |
|:------|:-----|:------|
| Validation | Node test runner | Default, safe checks — no database needed |
| API Integration | Node test runner + Supertest | Auth, products, cart, orders, admin authorization |

### ▶️ Run the Default Checks

```powershell
npm test
```

### 🗄️ Run Integration Tests

> ⚠️ Integration tests **clear rows** in the test database. Never point them at a database containing data you need. They run only when the database name ends in `_test`.

1. Create a separate database and grant access:

   ```sql
   CREATE DATABASE shopdesk_test CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
   GRANT ALL PRIVILEGES ON shopdesk_test.* TO 'shopdesk_app'@'localhost';
   ```

2. Enable integration testing and run the suite:

   ```powershell
   $env:DB_NAME = 'shopdesk_test'
   $env:RUN_MYSQL_INTEGRATION_TESTS = '1'
   npm test
   Remove-Item Env:DB_NAME
   Remove-Item Env:RUN_MYSQL_INTEGRATION_TESTS
   ```

MySQL credentials still come from `.env`. If no dedicated test database is configured, database-dependent tests are skipped.

---

## ⚙️ Getting Started

### 📋 Prerequisites

```
✅ Node.js 20+ (with npm)     ✅ MySQL Server 8.0
✅ Git                        ✅ A MySQL account that can create tables
```

### 🖥️ Run Locally on Windows

```powershell
# 1. Clone the repository
git clone https://github.com/RishiDusane/<your-repo-name>.git

# 2. Open the Ecomm project folder and install dependencies
cd Ecomm
npm install
```

**3. Create the database and an application user** (run in a MySQL shell, e.g. `mysql -u root -p`):

```sql
CREATE DATABASE shopdesk CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE USER 'shopdesk_app'@'localhost' IDENTIFIED BY '<choose-a-private-password>';
GRANT ALL PRIVILEGES ON shopdesk.* TO 'shopdesk_app'@'localhost';
```

> The server creates tables and indexes on startup. Never commit the password to source control.

**4. Configure the environment:**

```powershell
Copy-Item .env.example .env
notepad .env
```

```dotenv
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=shopdesk_app
DB_PASSWORD=<the-private-password-from-step-3>
DB_NAME=shopdesk
JWT_SECRET=<a-unique-random-secret-of-at-least-32-characters>
JWT_EXPIRES_IN=1d
CLIENT_ORIGIN=
PUBLIC_API_BASE_URL=/api
ADMIN_BOOTSTRAP_TOKEN=<a-temporary-random-token-of-at-least-32-characters>
```

Generate random secrets locally (use a different value for `JWT_SECRET` and `ADMIN_BOOTSTRAP_TOKEN`):

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> 🔒 Never commit `.env` or share its values.

**5. Start the server:**

```powershell
npm start        # production-style start
npm run dev      # development with Node's watch mode

# ✅ Storefront  → http://localhost:3000
# ✅ Health check → http://localhost:3000/api/health
```

---

## 🛡️ Administrator Setup

1. Keep a temporary, high-entropy `ADMIN_BOOTSTRAP_TOKEN` in `.env` and start the server.
2. Create an account in the storefront using **Create account**.
3. While signed in, open `/admin/setup.html` and enter your registered email and the bootstrap token.
4. The server allows only **one** initial bootstrap claim and promotes the account inside a MySQL transaction. The endpoint requires an exact token match and cannot register accounts or set arbitrary roles.
5. **Remove** `ADMIN_BOOTSTRAP_TOKEN` from `.env` and restart. The endpoint and UI are disabled when it is unset.
6. Admins can promote other accounts via **User management**. The API prevents demoting or deleting the final administrator.

---

## 🚀 Deployment Preparation

The app serves its frontend and API from one Node.js origin and can be deployed to any Node.js host with a managed MySQL 8.0 database.

> ℹ️ No hosting provider, cloud database, or production environment has been provisioned or verified yet.

1. Provision a managed **MySQL 8.0** database and a least-privilege user; restrict network access to the host.
2. Set `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` in the hosting dashboard.
3. Set a new random `JWT_SECRET` (32+ chars) and `NODE_ENV=production`. Use `ADMIN_BOOTSTRAP_TOKEN` only while creating the first admin.
4. Deploy the `Ecomm` folder with `npm install` and `npm start`, using the host's assigned `PORT`.
5. Keep `PUBLIC_API_BASE_URL=/api` for same-origin deployments. For a separate frontend, set `CLIENT_ORIGIN` to the exact allowed origin and `PUBLIC_API_BASE_URL` to the API's base URL.
6. Configure the host health check as `GET /api/health`, finish admin bootstrap, remove the bootstrap token, and verify the site yourself.

The server fails clearly when configuration or database access is missing, never returns connection credentials to clients, and closes the HTTP server and MySQL pool on graceful shutdown.

---

## 🎯 Learning Outcomes

- ✅ Built a **layered REST API** with Express 5 and MySQL
- ✅ Secured endpoints with **JWT, bcrypt & role-based authorization**
- ✅ Used **InnoDB transactions** for consistent checkout, stock reservation & admin bootstrap
- ✅ Designed **immutable order snapshots** and soft-deactivation of products
- ✅ Hardened the server with **Helmet, CORS & rate limiting**
- ✅ Built a multi-page **vanilla JavaScript** storefront and admin dashboard
- ✅ Wrote **integration tests** with the Node test runner and Supertest against an isolated test database
- ✅ Prepared a configuration-driven app for **production deployment**

---

## 🔮 Roadmap

| Status | Feature | Details |
|:------:|:--------|:--------|
| 🔵 Planned | **Real Payment Gateway** | Replace simulated checkout with Stripe / Razorpay |
| 🔵 Planned | **Docker Containerization** | Dockerize the app and MySQL with Docker Compose |
| 🔵 Planned | **Cloud Deployment** | Managed Node.js host + managed MySQL |
| 🟡 In Design | **Email Notifications** | Order confirmations via SMTP |
| 🔵 Planned | **Product Images & Reviews** | Image uploads and customer ratings |
| 🔵 Planned | **CI Pipeline** | Run tests automatically on every push |

---

## 👨‍💻 Author

<div align="center">

<img src="https://avatars.githubusercontent.com/RishiDusane" width="100" style="border-radius:50%"/>

### Rishi Dattatray Dusane
**Software Engineer**

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/RishiDusane)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0A66C2?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/rishidusane)

<br/>

---

⭐ **Enjoyed Shopdesk? Give it a star — it really helps!** 🛒

</div>

<img src="https://capsule-render.vercel.app/api?type=waving&color=F97316&height=120&section=footer" width="100%"/>
