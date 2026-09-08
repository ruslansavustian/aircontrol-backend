import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { DeviceTokenGuard } from './device-token.guard';
import { CreateMeasurementDto } from './dto/create-measurement.dto';
import { MeasurementsService } from './measurements.service';

@Controller('measurements')
@UseGuards(DeviceTokenGuard)
export class MeasurementsController {
  constructor(private readonly measurements: MeasurementsService) {}

  @Post()
  @HttpCode(202)
  create(@Body() body: CreateMeasurementDto) {
    return this.measurements.accept(body);
  }
}
