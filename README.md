# Shopdesk E-commerce API

A lightweight Express API learning project with a responsive browser dashboard for trying user, product, and cart routes.

> **Demo mode:** Routes return placeholder text. They do not create users or products, persist data, or maintain cart contents.

## Tech stack

- **Runtime:** Node.js
- **Backend:** Express 5, using CommonJS modules
- **Frontend:** HTML5, CSS3, and vanilla JavaScript
- **HTTP requests:** Browser Fetch API

## Getting started

Requires Node.js and npm.

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000) to use the Shopdesk dashboard. Set the `PORT` environment variable to use a different port.

The dashboard sends requests to the Express API and displays each response. You can also call the API directly using a browser, `curl`, or an API client.

## API endpoints

| Method | Endpoint | Example response |
| --- | --- | --- |
| `GET` | `/users` | `Fetching all users` |
| `POST` | `/users` | `Adding a new user` |
| `GET` | `/users/:id` | `Fetching user with ID: 42` |
| `GET` | `/products` | `Fetching all products` |
| `POST` | `/products` | `Adding a new product` |
| `GET` | `/products/:id` | `Fetching product with ID: 42` |
| `GET` | `/cart/:userId` | `Fetching cart for user with ID: 42` |
| `POST` | `/cart/:userId` | `Adding product to cart for user with ID: 42` |

For example:

```bash
curl http://localhost:3000/users/42
curl -X POST http://localhost:3000/cart/42
```

## Project structure

```text
Ecomm/
|-- public/
|   |-- app.js
|   |-- index.html
|   `-- styles.css
|-- routes/
|   |-- cartRoutes.js
|   |-- productRoutes.js
|   `-- userRoutes.js
|-- server.js
|-- package.json
`-- package-lock.json
```

The frontend is served as static files by Express. Each route module exports an Express router, mounted under `/users`, `/products`, or `/cart` in `server.js`.
