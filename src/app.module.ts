import { Module } from '@nestjs/common';
import { MeasurementsModule } from './modules/measurements/measurements.module';
import { HealthModule } from './modules/health/health.module';

@Module({ imports: [MeasurementsModule, HealthModule] })
export class AppModule {}
