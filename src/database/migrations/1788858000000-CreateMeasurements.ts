import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeasurements1788858000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE TABLE measurements (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      schema_version smallint NOT NULL CHECK (schema_version = 1),
      device_id varchar(64) NOT NULL,
      source varchar(16) NOT NULL CHECK (source IN ('mock', 'pms5003')),
      boot_id varchar(32) NOT NULL,
      sequence bigint NOT NULL CHECK (sequence BETWEEN 0 AND 4294967295),
      measured_at timestamptz,
      received_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
      uptime_ms bigint NOT NULL CHECK (uptime_ms BETWEEN 0 AND 9007199254740991),
      window_seconds integer NOT NULL CHECK (window_seconds BETWEEN 0 AND 3600),
      sample_count integer NOT NULL CHECK (sample_count BETWEEN 1 AND 100000),
      pm1_ug_m3 double precision NOT NULL CHECK (pm1_ug_m3 BETWEEN 0 AND 65535),
      pm25_ug_m3 double precision NOT NULL CHECK (pm25_ug_m3 BETWEEN 0 AND 65535),
      pm10_ug_m3 double precision NOT NULL CHECK (pm10_ug_m3 BETWEEN 0 AND 65535),
      firmware_version varchar(32) NOT NULL
    )`);
    await queryRunner.query('CREATE UNIQUE INDEX measurements_identity ON measurements (device_id, boot_id, sequence)');
    await queryRunner.query('CREATE INDEX measurements_analytics ON measurements (device_id, source, measured_at)');
    await queryRunner.query('CREATE INDEX measurements_received ON measurements (received_at)');
  }
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE measurements');
  }
}
