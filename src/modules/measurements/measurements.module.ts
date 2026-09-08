import { TypeOrmModule } from '@nestjs/typeorm';
import { Measurement } from './entities/measurement.entity';
import { Module } from '@nestjs/common';
import { DeviceTokenGuard } from './device-token.guard';
import { MeasurementsController } from './measurements.controller';
import { MeasurementsService } from './measurements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Measurement])],
  exports: [MeasurementsService],
  controllers: [MeasurementsController],
  providers: [MeasurementsService, DeviceTokenGuard],
})
export class MeasurementsModule {}
