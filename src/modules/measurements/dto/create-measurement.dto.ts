import {
  Equals, IsDateString, IsHexadecimal, IsIn, IsInt, IsNumber,
  IsString, Length, Matches, Max, Min, ValidateIf,
} from 'class-validator';

export class CreateMeasurementDto {
  @Equals(1)
  schemaVersion!: 1;

  @IsString()
  @Matches(/^[A-Za-z0-9_-]{1,64}$/)
  deviceId!: string;

  @IsIn(['mock', 'pms5003'])
  source!: 'mock' | 'pms5003';

  @IsHexadecimal()
  @Length(32, 32)
  bootId!: string;

  @IsInt()
  @Min(0)
  @Max(4294967295)
  sequence!: number;

  // Null is explicit when the device clock is unavailable; omission is invalid.
  @ValidateIf((_object, value: unknown) => value !== null)
  @IsDateString({ strict: true })
  measuredAt!: string | null;

  @IsInt()
  @Min(0)
  @Max(Number.MAX_SAFE_INTEGER)
  uptimeMs!: number;

  // 0 = single snapshot, not an averaged window.
  @IsInt()
  @Min(0)
  @Max(3600)
  windowSeconds!: number;

  @IsInt()
  @Min(1)
  @Max(100000)
  sampleCount!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(65535)
  pm1_ug_m3!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(65535)
  pm25_ug_m3!: number;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  @Max(65535)
  pm10_ug_m3!: number;

  @IsString()
  @Matches(/^[A-Za-z0-9._-]{1,32}$/)
  firmwareVersion!: string;
}
