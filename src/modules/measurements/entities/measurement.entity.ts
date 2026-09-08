import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('measurements')
@Index('measurements_identity', ['deviceId', 'bootId', 'sequence'], { unique: true })
@Index('measurements_analytics', ['deviceId', 'source', 'measuredAt'])
@Index('measurements_received', ['receivedAt'])
export class Measurement {
  @PrimaryGeneratedColumn('uuid') id!: string;
  @Column({ name: 'schema_version', type: 'smallint' }) schemaVersion!: number;
  @Column({ name: 'device_id', type: 'varchar', length: 64 }) deviceId!: string;
  @Column({ type: 'varchar', length: 16 }) source!: string;
  @Column({ name: 'boot_id', type: 'varchar', length: 32 }) bootId!: string;
  @Column({ type: 'bigint' }) sequence!: string;
  @Column({ name: 'measured_at', type: 'timestamptz', nullable: true }) measuredAt!: Date | null;
  @Column({ name: 'received_at', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' }) receivedAt!: Date;
  @Column({ name: 'uptime_ms', type: 'bigint' }) uptimeMs!: string;
  @Column({ name: 'window_seconds', type: 'integer' }) windowSeconds!: number;
  @Column({ name: 'sample_count', type: 'integer' }) sampleCount!: number;
  @Column({ name: 'pm1_ug_m3', type: 'double precision' }) pm1_ug_m3!: number;
  @Column({ name: 'pm25_ug_m3', type: 'double precision' }) pm25_ug_m3!: number;
  @Column({ name: 'pm10_ug_m3', type: 'double precision' }) pm10_ug_m3!: number;
  @Column({ name: 'firmware_version', type: 'varchar', length: 32 }) firmwareVersion!: string;
}
