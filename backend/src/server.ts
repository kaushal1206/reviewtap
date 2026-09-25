import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/db.js';

const app = createApp();

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('✅ Connected to PostgreSQL database via Prisma');

    const server = app.listen(env.PORT, () => {
      console.log(`🚀 ReviewTap Engine running on http://localhost:${env.PORT}`);
      console.log(`📡 Redirect Engine active at: http://localhost:${env.PORT}/r/:slug`);
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
