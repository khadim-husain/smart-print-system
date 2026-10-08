import { app } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';

async function bootstrap() {
  await connectDatabase();

  const server = app.listen(env.PORT, () => {
    console.info(`🚀 Smart Print Order & Job Management System is running on port ${env.PORT}`);
    console.info(`📡 Health Check: http://localhost:${env.PORT}/health`);
    console.info(`📦 Order API:   http://localhost:${env.PORT}/api/v1/orders`);
  });

  // Graceful Shutdown Handlers
  const gracefulShutdown = async (signal: string) => {
    console.info(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    server.close(async () => {
      console.info('🔒 HTTP server closed.');
      await disconnectDatabase();
      console.info('🔌 Database connection closed. Exiting process.');
      process.exit(0);
    });

    // Force exit after 10 seconds if shutdown hangs
    setTimeout(() => {
      console.error('⚠️ Forcefully terminating process after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
