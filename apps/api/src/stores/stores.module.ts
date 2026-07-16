import { Module } from '@nestjs/common';
import { StoresService } from './stores.service.js';
import { StoresController } from './stores.controller.js';

@Module({
  providers: [StoresService],
  controllers: [StoresController],
  exports: [StoresService],
})
export class StoresModule {}
