const { hashPassword } = require('../utils/helpers');
const prisma = require('../lib/prisma');

const isSchemaMissingError = (error) => {
  if (!error) {
    return false;
  }

  if (error.code === 'P2021' || error.code === 'P2022') {
    return true;
  }

  return error.code === 'P2010'
    && error.meta
    && String(error.meta.code) === '1932';
};

// Initialize database with default super admin
const initializeDatabase = async () => {
  try {
    console.log('Initializing database...');

    const existingSuperAdmin = await prisma.user.findFirst({
      where: { role: 'SUPER_ADMIN' },
    });

    if (!existingSuperAdmin) {
      console.log('Creating default Super Admin account...');

      const defaultEmail = process.env.SUPER_ADMIN_EMAIL || 'admin@gmail.com';
      const defaultPassword = process.env.SUPER_ADMIN_PASSWORD || '123456';

      const hashedPassword = await hashPassword(defaultPassword);

      await prisma.user.create({
        data: {
          username: defaultEmail,
          email: defaultEmail,
          password: hashedPassword,
          role: 'SUPER_ADMIN',
          firstName: 'Super',
          lastName: 'Admin',
          isArchived: false,
          isVerified: true,
        },
      });

      console.log('Super Admin created successfully.');
      console.log(`Email: ${defaultEmail}`);
      console.log(`Password: ${defaultPassword}`);
      console.log('Please change the default password after first login.');
    } else {
      console.log('Super Admin account already exists.');
    }

    console.log('Database initialization completed successfully.');
  } catch (error) {
    if (isSchemaMissingError(error)) {
      error.message = `${error.message}\nDatabase schema is missing or corrupted for ${process.env.DATABASE_URL}. Run \`npm run db:push\` against a healthy local database.`;
    }

    console.error('Database initialization failed:', error);
    throw error;
  }
};

// Graceful shutdown
const disconnectDatabase = async () => {
  try {
    await prisma.$disconnect();
    console.log('Database connection closed successfully.');
  } catch (error) {
    console.error('Error closing database connection:', error);
  }
};

// Health check
const checkDatabaseHealth = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

module.exports = {
  prisma,
  initializeDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
};
