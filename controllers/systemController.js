const { checkDatabaseConnection } = require('../config/db');

async function getHealth(req, res) {
    const connected = await checkDatabaseConnection();
    res.status(connected ? 200 : 503).json({
        success: connected,
        data: { status: connected ? 'ok' : 'unavailable', database: connected ? 'connected' : 'disconnected' }
    });
}

module.exports = { getHealth };
