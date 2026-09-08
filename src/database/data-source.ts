import { ReportIntervals1788870000000 } from "./migrations/1788870000000-ReportIntervals";
import { TelegramDelivery } from "../modules/telegram/entities/telegram-delivery.entity";
import { CreateTelegramDeliveries1788861600000 } from './migrations/1788861600000-CreateTelegramDeliveries';
import 'reflect-metadata';
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import { Measurement } from '../modules/measurements/entities/measurement.entity';
import { CreateMeasurements1788858000000 } from './migrations/1788858000000-CreateMeasurements';

const port = Number(process.env.DB_PORT ?? 5432);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid DB_PORT');
if (!process.env.POSTGRES_PASSWORD) throw new Error('Set POSTGRES_PASSWORD');

export const databaseOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port,
  username: process.env.POSTGRES_USER ?? 'aircontrol',
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB ?? 'aircontrol',
  entities: [Measurement, TelegramDelivery],
  migrations: [CreateMeasurements1788858000000, CreateTelegramDeliveries1788861600000, ReportIntervals1788870000000],
  synchronize: false,
  migrationsRun: false,
  logging: false,
  extra: { max: 5, connectionTimeoutMillis: 5000, statement_timeout: 10000 },
};
export default new DataSource(databaseOptions);
