const mysql = require('mysql2/promise');

let pool;
let connected = false;

function getDatabaseName() {
    const name = process.env.DB_NAME || 'shopdesk';
    if (!/^[A-Za-z0-9_]{1,64}$/.test(name)) {
        throw new Error('DB_NAME must contain 1-64 letters, digits, or underscores.');
    }
    return name;
}

function getConnectionOptions({ includeDatabase = true } = {}) {
    const port = Number(process.env.DB_PORT || 3306);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('DB_PORT must be an integer between 1 and 65535.');
    }
    const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 10);
    if (!Number.isInteger(connectionLimit) || connectionLimit < 1 || connectionLimit > 100) {
        throw new Error('DB_CONNECTION_LIMIT must be an integer between 1 and 100.');
    }
    return {
        host: process.env.DB_HOST || 'localhost',
        port,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        ...(includeDatabase ? { database: getDatabaseName() } : {}),
        charset: 'utf8mb4',
        supportBigNumbers: true,
        bigNumberStrings: true,
        decimalNumbers: false,
        waitForConnections: true,
        connectionLimit,
        queueLimit: 0,
        multipleStatements: false,
        enableKeepAlive: true,
        dateStrings: false
    };
}

async function initializeDatabase() {
    if (pool) return pool;
    const options = getConnectionOptions({ includeDatabase: false });
    const connection = await mysql.createConnection(options);
    const databaseName = getDatabaseName();
    try {
        try {
            await connection.query(
                `CREATE DATABASE IF NOT EXISTS \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`
            );
        } catch (error) {
            if (!['ER_DBACCESS_DENIED_ERROR', 'ER_ACCESS_DENIED_ERROR', 'ER_SPECIFIC_ACCESS_DENIED_ERROR'].includes(error.code)) {
                throw error;
            }
            const [databases] = await connection.execute(
                'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
                [databaseName]
            );
            if (!databases.length) {
                throw new Error(
                    `The configured MySQL user cannot create database "${databaseName}". ` +
                    `Create it manually with: CREATE DATABASE \`${databaseName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci; ` +
                    'Then grant the configured user access and restart the app.'
                );
            }
        }
    } catch (error) {
        throw error;
    } finally {
        await connection.end();
    }

    pool = mysql.createPool(getConnectionOptions());
    try {
        const schema = require('fs').readFileSync(require('path').join(__dirname, '..', 'database', 'schema.sql'), 'utf8');
        const statements = schema.split(/;\s*(?:\r?\n|$)/).map((statement) => statement.trim()).filter(Boolean);
        for (const statement of statements) {
            await pool.query(statement);
        }
        await pool.query('SELECT 1');
        connected = true;
    } catch (error) {
        connected = false;
        await pool.end();
        pool = undefined;
        throw error;
    }
    return pool;
}

function getPool() {
    if (!pool) throw new Error('Database pool is not initialized.');
    return pool;
}

function isDatabaseConnected() {
    return connected;
}

async function checkDatabaseConnection() {
    if (!pool || !connected) return false;
    try {
        await pool.query('SELECT 1');
        connected = true;
        return true;
    } catch (error) {
        console.error('MySQL health check failed:', error.code || 'connection error');
        connected = false;
        return false;
    }
}

async function disconnectDatabase() {
    connected = false;
    if (pool) {
        const currentPool = pool;
        pool = undefined;
        await currentPool.end();
    }
}

module.exports = {
    initializeDatabase,
    getPool,
    getDatabaseName,
    isDatabaseConnected,
    checkDatabaseConnection,
    disconnectDatabase
};
