const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('./dist/app.module');
const { DashboardService } = require('./dist/dashboard/dashboard.service');

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
  }
}

bootstrap();
