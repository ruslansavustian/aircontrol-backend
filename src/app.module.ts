import { TelegramModule } from './modules/telegram/telegram.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseOptions } from './database/data-source';
import { Module } from '@nestjs/common';
import { MeasurementsModule } from './modules/measurements/measurements.module';

@Module({ imports: [TypeOrmModule.forRoot(databaseOptions), MeasurementsModule, TelegramModule] })
export class AppModule {}
