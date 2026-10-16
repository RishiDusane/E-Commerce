const { validateConfig } = require('./config/env');
const { initializeDatabase, disconnectDatabase } = require('./config/db');
const { createApp } = require('./app');

async function startServer() {
    const config = validateConfig();
    await initializeDatabase();

    const server = createApp().listen(config.port, () => {
        console.info(`Shopdesk server listening on port ${config.port} (${config.nodeEnv})`);
    });

    let shuttingDown = false;
    async function shutdown(signal) {
        if (shuttingDown) return;
        shuttingDown = true;
        console.info(`${signal} received; shutting down gracefully.`);
        server.close(async (error) => {
            try {
                await disconnectDatabase();
            } catch (disconnectError) {
                console.error('Database shutdown failed:', disconnectError.message);
                process.exitCode = 1;
            }
            if (error) {
                console.error('HTTP server shutdown failed:', error.message);
                process.exitCode = 1;
            }
        });
        setTimeout(() => {
            console.error('Graceful shutdown timed out.');
            process.exit(1);
        }, 10000).unref();
    }
    process.once('SIGINT', () => shutdown('SIGINT'));
    process.once('SIGTERM', () => shutdown('SIGTERM'));
    return server;
}

if (require.main === module) {
    startServer().catch(async (error) => {
        console.error('Shopdesk startup failed:', error.message);
        try {
            await disconnectDatabase();
        } catch (disconnectError) {
            console.error('Database cleanup failed:', disconnectError.message);
        }
        process.exitCode = 1;
    });
}

module.exports = { startServer };
