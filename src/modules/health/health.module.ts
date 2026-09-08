import { Controller, Get, Module, ServiceUnavailableException } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Controller('health')
class HealthController {
  constructor(private readonly database: DataSource) {}
  @Get()
  async getHealth() {
    try {
      await this.database.query('SELECT 1');
      return { status: 'ok', database: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}

@Module({ controllers: [HealthController] })
export class HealthModule {}
