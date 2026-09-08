import { ForbiddenException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { config } from '../../config';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { Measurement } from './entities/measurement.entity';

@Injectable()
export class MeasurementsService {
  private readonly logger = new Logger(MeasurementsService.name);
  constructor(@InjectRepository(Measurement) private readonly repository: Repository<Measurement>) {}

  async accept(measurement: CreateMeasurementDto) {
    if (measurement.deviceId !== config.deviceId) {
      throw new ForbiddenException('Token is not assigned to this device');
    }
    try {
      const result = await this.repository.createQueryBuilder().insert().values({
        ...measurement,
        bootId: measurement.bootId.toLowerCase(),
        sequence: String(measurement.sequence),
        uptimeMs: String(measurement.uptimeMs),
        measuredAt: measurement.measuredAt ? new Date(measurement.measuredAt) : null,
      }).onConflict('("device_id", "boot_id", "sequence") DO NOTHING')
        .returning(['id', 'receivedAt']).execute();
      const duplicate = result.raw.length === 0;
      const saved = duplicate
        ? await this.repository.findOneByOrFail({ deviceId: measurement.deviceId, bootId: measurement.bootId.toLowerCase(), sequence: String(measurement.sequence) })
        : { id: result.raw[0].id as string, receivedAt: new Date(result.raw[0].received_at) };
      // Log only after persistence succeeds. First accepted payload wins on duplicate.
      this.logger.log(JSON.stringify({ event: duplicate ? 'measurement.duplicate' : 'measurement.saved', id: saved.id, deviceId: measurement.deviceId, source: measurement.source, sequence: measurement.sequence, receivedAt: saved.receivedAt }));
      // Keep 202 for the deployed firmware; accepted now means persisted (or already stored).
      return { accepted: true, id: saved.id, duplicate, deviceId: measurement.deviceId, sequence: measurement.sequence, receivedAt: saved.receivedAt };
    } catch {
      this.logger.error('Measurement persistence failed');
      throw new ServiceUnavailableException('Measurement could not be stored');
    }
  }
}
