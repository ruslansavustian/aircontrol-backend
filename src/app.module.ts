import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './database/data-source';
import { Module } from '@nestjs/common';
import { MeasurementsModule } from './modules/measurements/measurements.module';
import { HealthModule } from './modules/health/health.module';

@Module({ imports: [TypeOrmModule.forRoot(databaseOptions), MeasurementsModule, HealthModule] })
export class AppModule {}
