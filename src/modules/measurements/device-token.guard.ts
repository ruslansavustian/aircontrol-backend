import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { config } from '../../config';

@Injectable()
export class DeviceTokenGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const provided = Buffer.from(request.headers.authorization ?? '');
    const expected = Buffer.from(`Bearer ${config.deviceToken}`);
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid device token');
    }
    return true;
  }
}
