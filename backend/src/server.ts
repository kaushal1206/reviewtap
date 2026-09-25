import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';

const app = createApp();

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database via Prisma');

    const host = '0.0.0.0';
    const server = app.listen(env.PORT, host, () => {
      console.log(`🚀 ReviewTap Engine running on http://${host}:${env.PORT}`);
      console.log(`📡 Redirect Engine active at: http://${host}:${env.PORT}/r/:slug`);
    });

    const shutdown = async () => {
      console.log('Gracefully stopping server...');
      server.close(async () => {
        await prisma.$disconnect();
        console.log('PostgreSQL disconnected. Process terminated.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap();
