import { Module } from '@nestjs/common';
import { TelegramClient } from './telegram.client';
import { TelegramService } from './telegram.service';
@Module({ providers: [TelegramClient, TelegramService] })
export class TelegramModule {}
