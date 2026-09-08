import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { config } from '../../config';
import { CreateMeasurementDto } from './dto/create-measurement.dto';

@Injectable()
export class MeasurementsService {
  private readonly logger = new Logger(MeasurementsService.name);

  accept(measurement: CreateMeasurementDto) {
    if (measurement.deviceId !== config.deviceId) {
      throw new ForbiddenException('Token is not assigned to this device');
    }
    const receivedAt = new Date().toISOString();
    // This first iteration only logs; it does not persist or deduplicate data.
    this.logger.log(JSON.stringify({ event: 'measurement.received', ...measurement, receivedAt }));
    return { accepted: true, deviceId: measurement.deviceId, sequence: measurement.sequence, receivedAt };
  }
}
