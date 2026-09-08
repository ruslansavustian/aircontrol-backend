import { Module } from '@nestjs/common';
import { DeviceTokenGuard } from './device-token.guard';
import { MeasurementsController } from './measurements.controller';
import { MeasurementsService } from './measurements.service';

@Module({
  controllers: [MeasurementsController],
  providers: [MeasurementsService, DeviceTokenGuard],
})
export class MeasurementsModule {}
