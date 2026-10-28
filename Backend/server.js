const http = require('http');
const prisma = require('./src/lib/prisma');
const { createApp } = require('./src/app');
const { initializeDatabase } = require('./src/config/database');

const app = createApp();
const PORT = process.env.PORT || 5000;
const DEFAULT_SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'admin@gmail.com';
const DEFAULT_SUPER_ADMIN_PASSWORD = process.env.SUPER_ADMIN_PASSWORD || '123456';

const isBackendAlreadyRunning = () => new Promise((resolve) => {
  const request = http.get({
    hostname: '127.0.0.1',
    port: PORT,
    path: '/health',
    timeout: 1500,
  }, (response) => {
    let body = '';
    response.setEncoding('utf8');
    response.on('data', (chunk) => { body += chunk; });
    response.on('end', () => {
      resolve(
        response.statusCode === 200
        && body.includes('iTECHS Learning Platform API is running!'),
      );
    });
  });

  request.on('timeout', () => request.destroy());
  request.on('error', () => resolve(false));
});

const registerShutdownHandlers = () => {
  const gracefulShutdown = async (signal) => {
    console.log(`\nReceived ${signal}. Graceful shutdown...`);
    await prisma.$disconnect();
    process.exit(0);
  };

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
};

async function startServer() {
  try {
    if (await isBackendAlreadyRunning()) {
      console.log(`iTECHS backend is already running on port ${PORT}.`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      return null;
    }

    await prisma.$connect();
    console.log('Database connected successfully');
    await initializeDatabase();

    const server = app.listen(PORT, () => {
      console.log('\n========================================');
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
      console.log('========================================');
      console.log('\nDefault Super Admin Account:');
      console.log(`  Email: ${DEFAULT_SUPER_ADMIN_EMAIL}`);
      console.log(`  Password: ${DEFAULT_SUPER_ADMIN_PASSWORD}`);
      console.log('========================================\n');
    });

    server.on('error', async (error) => {
      if (error.code === 'EADDRINUSE') {
        await prisma.$disconnect();
        console.error(`\nPort ${PORT} is being used by another application.`);
        console.error(`Choose a different PORT in .env, then run npm start again.\n`);
        process.exit(1);
      }

      console.error('Server error:', error);
      process.exit(1);
    });

    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

registerShutdownHandlers();

if (require.main === module) {
  startServer();
}

module.exports = {
  app,
  startServer,
};
