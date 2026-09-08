import {
  ForbiddenException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { And, IsNull, LessThan, LessThanOrEqual, MoreThanOrEqual, Repository } from "typeorm";
import { config } from "../../config";
import { CreateMeasurementDto } from "./dto/create-measurement.dto";
import { Measurement } from "./entities/measurement.entity";

@Injectable()
export class MeasurementsService {
  private readonly logger = new Logger(MeasurementsService.name);
  constructor(
    @InjectRepository(Measurement)
    private readonly repository: Repository<Measurement>,
  ) {}

  findForPeriod(deviceId: string, start: Date, end: Date, now: Date) {
    return this.repository.findBy({
      deviceId,
      measuredAt: And(MoreThanOrEqual(start), LessThan(end)),
      receivedAt: LessThanOrEqual(now),
    });
  }

  countWithoutTime(deviceId: string, start: Date, end: Date) {
    return this.repository.countBy({
      deviceId,
      measuredAt: IsNull(),
      receivedAt: And(MoreThanOrEqual(start), LessThan(end)),
    });
  }

  async accept(measurement: CreateMeasurementDto) {
    if (measurement.deviceId !== config.deviceId) {
      throw new ForbiddenException("Token is not assigned to this device");
    }
    try {
      const result = await this.repository
        .createQueryBuilder()
        .insert()
        .values({
          ...measurement,
          bootId: measurement.bootId.toLowerCase(),
          sequence: String(measurement.sequence),
          uptimeMs: String(measurement.uptimeMs),
          measuredAt: measurement.measuredAt
            ? new Date(measurement.measuredAt)
            : null,
        })
        .orIgnore()
        .returning(["id", "receivedAt"])
        .execute();
      const duplicate = result.raw.length === 0;
      const saved = duplicate
        ? await this.repository.findOneByOrFail({
            deviceId: measurement.deviceId,
            bootId: measurement.bootId.toLowerCase(),
            sequence: String(measurement.sequence),
          })
        : {
            id: result.raw[0].id as string,
            receivedAt: new Date(result.raw[0].received_at),
          };
      // Keep 202 for the deployed firmware; accepted now means persisted (or already stored).
      return {
        accepted: true,
        id: saved.id,
        duplicate,
        deviceId: measurement.deviceId,
        sequence: measurement.sequence,
        receivedAt: saved.receivedAt,
      };
    } catch {
      this.logger.error("Measurement persistence failed");
      throw new ServiceUnavailableException("Measurement could not be stored");
    }
  }
}
