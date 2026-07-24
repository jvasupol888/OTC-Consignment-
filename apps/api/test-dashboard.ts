import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module.js';
import { DashboardService } from './src/dashboard/dashboard.service.js';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const dashboardService = app.get(DashboardService);
    console.log('Testing getAdminStats()...');
    const stats = await dashboardService.getAdminStats();
    console.log('Result:', stats);
    await app.close();
  } catch (error) {
    console.error('Error occurred:', error);
    process.exit(1);
  }
}

bootstrap();
